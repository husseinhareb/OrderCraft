// src/models/theme.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BaseTheme {
    Light,
    Dark,
    Custom,
}

impl Default for BaseTheme {
    fn default() -> Self {
        BaseTheme::Light
    }
}

impl BaseTheme {
    pub fn from_str_case_insensitive(s: &str) -> Self {
        match s.to_ascii_lowercase().as_str() {
            "dark" => BaseTheme::Dark,
            "custom" => BaseTheme::Custom,
            _ => BaseTheme::Light,
        }
    }
    pub fn as_str(&self) -> &'static str {
        match self {
            BaseTheme::Light => "light",
            BaseTheme::Dark => "dark",
            BaseTheme::Custom => "custom",
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ThemeDTO {
    /// "light" | "dark" | "custom"
    pub base: BaseTheme,
    /// token -> color (e.g. "bg": "#ffffff", "overlay": "rgba(0,0,0,0.4)")
    pub colors: HashMap<String, String>,
    /// CONFIGURED confetti palette for the editor (0..=5 colors).
    /// - If a palette was saved, it is returned regardless of base.
    /// - If base=custom and nothing saved, a default colorful set may be returned.
    /// - If base=light/dark and nothing saved, this is empty (UI can pad).
    ///
    /// Use the `get_confetti_palette` command for the EFFECTIVE palette used at runtime.
    pub confetti_colors: Option<Vec<String>>,
}
