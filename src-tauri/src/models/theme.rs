use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CustomThemeDTO {
    // "light" or "dark" — the base your custom colors override
    pub base: String,
    // token -> color (e.g. "bg": "#ffffff", "overlay": "rgba(0,0,0,0.4)")
    pub colors: HashMap<String, String>,
}
