// src/db.rs
use rusqlite::{params, Connection};
use std::time::Duration;

pub fn open_db(path: &std::path::PathBuf) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;

    // Set PRAGMAs using execute_batch (ignores any returned rows, e.g. journal_mode)
    conn.execute_batch(
        r#"
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;
        PRAGMA foreign_keys=ON;
        "#,
    )?;

    // Use the dedicated API for busy timeout
    conn.busy_timeout(Duration::from_millis(5000))?;

    // Verify WAL actually stuck (read-only DBs or some VFS can bounce this)
    let mode: String = conn.query_row("PRAGMA journal_mode", [], |r| r.get(0))?;
    if !mode.eq_ignore_ascii_case("wal") {
        eprintln!("Note: journal_mode stayed at {mode}; WAL may be unsupported for this DB.");
    }

    Ok(conn)
}

// Helper: check if a column exists on a table (safe across versions)
// Note: table identifier is injected into the PRAGMA; only used with static literals here.
fn column_exists(conn: &Connection, table: &str, column: &str) -> rusqlite::Result<bool> {
    let table_escaped = table.replace('\'', "''");
    let sql = format!(
        "SELECT 1 FROM pragma_table_info('{table}') WHERE name = ?1 LIMIT 1",
        table = table_escaped
    );
    let mut stmt = conn.prepare(&sql)?;
    stmt.exists(params![column])
}

pub fn ensure_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Keep this for safety when ensure_schema is called with an external Connection
    conn.execute("PRAGMA foreign_keys = ON", [])?;

    // Use a SAVEPOINT so this works even if we're already inside a transaction.
    conn.execute_batch("SAVEPOINT ensure_schema")?;

    // Do work; on error, roll back to the savepoint.
    let result: rusqlite::Result<()> = (|| {
        // --- base tables ---
        conn.execute(
            r#"
            CREATE TABLE IF NOT EXISTS orders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              client_name TEXT NOT NULL,
              article_name TEXT NOT NULL DEFAULT '',
              phone TEXT NOT NULL,
              city TEXT NOT NULL,
              address TEXT NOT NULL,
              delivery_company TEXT NOT NULL,
              delivery_date TEXT NOT NULL,
              description TEXT,
              done INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
              -- may be added later via migration below
              delivery_company_id INTEGER
                -- (can't add FK constraint on ALTER, enforced via code + indexes)
            )
            "#,
            [],
        )?;
        conn.execute(
            r#"
            CREATE TABLE IF NOT EXISTS opened_orders (
              order_id INTEGER PRIMARY KEY,
              position INTEGER NOT NULL,
              FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
            "#,
            [],
        )?;
        conn.execute(
            r#"
            CREATE TABLE IF NOT EXISTS theme (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            )
            "#,
            [],
        )?;
        conn.execute(
            r#"
            CREATE TABLE IF NOT EXISTS delivery_companies (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE COLLATE NOCASE,
              active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            )
            "#,
            [],
        )?;
        conn.execute(
            r#"
            CREATE TABLE IF NOT EXISTS settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            )
            "#,
            [],
        )?;

        // --- migrations guarded by column existence checks ---
        if !column_exists(conn, "orders", "delivery_company_id")? {
            conn.execute(r#"ALTER TABLE orders ADD COLUMN delivery_company_id INTEGER"#, [])?;
        }
        if !column_exists(conn, "orders", "article_name")? {
            conn.execute(
                r#"ALTER TABLE orders ADD COLUMN article_name TEXT NOT NULL DEFAULT ''"#,
                [],
            )?;
        }
        if !column_exists(conn, "orders", "done")? {
            conn.execute(
                r#"ALTER TABLE orders ADD COLUMN done INTEGER NOT NULL DEFAULT 0"#,
                [],
            )?;
        }

        // --- backfill & sync ---
        conn.execute(
            r#"
            INSERT OR IGNORE INTO delivery_companies(name)
            SELECT DISTINCT TRIM(delivery_company)
            FROM orders
            WHERE TRIM(delivery_company) <> ''
            "#,
            [],
        )?;
        conn.execute(
            r#"
            UPDATE orders
            SET delivery_company_id = (
              SELECT id FROM delivery_companies
              WHERE name = orders.delivery_company COLLATE NOCASE
            )
            WHERE (delivery_company_id IS NULL OR delivery_company_id = 0)
              AND TRIM(delivery_company) <> ''
            "#,
            [],
        )?;

        // --- indexes ---
        conn.execute(
            r#"CREATE INDEX IF NOT EXISTS idx_delivery_companies_active_name ON delivery_companies(active, name)"#,
            [],
        )?;
        conn.execute(
            r#"CREATE INDEX IF NOT EXISTS idx_orders_delivery_company_id ON orders(delivery_company_id)"#,
            [],
        )?;
        conn.execute(
            r#"CREATE INDEX IF NOT EXISTS idx_orders_article_name ON orders(article_name)"#,
            [],
        )?;
        conn.execute(
            r#"CREATE INDEX IF NOT EXISTS idx_orders_done_created_at ON orders(done, created_at DESC)"#,
            [],
        )?;

        // --- triggers ---
        conn.execute(
            r#"
            CREATE TRIGGER IF NOT EXISTS tr_orders_sync_company_name
            AFTER UPDATE OF name ON delivery_companies
            BEGIN
              UPDATE orders
              SET delivery_company = NEW.name
              WHERE delivery_company_id = NEW.id;
            END;
            "#,
            [],
        )?;
        conn.execute(
            r#"
            CREATE TRIGGER IF NOT EXISTS tr_orders_set_company_text
            AFTER UPDATE OF delivery_company_id ON orders
            WHEN NEW.delivery_company_id IS NOT NULL
            BEGIN
              UPDATE orders
              SET delivery_company = (
                SELECT name FROM delivery_companies WHERE id = NEW.delivery_company_id
              )
              WHERE id = NEW.id;
            END;
            "#,
            [],
        )?;

        Ok(())
    })();

    match result {
        Ok(()) => {
            conn.execute_batch("RELEASE SAVEPOINT ensure_schema")?;
            Ok(())
        }
        Err(e) => {
            // Best-effort rollback; ignore rollback errors to not mask the original error
            let _ = conn.execute_batch("ROLLBACK TO SAVEPOINT ensure_schema");
            let _ = conn.execute_batch("RELEASE SAVEPOINT ensure_schema");
            Err(e)
        }
    }
}


// Create (if needed) and fetch a delivery company id + canonicalized name
pub fn get_or_create_delivery_company(
    conn: &Connection,
    name: &str,
) -> Result<(i64, String), rusqlite::Error> {
    let trimmed = name.trim();

    // Preserve previous behavior: empty/whitespace input results in QueryReturnedNoRows
    if trimmed.is_empty() {
        return Err(rusqlite::Error::QueryReturnedNoRows);
    }

    conn.execute(
        r#"INSERT OR IGNORE INTO delivery_companies(name) VALUES (TRIM(?1))"#,
        params![trimmed],
    )?;

    let mut stmt = conn.prepare(
        r#"SELECT id, name FROM delivery_companies WHERE name = ?1 COLLATE NOCASE"#,
    )?;
    stmt.query_row([trimmed], |row| Ok((row.get(0)?, row.get(1)?)))
}
