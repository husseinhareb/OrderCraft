// src/commands/theme.rs

use crate::app_state::AppState;
use crate::db::{ensure_schema, open_db};
use crate::models::theme::{BaseTheme, ThemeDTO};
use rusqlite::params;
use serde_json::Value as Json;
use std::collections::HashMap;

const DEFAULT_CUSTOM_CONFETTI: [&str; 5] =
    ["#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7"];

fn sanitize_color(s: &str) -> Option<String> {
    let v = s.trim();
    if v.is_empty() {
        return None;
    }
    Some(v.to_string())
}

fn clamp_confetti(mut v: Vec<String>) -> Vec<String> {
    // Keep order, drop empties/dupes, clamp to 5
    let mut out: Vec<String> = Vec::new();
    for c in v.drain(..) {
        let c = c.trim();
        if c.is_empty() {
            continue;
        }
        if !out.iter().any(|x| x.eq_ignore_ascii_case(c)) {
            out.push(c.to_string());
        }
        if out.len() == 5 {
            break;
        }
    }
    out
}

fn parse_confetti_from_rows(rows: &[(String, String)]) -> Vec<String> {
    // Preferred: a single "confetti" row containing a JSON string array.
    if let Some((_, json_str)) = rows
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case("confetti"))
    {
        if let Ok(Json::Array(arr)) = serde_json::from_str::<Json>(json_str) {
            let collected = arr
                .into_iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect::<Vec<_>>();
            return clamp_confetti(collected);
        }
    }

    // Legacy fallback: keys "confetti1".."confetti5"
    let mut legacy: Vec<(usize, String)> = rows
        .iter()
        .filter_map(|(k, v)| {
            let kl = k.to_ascii_lowercase();
            if kl.starts_with("confetti") {
                let idx = kl
                    .trim_start_matches("confetti")
                    .parse::<usize>()
                    .ok()?;
                Some((idx, v.clone()))
            } else {
                None
            }
        })
        .collect();

    legacy.sort_by_key(|(i, _)| *i);
    clamp_confetti(
        legacy
            .into_iter()
            .filter_map(|(_, v)| sanitize_color(&v))
            .collect(),
    )
}

#[tauri::command]
pub fn get_theme_colors(state: tauri::State<AppState>) -> Result<Option<ThemeDTO>, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(r#"SELECT key, value FROM theme"#)
        .map_err(|e| e.to_string())?;

    let rows_iter = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut rows: Vec<(String, String)> = Vec::new();
    for r in rows_iter {
        rows.push(r.map_err(|e| e.to_string())?);
    }

    if rows.is_empty() {
        return Ok(None);
    }

    // base
    let base_str = rows
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case("base"))
        .map(|(_, v)| v.as_str())
        .unwrap_or("light");
    let base = BaseTheme::from_str_case_insensitive(base_str);

    // theme tokens (exclude base and any confetti keys)
    let mut colors: HashMap<String, String> = HashMap::new();
    for (k, v) in rows.iter() {
        let kl = k.to_ascii_lowercase();
        if kl == "base" || kl == "confetti" || kl.starts_with("confetti") {
            continue;
        }
        colors.insert(k.clone(), v.clone());
    }

    // CONFIGURED palette (if any) from DB
    let configured = parse_confetti_from_rows(&rows);

    // For the editor:
    // - If user saved a palette -> return it (any base).
    // - If base is custom and nothing saved -> show default colorful set.
    // - If base is light/dark and nothing saved -> return empty.
    let confetti_for_editor: Vec<String> = if !configured.is_empty() {
        configured
    } else {
        match base {
            BaseTheme::Custom => DEFAULT_CUSTOM_CONFETTI
                .iter()
                .map(|s| s.to_string())
                .collect(),
            _ => Vec::new(),
        }
    };

    Ok(Some(ThemeDTO {
        base,
        colors,
        confetti_colors: Some(confetti_for_editor),
    }))
}

#[tauri::command]
pub fn save_theme_colors(
    state: tauri::State<AppState>,
    payload: ThemeDTO,
) -> Result<(), String> {
    let mut conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    let base_str = payload.base.as_str();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Clear existing rows for canonical state
    tx.execute(r#"DELETE FROM theme"#, [])
        .map_err(|e| e.to_string())?;

    // Insert base
    tx.execute(
        r#"
        INSERT INTO theme (key, value, updated_at)
        VALUES ('base', ?1, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        "#,
        params![base_str],
    )
    .map_err(|e| e.to_string())?;

    // Insert color tokens (UI tokens)
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

    // Insert confetti palette only if provided; keep it under a single JSON key.
    if let Some(colors) = payload.confetti_colors.clone() {
        // Allow saving even if base is light/dark (user can pre-configure).
        let cleaned = clamp_confetti(
            colors
                .into_iter()
                .filter_map(|c| sanitize_color(&c))
                .collect(),
        );
        if !cleaned.is_empty() {
            let json = serde_json::to_string(&cleaned).map_err(|e| e.to_string())?;
            tx.execute(
                r#"
                INSERT INTO theme (key, value, updated_at)
                VALUES ('confetti', ?1, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
                "#,
                params![json],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

/// Convenience endpoint: EFFECTIVE palette to feed into canvas-confetti.
#[tauri::command]
pub fn get_confetti_palette(state: tauri::State<AppState>) -> Result<Vec<String>, String> {
    match get_theme_colors(state) {
        Ok(Some(dto)) => {
            let base = dto.base;
            let configured_or_default_for_editor = dto.confetti_colors.unwrap_or_default();

            // If the editor returned something (configured or default-custom), use it.
            // Otherwise fall back to light/dark defaults.
            let effective = if !configured_or_default_for_editor.is_empty() {
                configured_or_default_for_editor
            } else {
                match base {
                    BaseTheme::Light => vec!["#000000".into()],
                    BaseTheme::Dark => vec!["#ffffff".into()],
                    BaseTheme::Custom => DEFAULT_CUSTOM_CONFETTI
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                }
            };
            Ok(effective)
        }
        Ok(None) => Ok(vec!["#000000".into()]), // default if unset
        Err(e) => Err(e),
    }
}
