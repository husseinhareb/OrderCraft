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
    pub phone: String,
    pub city: String,
    pub address: String,
    pub delivery_company: String,
    pub delivery_date: String, // ISO yyyy-mm-dd from UI
    pub description: Option<String>,
}

#[derive(Clone)]
struct AppState {
    db_path: PathBuf,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_order(state: tauri::State<AppState>, order: Order) -> Result<i64, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;

    // Ensure table exists (safe to run every time)
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_name TEXT NOT NULL,
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
    )
    .map_err(|e| e.to_string())?;

    // Insert
    conn.execute(
        r#"
        INSERT INTO orders
          (client_name, phone, city, address, delivery_company, delivery_date, description)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        "#,
        params![
            order.client_name,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // ✅ app_data_dir() returns Result<PathBuf, _> in Tauri v2
            let data_dir = app.path().app_data_dir()?;         // <- was .ok_or(...)
            fs::create_dir_all(&data_dir)?;                    // std::io::Error implements Error
            let db_path = data_dir.join("orders.db");

            // Create DB & table once at startup
            let conn = Connection::open(&db_path)?;
            conn.execute(
                r#"
                CREATE TABLE IF NOT EXISTS orders (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  client_name TEXT NOT NULL,
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

            app.manage(AppState { db_path });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, save_order])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
