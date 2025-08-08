// src/company.rs/company.rs
use serde::Serialize;

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DeliveryCompany {
    pub id: i64,
    pub name: String,
    pub active: bool,
}
