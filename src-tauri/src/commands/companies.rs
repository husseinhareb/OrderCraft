// src/commands/companies
use crate::app_state::AppState;
use crate::db::{ensure_schema, open_db};
use crate::models::company::DeliveryCompany;
use rusqlite::{params};

#[tauri::command]
pub fn list_delivery_companies(state: tauri::State<AppState>) -> Result<Vec<DeliveryCompany>, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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
pub fn add_delivery_company(state: tauri::State<AppState>, name: String) -> Result<i64, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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
pub fn set_delivery_company_active(
    state: tauri::State<AppState>,
    id: i64,
    active: bool,
) -> Result<(), String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;
    conn.execute(
        r#"UPDATE delivery_companies SET active = ?1 WHERE id = ?2"#,
        params![active, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn rename_delivery_company(
    state: tauri::State<AppState>,
    id: i64,
    new_name: String,
) -> Result<(), String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;
    conn.execute(
        r#"UPDATE delivery_companies SET name = TRIM(?1) WHERE id = ?2"#,
        params![new_name, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
