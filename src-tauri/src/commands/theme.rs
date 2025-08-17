use crate::app_state::AppState;
use crate::db::{ensure_schema, open_db};
use crate::models::theme::CustomThemeDTO;
use rusqlite::params;
use std::collections::HashMap;

#[tauri::command]
pub fn get_theme_colors(state: tauri::State<AppState>) -> Result<Option<CustomThemeDTO>, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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

    if !any { return Ok(None); }

    let b = base.unwrap_or_else(|| "light".to_string());
    let b_norm = if b.eq_ignore_ascii_case("dark") { "dark" } else { "light" }.to_string();

    Ok(Some(CustomThemeDTO { base: b_norm, colors }))
}

#[tauri::command]
pub fn save_theme_colors(
    state: tauri::State<AppState>,
    payload: CustomThemeDTO,
) -> Result<(), String> {
    let mut conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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
