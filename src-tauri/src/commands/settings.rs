use crate::app_state::AppState;
use crate::db::{ensure_schema, open_db};
use rusqlite::OptionalExtension;

#[tauri::command]
pub fn get_setting(state: tauri::State<AppState>, key: String) -> Result<Option<String>, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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
pub fn set_setting(state: tauri::State<AppState>, key: String, value: String) -> Result<(), String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO settings (key, value, updated_at)
        VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
        "#,
        rusqlite::params![key, value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
