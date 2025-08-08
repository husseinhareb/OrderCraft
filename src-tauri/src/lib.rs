// /src/lib.rs
use std::fs;
use std::path::PathBuf;

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Order {
    pub client_name: String,
    pub article_name: String, // <-- NEW
    pub phone: String,
    pub city: String,
    pub address: String,
    pub delivery_company: String,
    pub delivery_date: String, // ISO yyyy-mm-dd from UI
    pub description: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct OrderListItem {
    id: i64,
    article_name: String,
}

#[derive(Clone)]
struct AppState {
    db_path: PathBuf,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn ensure_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Create table if missing
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_name TEXT NOT NULL,
          article_name TEXT NOT NULL DEFAULT '', -- <-- ensure exists for fresh DBs
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

    // Lightweight migration for existing DBs that may lack `article_name`
    // Attempt to add column; ignore the "duplicate column name" error.
    let alter = conn.execute(
        r#"ALTER TABLE orders ADD COLUMN article_name TEXT NOT NULL DEFAULT ''"#,
        [],
    );
    if let Err(e) = alter {
        // If it's not "duplicate column name", bubble it up
        let msg = e.to_string().to_lowercase();
        if !msg.contains("duplicate column name") && !msg.contains("duplicate column") {
            return Err(e);
        }
    }

    Ok(())
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
            order.client_name,
            order.article_name, // <-- NEW
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
fn list_orders(state: tauri::State<AppState>) -> Result<Vec<OrderListItem>, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, article_name FROM orders ORDER BY created_at DESC, id DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(OrderListItem {
                id: row.get(0)?,
                article_name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // ✅ app_data_dir() returns Result<PathBuf, _> in Tauri v2
            let data_dir = app.path().app_data_dir()?; // requires `use tauri::Manager;`
            fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("orders.db");

            // Create DB & ensure schema at startup
            let conn = Connection::open(&db_path)?;
            ensure_schema(&conn)?;

            app.manage(AppState { db_path });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, save_order, list_orders])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}