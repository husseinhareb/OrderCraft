// /src/lib.rs
use std::fs;
use std::path::PathBuf;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::Manager;

// ---------- Types ----------
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Order {
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
}

#[derive(Clone)]
struct AppState {
    db_path: PathBuf,
}

// ---------- Helpers ----------
fn ensure_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
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
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
        "#,
        [],
    )?;
    // Migration: try to add article_name if missing
    if let Err(e) = conn.execute(r#"ALTER TABLE orders ADD COLUMN article_name TEXT NOT NULL DEFAULT ''"#, []) {
        let msg = e.to_string().to_lowercase();
        if !msg.contains("duplicate column") { return Err(e); }
    }
    Ok(())
}

// ---------- Commands ----------
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_order(state: tauri::State<AppState>, order: Order) -> Result<i64, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;
    conn.execute(
        r#"
        INSERT INTO orders
          (client_name, article_name, phone, city, address, delivery_company, delivery_date, description)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        "#,
        params![
            order.client_name, order.article_name, order.phone, order.city,
            order.address, order.delivery_company, order.delivery_date, order.description
        ],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_order(state: tauri::State<AppState>, id: i64) -> Result<OrderWithId, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            r#"SELECT id, client_name, article_name, phone, city, address, delivery_company, delivery_date, description
               FROM orders WHERE id = ?1"#,
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
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(order)
}

#[tauri::command]
fn update_order(state: tauri::State<AppState>, id: i64, order: Order) -> Result<(), String> {
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
            order.client_name, order.article_name, order.phone, order.city,
            order.address, order.delivery_company, order.delivery_date, order.description, id
        ],
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
        .prepare("SELECT id, article_name FROM orders ORDER BY created_at DESC, id DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(OrderListItem { id: row.get(0)?, article_name: row.get(1)? })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
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
            greet, save_order, get_order, update_order, delete_order, list_orders
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
