// src/company.rs/dashboard.rs
use serde::Serialize;

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Kpis {
    pub total_orders: i64,
    pub open_orders: i64,
    pub overdue_open: i64,
    pub due_today: i64,
    pub due_next_7: i64,
    pub done_7d: i64,
    pub done_30d: i64,
    pub unique_clients: i64,
    pub returning_clients_pct: f64,
    pub avg_lead_days: Option<f64>,
    pub median_lead_days: Option<f64>,
    pub top_delivery_company: Option<TopItemShare>,
    pub top_article: Option<NameCount>,
    pub top_city: Option<NameCount>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TopItemShare {
    pub name: String,
    pub count: i64,
    pub share_pct: f64,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NameCount { pub name: String, pub count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TimeCount { pub period: String, pub count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TimeDoneCount { pub period: String, pub done: bool, pub count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleItem { pub week: String, pub company: String, pub count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LeadTimeBin { pub lead_days: i64, pub count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BucketCount { pub bucket: String, pub count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HeatCell { pub weekday: i64, pub hour: i64, pub count: i64 }

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OrderExceptionRow {
    pub id: i64,
    pub article_name: String,
    pub client_name: String,
    pub city: String,
    pub delivery_company: String,
    pub delivery_date: String,
    pub age_days: i64,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Exceptions {
    pub overdue_top10: Vec<OrderExceptionRow>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DashboardData {
    pub kpis: Kpis,
    pub orders_over_time_weekly: Vec<TimeCount>,
    pub orders_over_time_weekly_by_done: Vec<TimeDoneCount>,
    pub delivery_schedule_weeks: Vec<ScheduleItem>,
    pub lead_time_histogram: Vec<LeadTimeBin>,
    pub top_articles: Vec<NameCount>,
    pub company_share_90d: Vec<NameCount>,
    pub new_vs_returning_monthly: Vec<(String, i64, i64)>, // (month, new, returning)
    pub backlog_age_buckets: Vec<BucketCount>,
    pub activity_heatmap: Vec<HeatCell>,
    pub exceptions: Exceptions,
}
