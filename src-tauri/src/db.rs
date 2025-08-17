use rusqlite::{params, Connection};
use rusqlite::OptionalExtension;

pub fn open_db(path: &std::path::PathBuf) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    // Optional performance pragmas; safe defaults for a desktop app
    conn.execute("PRAGMA journal_mode=WAL", [])?;
    conn.execute("PRAGMA synchronous=NORMAL", [])?;
    conn.execute("PRAGMA busy_timeout=5000", [])?;
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    Ok(conn)
}

pub fn ensure_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute("PRAGMA foreign_keys = ON", [])?;

    // --- existing tables ---
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
    // --- delivery_companies ---
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
        r#"CREATE INDEX IF NOT EXISTS idx_delivery_companies_active_name ON delivery_companies(active, name)"#,
        [],
    )?;

    // Keep orders.delivery_company text in sync when a name changes
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

    // MIGRATION: add FK column (if missing)
    if let Err(e) = conn.execute(
        r#"ALTER TABLE orders ADD COLUMN delivery_company_id INTEGER"#,
        [],
    ) {
        let msg = e.to_string().to_lowercase();
        if !msg.contains("duplicate column") {
            return Err(e);
        }
    }

    // Backfill companies from existing orders, then set the id
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

    // Helpful indexes
    conn.execute(
        r#"CREATE INDEX IF NOT EXISTS idx_orders_delivery_company_id ON orders(delivery_company_id)"#,
        [],
    )?;
    conn.execute(
        r#"CREATE INDEX IF NOT EXISTS idx_orders_article_name ON orders(article_name)"#,
        [],
    )?;

    // --- settings (key/value) ---
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

    // Existing migrations (no-ops if already applied)
    if let Err(e) = conn.execute(
        r#"ALTER TABLE orders ADD COLUMN article_name TEXT NOT NULL DEFAULT ''"#,
        [],
    ) {
        let msg = e.to_string().to_lowercase();
        if !msg.contains("duplicate column") { return Err(e); }
    }
    if let Err(e) = conn.execute(
        r#"ALTER TABLE orders ADD COLUMN done INTEGER NOT NULL DEFAULT 0"#,
        [],
    ) {
        let msg = e.to_string().to_lowercase();
        if !msg.contains("duplicate column") { return Err(e); }
    }

    Ok(())
}

// Create (if needed) and fetch a delivery company id + canonicalized name
pub fn get_or_create_delivery_company(
    conn: &Connection,
    name: &str,
) -> Result<(i64, String), rusqlite::Error> {
    let trimmed = name.trim();
    if !trimmed.is_empty() {
        conn.execute(
            r#"INSERT OR IGNORE INTO delivery_companies(name) VALUES (TRIM(?1))"#,
            params![trimmed],
        )?;
    }
    let mut stmt = conn.prepare(
        r#"SELECT id, name FROM delivery_companies WHERE name = ?1 COLLATE NOCASE"#,
    )?;
    let (id, stored_name): (i64, String) =
        stmt.query_row([trimmed], |row| Ok((row.get(0)?, row.get(1)?)))?;
    Ok((id, stored_name))
}
