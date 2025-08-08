// src/commands/dashboard.rs
use crate::app_state::AppState;
use crate::db::{ensure_schema, open_db};
use crate::models::dashboard::*;
use rusqlite::OptionalExtension;

#[tauri::command]
pub fn get_dashboard_data(state: tauri::State<AppState>) -> Result<DashboardData, String> {
    let conn = open_db(&state.db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn).map_err(|e| e.to_string())?;

    // ---- KPIs ----
    let total_orders: i64 = conn.query_row("SELECT COUNT(*) FROM orders", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let open_orders: i64 = conn.query_row("SELECT COUNT(*) FROM orders WHERE done = 0", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let overdue_open: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE done = 0 AND date(delivery_date) < date('now','localtime')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let due_today: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE done = 0 AND date(delivery_date) = date('now','localtime')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let due_next_7: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE done = 0 AND date(delivery_date) > date('now','localtime') AND date(delivery_date) <= date('now','localtime','+7 days')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let done_7d: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE done = 1 AND datetime(created_at) >= datetime('now','-7 days')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let done_30d: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE done = 1 AND datetime(created_at) >= datetime('now','-30 days')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let unique_clients: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT phone) FROM orders",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let returning_clients_pct: f64 = conn.query_row(
        "WITH per_client AS (SELECT phone, COUNT(*) AS cnt FROM orders GROUP BY phone)
         SELECT COALESCE(ROUND(100.0 * SUM(CASE WHEN cnt > 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1), 0.0)
         FROM per_client",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;

    let avg_lead_days: Option<f64> = conn.query_row(
        "SELECT ROUND(AVG(julianday(date(delivery_date)) - julianday(datetime(created_at))), 2) FROM orders",
        [], |r| r.get::<_, Option<f64>>(0)
    ).map_err(|e| e.to_string())?;

    let median_lead_days: Option<f64> = conn.query_row(
        "WITH lt AS (
           SELECT (julianday(date(delivery_date)) - julianday(datetime(created_at))) AS d
           FROM orders
           WHERE delivery_date IS NOT NULL
           ORDER BY d
         )
         SELECT d FROM lt
         LIMIT 1 OFFSET (SELECT COUNT(*) FROM lt) / 2",
        [], |r| r.get::<_, Option<f64>>(0)
    ).map_err(|e| e.to_string())?;

    // Top delivery company (90d) + share
    let mut top_delivery_company: Option<TopItemShare> = None;
    let total_90d: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE date(created_at) >= date('now','-90 days')",
        [], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    {
        let mut st = conn.prepare(
            "SELECT COALESCE(NULLIF(TRIM(delivery_company),''),'(Unknown)') AS name, COUNT(*) AS c
             FROM orders
             WHERE date(created_at) >= date('now','-90 days')
             GROUP BY name
             ORDER BY c DESC
             LIMIT 1"
        ).map_err(|e| e.to_string())?;
        let top: Option<(String, i64)> = st.query_row([], |row| Ok((row.get(0)?, row.get(1)?))).optional().map_err(|e| e.to_string())?;
        if let Some((name, count)) = top {
            let share = if total_90d > 0 { (count as f64) * 100.0 / (total_90d as f64) } else { 0.0 };
            top_delivery_company = Some(TopItemShare { name, count, share_pct: (share * 10.0).round() / 10.0 });
        }
    }

    // Top article & city (90d)
    let top_article: Option<NameCount> = {
        let mut st = conn.prepare(
            "SELECT article_name, COUNT(*) AS c
             FROM orders
             WHERE date(created_at) >= date('now','-90 days')
             GROUP BY article_name
             ORDER BY c DESC
             LIMIT 1"
        ).map_err(|e| e.to_string())?;
        st.query_row([], |r| Ok(NameCount { name: r.get(0)?, count: r.get(1)? }))
          .optional().map_err(|e| e.to_string())?
    };
    let top_city: Option<NameCount> = {
        let mut st = conn.prepare(
            "SELECT city, COUNT(*) AS c
             FROM orders
             WHERE date(created_at) >= date('now','-90 days')
             GROUP BY city
             ORDER BY c DESC
             LIMIT 1"
        ).map_err(|e| e.to_string())?;
        st.query_row([], |r| Ok(NameCount { name: r.get(0)?, count: r.get(1)? }))
          .optional().map_err(|e| e.to_string())?
    };

    let kpis = Kpis {
        total_orders,
        open_orders,
        overdue_open,
        due_today,
        due_next_7,
        done_7d,
        done_30d,
        unique_clients,
        returning_clients_pct,
        avg_lead_days,
        median_lead_days,
        top_delivery_company,
        top_article,
        top_city,
    };

    // ---- Orders over time (weekly) ----
    let orders_over_time_weekly: Vec<TimeCount> = {
        let mut st = conn.prepare(
            "SELECT strftime('%Y-%W', datetime(created_at)) AS period, COUNT(*) AS cnt
             FROM orders GROUP BY period ORDER BY period"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(TimeCount { period: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    let orders_over_time_weekly_by_done: Vec<TimeDoneCount> = {
        let mut st = conn.prepare(
            "SELECT strftime('%Y-%W', datetime(created_at)) AS period, done, COUNT(*) AS cnt
             FROM orders GROUP BY period, done ORDER BY period, done"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(TimeDoneCount { period: r.get(0)?, done: r.get(1)?, count: r.get(2)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Delivery schedule (next 12 weeks, open) ----
    let delivery_schedule_weeks: Vec<ScheduleItem> = {
        let mut st = conn.prepare(
            "SELECT strftime('%Y-%W', date(delivery_date)) AS week,
                    COALESCE(NULLIF(TRIM(delivery_company),''),'(Unknown)') AS company,
                    COUNT(*) AS cnt
             FROM orders
             WHERE date(delivery_date) BETWEEN date('now','localtime') AND date('now','localtime','+84 days')
               AND done = 0
             GROUP BY week, company
             ORDER BY week, company"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(ScheduleItem { week: r.get(0)?, company: r.get(1)?, count: r.get(2)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Lead time histogram ----
    let lead_time_histogram: Vec<LeadTimeBin> = {
        let mut st = conn.prepare(
            "SELECT ROUND(julianday(date(delivery_date)) - julianday(datetime(created_at))) AS lead_days,
                    COUNT(*) AS cnt
             FROM orders
             WHERE delivery_date IS NOT NULL
             GROUP BY lead_days
             ORDER BY lead_days"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(LeadTimeBin { lead_days: r.get::<_, f64>(0)? as i64, count: r.get(1)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Top articles (top 10) ----
    let top_articles: Vec<NameCount> = {
        let mut st = conn.prepare(
            "SELECT article_name AS name, COUNT(*) AS cnt
             FROM orders GROUP BY article_name ORDER BY cnt DESC LIMIT 10"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(NameCount { name: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Company share (last 90 days) ----
    let company_share_90d: Vec<NameCount> = {
        let mut st = conn.prepare(
            "SELECT COALESCE(NULLIF(TRIM(delivery_company),''),'(Unknown)') AS name, COUNT(*) AS cnt
             FROM orders
             WHERE date(created_at) >= date('now','-90 days')
             GROUP BY name
             ORDER BY cnt DESC"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(NameCount { name: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- New vs Returning (monthly) ----
    let new_vs_returning_monthly: Vec<(String, i64, i64)> = {
        let mut st = conn.prepare(
            "WITH first_seen AS (
               SELECT phone, MIN(date(created_at)) AS first_date FROM orders GROUP BY phone
             ),
             orders_m AS (
               SELECT phone, strftime('%Y-%m', date(created_at)) AS ym, date(created_at) AS d
               FROM orders
             )
             SELECT ym,
                    SUM(CASE WHEN d = (SELECT first_date FROM first_seen f WHERE f.phone = o.phone) THEN 1 ELSE 0 END) AS new_clients,
                    SUM(CASE WHEN d >  (SELECT first_date FROM first_seen f WHERE f.phone = o.phone) THEN 1 ELSE 0 END) AS returning_clients
             FROM orders_m o
             GROUP BY ym
             ORDER BY ym"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Backlog aging ----
    let backlog_age_buckets: Vec<BucketCount> = {
        let mut st = conn.prepare(
            "WITH ages AS (
               SELECT CAST(julianday('now') - julianday(datetime(created_at)) AS INT) AS age_days
               FROM orders WHERE done = 0
             )
             SELECT
               CASE
                 WHEN age_days < 3  THEN '0-2'
                 WHEN age_days < 7  THEN '3-6'
                 WHEN age_days < 14 THEN '7-13'
                 WHEN age_days < 30 THEN '14-29'
                 ELSE '30+'
               END AS bucket,
               COUNT(*) AS cnt
             FROM ages
             GROUP BY bucket
             ORDER BY
               CASE bucket
                 WHEN '0-2' THEN 1 WHEN '3-6' THEN 2 WHEN '7-13' THEN 3
                 WHEN '14-29' THEN 4 ELSE 5 END"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(BucketCount { bucket: r.get(0)?, count: r.get(1)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Activity heatmap ----
    let activity_heatmap: Vec<HeatCell> = {
        let mut st = conn.prepare(
            "SELECT CAST(strftime('%w', datetime(created_at)) AS INT) AS weekday,
                    CAST(strftime('%H', datetime(created_at)) AS INT) AS hour,
                    COUNT(*) AS cnt
             FROM orders
             GROUP BY weekday, hour
             ORDER BY weekday, hour"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(HeatCell { weekday: r.get(0)?, hour: r.get(1)?, count: r.get(2)? }))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    // ---- Exceptions ----
    let exceptions_overdue_top10: Vec<OrderExceptionRow> = {
        let mut st = conn.prepare(
            "SELECT id, article_name, client_name, city, delivery_company, delivery_date,
                    CAST(julianday('now') - julianday(datetime(created_at)) AS INT) AS age_days
             FROM orders
             WHERE done = 0 AND date(delivery_date) < date('now','localtime')
             ORDER BY date(delivery_date) ASC
             LIMIT 10"
        ).map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(OrderExceptionRow {
            id: r.get(0)?, article_name: r.get(1)?, client_name: r.get(2)?, city: r.get(3)?,
            delivery_company: r.get(4)?, delivery_date: r.get(5)?, age_days: r.get(6)?,
        })).map_err(|e| e.to_string())?;
        let mut out = Vec::new(); for r in rows { out.push(r.map_err(|e| e.to_string())?); } out
    };

    let data = DashboardData {
        kpis,
        orders_over_time_weekly,
        orders_over_time_weekly_by_done,
        delivery_schedule_weeks,
        lead_time_histogram,
        top_articles,
        company_share_90d,
        new_vs_returning_monthly,
        backlog_age_buckets,
        activity_heatmap,
        exceptions: Exceptions { overdue_top10: exceptions_overdue_top10 },
    };

    Ok(data)
}
