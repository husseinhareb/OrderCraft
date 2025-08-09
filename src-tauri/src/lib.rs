// /src/lib.rs
use std::fs;
use std::path::PathBuf;

use rusqlite::{params, Connection};
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
    // Recommended when using FKs
    conn.execute("PRAGMA foreign_keys = ON", [])?;

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

    // Migrations (ignore duplicate column errors)
    if let Err(e) = conn.execute(
        r#"ALTER TABLE orders ADD COLUMN article_name TEXT NOT NULL DEFAULT ''"#,
        [],
    ) {
        let msg = e.to_string().to_lowercase();
        if !msg.contains("duplicate column") {
            return Err(e);
        }
    }
    if let Err(e) =
        conn.execute(r#"ALTER TABLE orders ADD COLUMN done INTEGER NOT NULL DEFAULT 0"#, [])
    {
        let msg = e.to_string().to_lowercase();
        if !msg.contains("duplicate column") {
            return Err(e);
        }
    }

    Ok(())
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
    conn.execute(r#"UPDATE orders SET done = ?1 WHERE id = ?2"#, params![done, id])
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
    let mut conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?; // <-- mut
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
    let mut conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?; // <-- mut
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
            params![i as i64 + 1, oid],
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
            save_order,
            get_order,
            update_order,
            set_order_done,
            delete_order,
            list_orders,
            open_order,
            get_opened_orders,
            remove_opened_order,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
