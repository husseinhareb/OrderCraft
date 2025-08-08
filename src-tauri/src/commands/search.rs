// src/commands/search.rs
use crate::app_state::AppState;
use crate::db::{ensure_schema, open_db};
use crate::util::escape_like;
use rusqlite::{params, OptionalExtension};

#[tauri::command]
pub fn search_article_names(
    state: tauri::State<AppState>,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<String>, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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
            WHERE o.article_name LIKE ?1 ESCAPE '\\'
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
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub fn get_latest_description_for_article(
    state: tauri::State<AppState>,
    name: String,
) -> Result<Option<String>, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
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
