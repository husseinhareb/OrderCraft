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

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct DeliveryCompany {
    id: i64,
    name: String,
    active: bool,
}

#[derive(Clone)]
struct AppState {
    db_path: PathBuf,
}
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct CustomThemeDTO {
    // "light" or "dark" — the base your custom colors override
    base: String,
    // token -> color (e.g. "bg": "#ffffff", "overlay": "rgba(0,0,0,0.4)")
    colors: HashMap<String, String>,
}
// ---------- Helpers ----------

fn ensure_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
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

// Escape LIKE wildcards (_ % \) for use with ESCAPE '\'
fn escape_like(input: &str) -> String {
    input
        .replace('\\', r#"\\"#)
        .replace('%', r#"\%"#)
        .replace('_', r#"\_"#)
}

// Create (if needed) and fetch a delivery company id + canonicalized name
fn get_or_create_delivery_company(
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

// ---------- Commands ----------

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// --- Orders ---

#[tauri::command]
fn save_order(state: tauri::State<AppState>, order: NewOrderInput) -> Result<i64, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let (company_id, company_name) =
        get_or_create_delivery_company(&conn, &order.delivery_company).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO orders
          (client_name, article_name, phone, city, address,
           delivery_company, delivery_company_id, delivery_date, description)
        VALUES (?1, ?2, ?3, ?4, ?5,
                ?6, ?7, ?8, ?9)
        "#,
        params![
            order.client_name,
            order.article_name,
            order.phone,
            order.city,
            order.address,
            company_name,      // normalized display name
            company_id,        // FK
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

    let (company_id, company_name) =
        get_or_create_delivery_company(&conn, &order.delivery_company).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        UPDATE orders SET
          client_name = ?1,
          article_name = ?2,
          phone = ?3,
          city = ?4,
          address = ?5,
          delivery_company = ?6,
          delivery_company_id = ?7,
          delivery_date = ?8,
          description = ?9
        WHERE id = ?10
        "#,
        params![
            order.client_name,
            order.article_name,
            order.phone,
            order.city,
            order.address,
            company_name,      // normalized display name
            company_id,        // FK
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

// --- Search helpers ---

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

// --- Delivery companies (used by Settings.tsx) ---

#[tauri::command]
fn list_delivery_companies(state: tauri::State<AppState>) -> Result<Vec<DeliveryCompany>, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, name, active
            FROM delivery_companies
            ORDER BY active DESC, name ASC
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(DeliveryCompany {
                id: row.get(0)?,
                name: row.get(1)?,
                active: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn add_delivery_company(state: tauri::State<AppState>, name: String) -> Result<i64, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    conn.execute(
        r#"INSERT OR IGNORE INTO delivery_companies(name) VALUES (TRIM(?1))"#,
        params![name],
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(r#"SELECT id FROM delivery_companies WHERE name = ?1 COLLATE NOCASE"#)
        .map_err(|e| e.to_string())?;
    let id: i64 = stmt.query_row([name], |row| row.get(0)).map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
fn set_delivery_company_active(
    state: tauri::State<AppState>,
    id: i64,
    active: bool,
) -> Result<(), String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;
    conn.execute(
        r#"UPDATE delivery_companies SET active = ?1 WHERE id = ?2"#,
        params![active, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn rename_delivery_company(
    state: tauri::State<AppState>,
    id: i64,
    new_name: String,
) -> Result<(), String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;
    conn.execute(
        r#"UPDATE delivery_companies SET name = TRIM(?1) WHERE id = ?2"#,
        params![new_name, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Settings (used by Settings.tsx) ---

#[tauri::command]
fn get_setting(state: tauri::State<AppState>, key: String) -> Result<Option<String>, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(r#"SELECT value FROM settings WHERE key = ?1"#)
        .map_err(|e| e.to_string())?;

    let value: Option<String> = stmt
        .query_row([key], |row| row.get::<_, String>(0))
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(value)
}

#[tauri::command]
fn set_setting(state: tauri::State<AppState>, key: String, value: String) -> Result<(), String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO settings (key, value, updated_at)
        VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
        "#,
        params![key, value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_theme_colors(state: tauri::State<AppState>) -> Result<Option<CustomThemeDTO>, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(r#"SELECT key, value FROM theme"#)
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;

    let mut base: Option<String> = None;
    let mut colors: HashMap<String, String> = HashMap::new();

    let mut any = false;
    for r in rows {
        let (k, v) = r.map_err(|e| e.to_string())?;
        any = true;
        if k.eq_ignore_ascii_case("base") {
            base = Some(v);
        } else {
            colors.insert(k, v);
        }
    }

    if !any {
        return Ok(None);
    }

    let b = base.unwrap_or_else(|| "light".to_string());
    let b_norm = if b.eq_ignore_ascii_case("dark") { "dark" } else { "light" }.to_string();

    Ok(Some(CustomThemeDTO { base: b_norm, colors }))
}

#[tauri::command]
fn save_theme_colors(
    state: tauri::State<AppState>,
    payload: CustomThemeDTO,
) -> Result<(), String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let base_norm = if payload.base.eq_ignore_ascii_case("dark") { "dark" } else { "light" };

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    // clear existing rows for a simple canonical state
    tx.execute(r#"DELETE FROM theme"#, []).map_err(|e| e.to_string())?;

    // insert base
    tx.execute(
        r#"
        INSERT INTO theme (key, value, updated_at)
        VALUES ('base', ?1, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        "#,
        params![base_norm],
    )
    .map_err(|e| e.to_string())?;

    // insert color tokens
    for (k, v) in payload.colors.iter() {
        tx.execute(
            r#"
            INSERT INTO theme (key, value, updated_at)
            VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            "#,
            params![k, v],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
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
            // orders
            save_order,
            get_order,
            update_order,
            set_order_done,
            delete_order,
            list_orders,
            // opened stack
            open_order,
            get_opened_orders,
            remove_opened_order,
            // search helpers
            search_article_names,
            get_latest_description_for_article,
            // delivery companies (Settings.tsx)
            list_delivery_companies,
            add_delivery_company,
            set_delivery_company_active,
            rename_delivery_company,
            // settings (Settings.tsx)
            get_setting,
            set_setting,
            // dashboard
            get_dashboard_data,
            //theme
            get_theme_colors,
            save_theme_colors,

        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}










// ---------- Dashboard types ----------

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct Kpis {
    total_orders: i64,
    open_orders: i64,
    overdue_open: i64,
    due_today: i64,
    due_next_7: i64,
    done_7d: i64,
    done_30d: i64,
    unique_clients: i64,
    returning_clients_pct: f64,
    avg_lead_days: Option<f64>,
    median_lead_days: Option<f64>,
    top_delivery_company: Option<TopItemShare>,
    top_article: Option<NameCount>,
    top_city: Option<NameCount>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct TopItemShare {
    name: String,
    count: i64,
    share_pct: f64,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct NameCount { name: String, count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct TimeCount { period: String, count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct TimeDoneCount { period: String, done: bool, count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct ScheduleItem { week: String, company: String, count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct LeadTimeBin { lead_days: i64, count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct BucketCount { bucket: String, count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct HeatCell { weekday: i64, hour: i64, count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct OrderExceptionRow {
    id: i64,
    article_name: String,
    client_name: String,
    city: String,
    delivery_company: String,
    delivery_date: String,
    age_days: i64,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct Exceptions {
    overdue_top10: Vec<OrderExceptionRow>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct DashboardData {
    kpis: Kpis,
    orders_over_time_weekly: Vec<TimeCount>,
    orders_over_time_weekly_by_done: Vec<TimeDoneCount>,
    delivery_schedule_weeks: Vec<ScheduleItem>,
    lead_time_histogram: Vec<LeadTimeBin>,
    top_articles: Vec<NameCount>,
    company_share_90d: Vec<NameCount>,
    new_vs_returning_monthly: Vec<(String, i64, i64)>, // (month, new, returning)
    backlog_age_buckets: Vec<BucketCount>,
    activity_heatmap: Vec<HeatCell>,
    exceptions: Exceptions,
}

// ---------- Command: get_dashboard_data ----------

#[tauri::command]
fn get_dashboard_data(state: tauri::State<AppState>) -> Result<DashboardData, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    // ---- KPIs ----
    let total_orders: i64 = conn.query_row("SELECT COUNT(*) FROM orders", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let open_orders: i64 = conn.query_row("SELECT COUNT(*) FROM orders WHERE done = 0", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let overdue_open: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE done = 0 AND date(delivery_date) < date('now','localtime')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let due_today: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE done = 0 AND date(delivery_date) = date('now','localtime')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let due_next_7: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE done = 0 AND date(delivery_date) > date('now','localtime') AND date(delivery_date) <= date('now','localtime','+7 days')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let done_7d: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE done = 1 AND datetime(created_at) >= datetime('now','-7 days')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let done_30d: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE done = 1 AND datetime(created_at) >= datetime('now','-30 days')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let unique_clients: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT phone) FROM orders",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let returning_clients_pct: f64 = conn.query_row(
        "WITH per_client AS (SELECT phone, COUNT(*) AS cnt FROM orders GROUP BY phone)
         SELECT COALESCE(ROUND(100.0 * SUM(CASE WHEN cnt > 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1), 0.0)
         FROM per_client",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;

    let avg_lead_days: Option<f64> = conn.query_row(
        "SELECT ROUND(AVG(julianday(date(delivery_date)) - julianday(datetime(created_at))), 2) FROM orders",
        [], |r| r.get::<_, Option<f64>>(0)
    ).map_err(|e| e.to_string())?;

    let median_lead_days: Option<f64> = conn.query_row(
        "WITH lt AS (
           SELECT (julianday(date(delivery_date)) - julianday(datetime(created_at))) AS d
           FROM orders
           WHERE delivery_date IS NOT NULL
           ORDER BY d
         )
         SELECT d FROM lt
         LIMIT 1 OFFSET (SELECT COUNT(*) FROM lt) / 2",
        [], |r| r.get::<_, Option<f64>>(0)
    ).map_err(|e| e.to_string())?;

    // Top delivery company (90d) + share
    let mut top_delivery_company: Option<TopItemShare> = None;
    let total_90d: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE date(created_at) >= date('now','-90 days')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    {
        let mut st = conn.prepare(
            "SELECT COALESCE(NULLIF(TRIM(delivery_company),''),'(Unknown)') AS name, COUNT(*) AS c
             FROM orders
             WHERE date(created_at) >= date('now','-90 days')
             GROUP BY name
             ORDER BY c DESC
             LIMIT 1"
        ).map_err(|e| e.to_string())?;
        let top: Option<(String, i64)> = st.query_row([], |row| Ok((row.get(0)?, row.get(1)?))).optional().map_err(|e| e.to_string())?;
        if let Some((name, count)) = top {
            let share = if total_90d > 0 { (count as f64) * 100.0 / (total_90d as f64) } else { 0.0 };
            top_delivery_company = Some(TopItemShare { name, count, share_pct: (share * 10.0).round() / 10.0 });
        }
    }

    // Top article & city (90d)
    let top_article: Option<NameCount> = {
        let mut st = conn.prepare(
            "SELECT article_name, COUNT(*) AS c
             FROM orders
             WHERE date(created_at) >= date('now','-90 days')
             GROUP BY article_name
             ORDER BY c DESC
             LIMIT 1"
        ).map_err(|e| e.to_string())?;
        st.query_row([], |r| Ok(NameCount { name: r.get(0)?, count: r.get(1)? }))
          .optional().map_err(|e| e.to_string())?
    };
    let top_city: Option<NameCount> = {
        let mut st = conn.prepare(
            "SELECT city, COUNT(*) AS c
             FROM orders
             WHERE date(created_at) >= date('now','-90 days')
             GROUP BY city
             ORDER BY c DESC
             LIMIT 1"
        ).map_err(|e| e.to_string())?;
        st.query_row([], |r| Ok(NameCount { name: r.get(0)?, count: r.get(1)? }))
          .optional().map_err(|e| e.to_string())?
    };

    let kpis = Kpis {
        total_orders,
        open_orders,
        overdue_open,
        due_today,
        due_next_7,
        done_7d,
        done_30d,
        unique_clients,
        returning_clients_pct,
        avg_lead_days,
        median_lead_days,
        top_delivery_company,
        top_article,
        top_city,
    };

    // ---- Orders over time (weekly) ----
    let orders_over_time_weekly: Vec<TimeCount> = {
        let mut st = conn.prepare(
            "SELECT strftime('%Y-%W', datetime(created_at)) AS period, COUNT(*) AS cnt
             FROM orders GROUP BY period ORDER BY period"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(TimeCount { period: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    let orders_over_time_weekly_by_done: Vec<TimeDoneCount> = {
        let mut st = conn.prepare(
            "SELECT strftime('%Y-%W', datetime(created_at)) AS period, done, COUNT(*) AS cnt
             FROM orders GROUP BY period, done ORDER BY period, done"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(TimeDoneCount { period: r.get(0)?, done: r.get(1)?, count: r.get(2)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Delivery schedule (next 12 weeks, open) ----
    let delivery_schedule_weeks: Vec<ScheduleItem> = {
        let mut st = conn.prepare(
            "SELECT strftime('%Y-%W', date(delivery_date)) AS week,
                    COALESCE(NULLIF(TRIM(delivery_company),''),'(Unknown)') AS company,
                    COUNT(*) AS cnt
             FROM orders
             WHERE date(delivery_date) BETWEEN date('now','localtime') AND date('now','localtime','+84 days')
               AND done = 0
             GROUP BY week, company
             ORDER BY week, company"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(ScheduleItem { week: r.get(0)?, company: r.get(1)?, count: r.get(2)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Lead time histogram ----
    let lead_time_histogram: Vec<LeadTimeBin> = {
        let mut st = conn.prepare(
            "SELECT ROUND(julianday(date(delivery_date)) - julianday(datetime(created_at))) AS lead_days,
                    COUNT(*) AS cnt
             FROM orders
             WHERE delivery_date IS NOT NULL
             GROUP BY lead_days
             ORDER BY lead_days"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(LeadTimeBin { lead_days: r.get::<_, f64>(0)? as i64, count: r.get(1)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Top articles (top 10) ----
    let top_articles: Vec<NameCount> = {
        let mut st = conn.prepare(
            "SELECT article_name AS name, COUNT(*) AS cnt
             FROM orders GROUP BY article_name ORDER BY cnt DESC LIMIT 10"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(NameCount { name: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Company share (last 90 days) ----
    let company_share_90d: Vec<NameCount> = {
        let mut st = conn.prepare(
            "SELECT COALESCE(NULLIF(TRIM(delivery_company),''),'(Unknown)') AS name, COUNT(*) AS cnt
             FROM orders
             WHERE date(created_at) >= date('now','-90 days')
             GROUP BY name
             ORDER BY cnt DESC"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(NameCount { name: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- New vs Returning (monthly) ----
    let new_vs_returning_monthly: Vec<(String, i64, i64)> = {
        let mut st = conn.prepare(
            "WITH first_seen AS (
               SELECT phone, MIN(date(created_at)) AS first_date FROM orders GROUP BY phone
             ),
             orders_m AS (
               SELECT phone, strftime('%Y-%m', date(created_at)) AS ym, date(created_at) AS d
               FROM orders
             )
             SELECT ym,
                    SUM(CASE WHEN d = (SELECT first_date FROM first_seen f WHERE f.phone = o.phone) THEN 1 ELSE 0 END) AS new_clients,
                    SUM(CASE WHEN d >  (SELECT first_date FROM first_seen f WHERE f.phone = o.phone) THEN 1 ELSE 0 END) AS returning_clients
             FROM orders_m o
             GROUP BY ym
             ORDER BY ym"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Backlog aging ----
    let backlog_age_buckets: Vec<BucketCount> = {
        let mut st = conn.prepare(
            "WITH ages AS (
               SELECT CAST(julianday('now') - julianday(datetime(created_at)) AS INT) AS age_days
               FROM orders WHERE done = 0
             )
             SELECT
               CASE
                 WHEN age_days < 3  THEN '0-2'
                 WHEN age_days < 7  THEN '3-6'
                 WHEN age_days < 14 THEN '7-13'
                 WHEN age_days < 30 THEN '14-29'
                 ELSE '30+'
               END AS bucket,
               COUNT(*) AS cnt
             FROM ages
             GROUP BY bucket
             ORDER BY
               CASE bucket
                 WHEN '0-2' THEN 1 WHEN '3-6' THEN 2 WHEN '7-13' THEN 3
                 WHEN '14-29' THEN 4 ELSE 5 END"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(BucketCount { bucket: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Activity heatmap ----
    let activity_heatmap: Vec<HeatCell> = {
        let mut st = conn.prepare(
            "SELECT CAST(strftime('%w', datetime(created_at)) AS INT) AS weekday,
                    CAST(strftime('%H', datetime(created_at)) AS INT) AS hour,
                    COUNT(*) AS cnt
             FROM orders
             GROUP BY weekday, hour
             ORDER BY weekday, hour"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(HeatCell { weekday: r.get(0)?, hour: r.get(1)?, count: r.get(2)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Exceptions ----
    let exceptions_overdue_top10: Vec<OrderExceptionRow> = {
        let mut st = conn.prepare(
            "SELECT id, article_name, client_name, city, delivery_company, delivery_date,
                    CAST(julianday('now') - julianday(datetime(created_at)) AS INT) AS age_days
             FROM orders
             WHERE done = 0 AND date(delivery_date) < date('now','localtime')
             ORDER BY date(delivery_date) ASC
             LIMIT 10"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(OrderExceptionRow {
            id: r.get(0)?, article_name: r.get(1)?, client_name: r.get(2)?, city: r.get(3)?,
            delivery_company: r.get(4)?, delivery_date: r.get(5)?, age_days: r.get(6)?,
        })).map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    let data = DashboardData {
        kpis,
        orders_over_time_weekly,
        orders_over_time_weekly_by_done,
        delivery_schedule_weeks,
        lead_time_histogram,
        top_articles,
        company_share_90d,
        new_vs_returning_monthly,
        backlog_age_buckets,
        activity_heatmap,
        exceptions: Exceptions { overdue_top10: exceptions_overdue_top10 },
    };

    Ok(data)
}