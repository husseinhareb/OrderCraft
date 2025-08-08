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
    /// Effective confetti palette to use on the client (1..=5 colors).
    /// - If base=light/dark this will be ["#000000"] or ["#ffffff"].
    /// - If base=custom this is whatever user configured (up to 5).
    pub confetti_colors: Option<Vec<String>>,
}
