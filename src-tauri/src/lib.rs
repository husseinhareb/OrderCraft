// /src/lib.rs
use std::fs;
use std::path::PathBuf;

use rusqlite::{params, Connection};
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use tauri::Manager;

// ---------- Types sent to/returned from UI ----------

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NewOrderInput {
    pub client_name: String,
    pub article_name: String,
    pub phone: String,
    pub city: String,
    pub address: String,
    pub delivery_company: String,
    pub delivery_date: String, // yyyy-mm-dd
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOrderInput {
    pub client_name: String,
    pub article_name: String,
    pub phone: String,
    pub city: String,
    pub address: String,
    pub delivery_company: String,
    pub delivery_date: String, // yyyy-mm-dd
    pub description: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct OrderListItem {
    id: i64,
    article_name: String,
    done: bool,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct OrderWithId {
    id: i64,
    client_name: String,
    article_name: String,
    phone: String,
    city: String,
    address: String,
    delivery_company: String,
    delivery_date: String,
    description: Option<String>,
    done: bool,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct OpenedOrderItem {
    order_id: i64,
    article_name: String,
    position: i64,
}

#[derive(Clone)]
struct AppState {
    db_path: PathBuf,
}

// ---------- Helpers ----------

fn ensure_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute("PRAGMA foreign_keys = ON", [])?;

    // --- existing tables (unchanged) ---
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
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
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

    // --- NEW: delivery_companies ---
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

    // keep orders.delivery_company text synced when a name changes
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

    // Helpful index for joins/filters
    conn.execute(
        r#"CREATE INDEX IF NOT EXISTS idx_orders_delivery_company_id ON orders(delivery_company_id)"#,
        [],
    )?;

    // --- existing migrations you already had ---
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

    conn.execute(
        r#"CREATE INDEX IF NOT EXISTS idx_orders_article_name ON orders(article_name)"#,
        [],
    )?;

    Ok(())
}


// Escape LIKE wildcards (_ % \) for use with ESCAPE '\'
fn escape_like(input: &str) -> String {
    input
        .replace('\\', r#"\\"#)
        .replace('%', r#"\%"#)
        .replace('_', r#"\_"#)
}

fn get_or_create_delivery_company(
    conn: &Connection,
    name: &str,
) -> Result<(i64, String), rusqlite::Error> {
    let trimmed = name.trim();
    // ensure row exists (name is UNIQUE NOCASE)
    conn.execute(
        r#"INSERT OR IGNORE INTO delivery_companies(name) VALUES (TRIM(?1))"#,
        params![trimmed],
    )?;

    // fetch canonical row (id + stored-cased name)
    let mut stmt = conn.prepare(
        r#"SELECT id, name FROM delivery_companies WHERE name = ?1 COLLATE NOCASE"#,
    )?;
    let (id, stored_name): (i64, String) =
        stmt.query_row([trimmed], |row| Ok((row.get(0)?, row.get(1)?)))?;
    Ok((id, stored_name))
}
// ---------- Commands ----------

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_order(state: tauri::State<AppState>, order: NewOrderInput) -> Result<i64, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;
    conn.execute(
        r#"
        INSERT INTO orders
          (client_name, article_name, phone, city, address, delivery_company, delivery_date, description)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        "#,
        params![
            order.client_name,
            order.article_name,
            order.phone,
            order.city,
            order.address,
            order.delivery_company,
            order.delivery_date,
            order.description
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_order(state: tauri::State<AppState>, id: i64) -> Result<OrderWithId, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, client_name, article_name, phone, city, address,
                   delivery_company, delivery_date, description, done
            FROM orders
            WHERE id = ?1
            "#,
        )
        .map_err(|e| e.to_string())?;

    let order = stmt
        .query_row([id], |row| {
            Ok(OrderWithId {
                id: row.get(0)?,
                client_name: row.get(1)?,
                article_name: row.get(2)?,
                phone: row.get(3)?,
                city: row.get(4)?,
                address: row.get(5)?,
                delivery_company: row.get(6)?,
                delivery_date: row.get(7)?,
                description: row.get(8)?,
                done: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(order)
}

#[tauri::command]
fn update_order(
    state: tauri::State<AppState>,
    id: i64,
    order: UpdateOrderInput,
) -> Result<(), String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;
    conn.execute(
        r#"
        UPDATE orders SET
          client_name = ?1,
          article_name = ?2,
          phone = ?3,
          city = ?4,
          address = ?5,
          delivery_company = ?6,
          delivery_date = ?7,
          description = ?8
        WHERE id = ?9
        "#,
        params![
            order.client_name,
            order.article_name,
            order.phone,
            order.city,
            order.address,
            order.delivery_company,
            order.delivery_date,
            order.description,
            id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_order_done(state: tauri::State<AppState>, id: i64, done: bool) -> Result<(), String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;
    conn.execute(
        r#"UPDATE orders SET done = ?1 WHERE id = ?2"#,
        params![done, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_order(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;
    conn.execute(r#"DELETE FROM orders WHERE id = ?1"#, params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_orders(state: tauri::State<AppState>) -> Result<Vec<OrderListItem>, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, article_name, done
            FROM orders
            ORDER BY created_at DESC, id DESC
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(OrderListItem {
                id: row.get(0)?,
                article_name: row.get(1)?,
                done: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

// ---------- Opened orders stack commands ----------

#[tauri::command]
fn open_order(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let mut conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM opened_orders WHERE order_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.execute("UPDATE opened_orders SET position = position + 1", [])
        .map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO opened_orders (order_id, position) VALUES (?1, 1)",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_opened_orders(state: tauri::State<AppState>) -> Result<Vec<OpenedOrderItem>, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            r#"
            SELECT oo.order_id, o.article_name, oo.position
            FROM opened_orders oo
            JOIN orders o ON o.id = oo.order_id
            ORDER BY oo.position ASC
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(OpenedOrderItem {
                order_id: row.get(0)?,
                article_name: row.get(1)?,
                position: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
fn remove_opened_order(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let mut conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM opened_orders WHERE order_id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    // Collect ids in a scoped block so stmt & iterator drop before commit
    let list: Vec<i64> = {
        let mut s = tx
            .prepare("SELECT order_id FROM opened_orders ORDER BY position ASC")
            .map_err(|e| e.to_string())?;
        let ids = s
            .query_map([], |row| row.get::<_, i64>(0))
            .map_err(|e| e.to_string())?;

        let mut tmp = Vec::new();
        for r in ids {
            tmp.push(r.map_err(|e| e.to_string())?);
        }
        tmp
    };

    for (i, oid) in list.iter().enumerate() {
        tx.execute(
            "UPDATE opened_orders SET position = ?1 WHERE order_id = ?2",
            params![(i as i64) + 1, oid],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

// --- new commands ---

#[tauri::command]
fn search_article_names(
    state: tauri::State<AppState>,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<String>, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    // contains search: %query% (case-insensitive in SQLite for ASCII)
    let pat = format!("%{}%", escape_like(&query));
    let lim = limit.unwrap_or(10).max(1);

    // Order by frequency, then most recent first
    let mut stmt = conn
        .prepare(
            r#"
            SELECT o.article_name
            FROM orders o
            WHERE o.article_name LIKE ?1 ESCAPE '\'
            GROUP BY o.article_name
            ORDER BY COUNT(*) DESC, MAX(o.created_at) DESC
            LIMIT ?2
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![pat, lim], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
fn get_latest_description_for_article(
    state: tauri::State<AppState>,
    name: String,
) -> Result<Option<String>, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            r#"
            SELECT description
            FROM orders
            WHERE article_name = ?1
              AND description IS NOT NULL
              AND TRIM(description) <> ''
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            "#,
        )
        .map_err(|e| e.to_string())?;

    let desc: Option<String> = stmt
        .query_row(params![name], |row| row.get::<_, String>(0))
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(desc)
}

// ---------- Run ----------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("orders.db");

            let conn = Connection::open(&db_path)?;
            ensure_schema(&conn)?;

            app.manage(AppState { db_path });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            save_order,
            get_order,
            update_order,
            set_order_done,
            delete_order,
            list_orders,
            open_order,
            get_opened_orders,
            remove_opened_order,
            search_article_names,
            get_latest_description_for_article
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
