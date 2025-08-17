mod app_state;
mod db;
mod util;

mod models {
    pub mod orders;
    pub mod company;
    pub mod theme;
    pub mod dashboard;
}

mod commands;

use crate::app_state::AppState;
use rusqlite::Connection;
use tauri::Manager;
use std::fs;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("orders.db");

            let conn = Connection::open(&db_path)?;
            db::ensure_schema(&conn)?;

            app.manage(AppState { db_path });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // greet
            commands::greet::greet,
            // orders
            commands::orders::save_order,
            commands::orders::get_order,
            commands::orders::update_order,
            commands::orders::set_order_done,
            commands::orders::delete_order,
            commands::orders::list_orders,
            // opened stack
            commands::opened_orders::open_order,
            commands::opened_orders::get_opened_orders,
            commands::opened_orders::remove_opened_order,
            // search helpers
            commands::search::search_article_names,
            commands::search::get_latest_description_for_article,
            // delivery companies (Settings.tsx)
            commands::companies::list_delivery_companies,
            commands::companies::add_delivery_company,
            commands::companies::set_delivery_company_active,
            commands::companies::rename_delivery_company,
            // settings (Settings.tsx)
            commands::settings::get_setting,
            commands::settings::set_setting,
            // dashboard
            commands::dashboard::get_dashboard_data,
            // theme
            commands::theme::get_theme_colors,
            commands::theme::save_theme_colors,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
