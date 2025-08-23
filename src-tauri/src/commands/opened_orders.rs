// src/commands/opened_orders.rs
use crate::app_state::AppState;
use crate::db::{ensure_schema, open_db};
use crate::models::orders::OpenedOrderItem;
use rusqlite::{params, TransactionBehavior};

/// Open an order without reordering the list:
/// - If the order is already present, leave its position as-is.
/// - If it's new, append it to the end (highest position).
#[tauri::command]
pub fn open_order(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let mut conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let tx = conn
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;

    // Insert only if missing; append to the end by using MAX(position)+1.
    tx.execute(
        r#"
        INSERT INTO opened_orders (order_id, position)
        SELECT ?1, COALESCE(MAX(position), 0) + 1
        FROM opened_orders
        WHERE NOT EXISTS (SELECT 1 FROM opened_orders WHERE order_id = ?1)
        "#,
        params![id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_opened_orders(state: tauri::State<AppState>) -> Result<Vec<OpenedOrderItem>, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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
pub fn remove_opened_order(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let mut conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let tx = conn
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;

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

    // Re-number positions densely starting from 1, keeping relative order.
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
