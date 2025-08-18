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

