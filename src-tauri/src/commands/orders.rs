use crate::app_state::AppState;
use crate::db::{ensure_schema, get_or_create_delivery_company, open_db};
use crate::models::orders::{NewOrderInput, UpdateOrderInput, OrderListItem, OrderWithId};
use rusqlite::{params, OptionalExtension};

#[tauri::command]
pub fn save_order(state: tauri::State<AppState>, order: NewOrderInput) -> Result<i64, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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
pub fn get_order(state: tauri::State<AppState>, id: i64) -> Result<OrderWithId, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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
pub fn update_order(
    state: tauri::State<AppState>,
    id: i64,
    order: UpdateOrderInput,
) -> Result<(), String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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
pub fn set_order_done(state: tauri::State<AppState>, id: i64, done: bool) -> Result<(), String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;
    conn.execute(
        r#"UPDATE orders SET done = ?1 WHERE id = ?2"#,
        params![done, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_order(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;
    conn.execute(r#"DELETE FROM orders WHERE id = ?1"#, params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_orders(state: tauri::State<AppState>) -> Result<Vec<OrderListItem>, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}
