// src/components/Dashboard/Dashboard.tsx
import type { FC } from "react";
import React, { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../../store/store";

/* ----------------------------- Types from Rust (camelCase) ----------------------------- */
type NameCount = { name: string; count: number };
type TimeCount = { period: string; count: number };
type TimeDoneCount = { period: string; done: boolean; count: number };
type ScheduleItem = { week: string; company: string; count: number };
type LeadTimeBin = { leadDays: number; count: number } | { lead_days: number; count: number }; // tolerate both casings
type BucketCount = { bucket: string; count: number };
type HeatCell = { weekday: number; hour: number; count: number };
type OrderExceptionRow = {
  id: number;
  articleName: string;
  clientName: string;
  city: string;
  deliveryCompany: string;
  deliveryDate: string;
  ageDays: number;
};
type Exceptions = { overdueTop10: OrderExceptionRow[] };
type TopItemShare = { name: string; count: number; sharePct: number };

type Kpis = {
  totalOrders: number;
  openOrders: number;
  overdueOpen: number;
  dueToday: number;
  dueNext7: number;
  done7d: number;
  done30d: number;
  uniqueClients: number;
  returningClientsPct: number;
  avgLeadDays: number | null;
  medianLeadDays: number | null;
  topDeliveryCompany: TopItemShare | null;
  topArticle: NameCount | null;
  topCity: NameCount | null;
};

type DashboardData = {
  kpis: Kpis;
  ordersOverTimeWeekly: TimeCount[];
  ordersOverTimeWeeklyByDone: TimeDoneCount[];
  deliveryScheduleWeeks: ScheduleItem[];
  leadTimeHistogram: LeadTimeBin[]; // may arrive as lead_days
  topArticles: NameCount[];
  companyShare90d: NameCount[];
  newVsReturningMonthly: [string, number, number][];
  backlogAgeBuckets: BucketCount[];
  activityHeatmap: HeatCell[];
  exceptions: Exceptions;
};

/* --------------------------------- Utils ---------------------------------- */
const fmt = new Intl.NumberFormat();
const pct = (n: number | null | undefined) =>
  n == null ? "—" : `${(Math.round(n * 10) / 10).toFixed(1)}%`;
const days = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n)}d`;

function normalizeLeadBins(bins?: LeadTimeBin[] | null) {
  if (!Array.isArray(bins)) return [];
  return bins
    .map((b: any) => {
      const leadDays = b.leadDays ?? b.lead_days;
      const count = b.count;
      return leadDays == null || count == null
        ? null
        : { leadDays: Number(leadDays), count: Number(count) };
    })
    .filter(Boolean) as { leadDays: number; count: number }[];
}

/* ------------------------------ Mini Charts ------------------------------- */
const MiniLine: FC<{ data: { x: string; y: number }[]; height?: number }> = ({
  data,
  height = 80,
}) => {
  if (!data.length) return <div style={{ height }} />;
  const pad = 8;
  const w = Math.max(180, data.length * 24);
  const h = height;
  const ys = data.map((d) => d.y);
  const minY = 0;
  const maxY = Math.max(...ys, 1);
  const sx = (i: number) => pad + (i * (w - pad * 2)) / Math.max(data.length - 1, 1);
  const sy = (y: number) => pad + (h - pad * 2) * (1 - (y - minY) / (maxY - minY));
  const dStr = data
    .map((p, i) => `${i ? "L" : "M"} ${sx(i).toFixed(2)} ${sy(p.y).toFixed(2)}`)
    .join(" ");

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img">
      <polyline
        points={`${pad},${h - pad} ${w - pad},${h - pad}`}
        fill="none"
        stroke="#eee"
        strokeWidth={1}
      />
      <path d={dStr} fill="none" stroke="#111" strokeWidth={2} />
      {data.map((p, i) => (
        <circle key={i} cx={sx(i)} cy={sy(p.y)} r={2.5} />
      ))}
    </svg>
  );
};

const MiniBars: FC<{ data: { label: string; value: number }[]; height?: number }> = ({
  data,
  height = 120,
}) => {
  if (!data.length) return <div style={{ height }} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 8, height }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div
            title={`${d.label}: ${fmt.format(d.value)}`}
            style={{
              height: `${(d.value / max) * 100}%`,
              background: "#111",
              borderRadius: 6,
              minHeight: 2,
            }}
          />
          <div style={{ textAlign: "center", fontSize: 10, marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
};

const Heatmap: FC<{ cells: HeatCell[] }> = ({ cells }) => {
  // 7 x 24 grid (0=Sun)
  const map = new Map<string, number>();
  let max = 1;
  cells.forEach((c) => {
    const k = `${c.weekday}-${c.hour}`;
    map.set(k, (map.get(k) || 0) + c.count);
    if ((map.get(k) || 0) > max) max = map.get(k)!;
  });
  const labelDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "40px repeat(24, 1fr)", gap: 4 }}>
      <div />
      {Array.from({ length: 24 }).map((_, h) => (
        <div key={`h${h}`} style={{ textAlign: "center", fontSize: 10 }}>{h}</div>
      ))}
      {Array.from({ length: 7 }).map((_, d) => (
        <React.Fragment key={`r${d}`}>
          <div style={{ fontSize: 12, opacity: 0.7, alignSelf: "center" }}>{labelDay[d]}</div>
          {Array.from({ length: 24 }).map((_, h) => {
            const v = map.get(`${d}-${h}`) || 0;
            const alpha = v === 0 ? 0.06 : 0.15 + 0.85 * (v / max);
            return (
              <div
                key={`${d}-${h}`}
                title={`${labelDay[d]} ${h}:00 → ${v}`}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 4,
                  background: `rgba(17,17,17,${alpha.toFixed(3)})`,
                }}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

/* --------------------------------- UI bits -------------------------------- */
const Card: FC<React.PropsWithChildren<{ title?: string; style?: React.CSSProperties }>> = ({
  title,
  style,
  children,
}) => (
  <section
    style={{
      border: "1px solid #E5E5E5",
      background: "#fff",
      borderRadius: 12,
      padding: 16,
      ...style,
    }}
  >
    {title ? <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>{title}</h3> : null}
    {children}
  </section>
);

const Kpi: FC<{ label: string; value: string | number; hint?: string }> = ({ label, value, hint }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 22 }}>{typeof value === "number" ? fmt.format(value) : value}</div>
    {hint ? <div style={{ fontSize: 12, opacity: 0.6 }}>{hint}</div> : null}
  </div>
);

/* -------------------------------- Dashboard ------------------------------- */
const Dashboard: FC = () => {
  const closeDashboard = useStore((s) => s.closeDashboard);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = (await invoke("get_dashboard_data")) as DashboardData;
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      } catch (e: any) {
        setErr(e?.toString?.() ?? "Failed to load dashboard");
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const weeklySeries = useMemo(
    () => (data?.ordersOverTimeWeekly ?? []).map((d) => ({ x: d.period, y: d.count })),
    [data]
  );

  const leadBins = useMemo(() => normalizeLeadBins(data?.leadTimeHistogram), [data]);

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <button onClick={closeDashboard} aria-label="Close dashboard">✕</button>
        </div>
        <Card style={{ marginTop: 12 }}>
          <p style={{ margin: 0, opacity: 0.7 }}>Loading analytics…</p>
        </Card>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <button onClick={closeDashboard} aria-label="Close dashboard">✕</button>
        </div>
        <Card style={{ marginTop: 12, color: "#B00020" }}>
          <strong>Error:</strong> {err}
        </Card>
      </div>
    );
  }

  const k = data!.kpis;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <button onClick={closeDashboard} aria-label="Close dashboard">✕</button>
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12 }}>
        <Card><Kpi label="Total orders" value={k.totalOrders} /></Card>
        <Card><Kpi label="Open orders" value={k.openOrders} hint={`${fmt.format(k.overdueOpen)} overdue`} /></Card>
        <Card><Kpi label="Due today" value={k.dueToday} hint={`Next 7d: ${fmt.format(k.dueNext7)}`} /></Card>
        <Card><Kpi label="Done last 7d" value={k.done7d} hint={`30d: ${fmt.format(k.done30d)}`} /></Card>
        <Card><Kpi label="Unique clients" value={k.uniqueClients} hint={`Returning: ${pct(k.returningClientsPct)}`} /></Card>
        <Card><Kpi label="Planned lead time" value={days(k.medianLeadDays)} hint={`Avg: ${days(k.avgLeadDays)}`} /></Card>
      </div>

      {/* Trend & mix */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Card title="Orders (weekly)">
          <MiniLine data={weeklySeries} height={120} />
        </Card>

        <Card title="Top delivery company (last 90d)">
          {k.topDeliveryCompany ? (
            <div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>
                <strong>{k.topDeliveryCompany.name}</strong> — {fmt.format(k.topDeliveryCompany.count)} (
                {k.topDeliveryCompany.sharePct.toFixed(1)}%)
              </div>
              <MiniBars
                data={(data?.companyShare90d ?? []).map((c) => ({ label: c.name, value: c.count }))}
                height={140}
              />
            </div>
          ) : (
            <div style={{ opacity: 0.6 }}>No data in the last 90 days.</div>
          )}
        </Card>
      </div>

      {/* Lead time + Top articles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card title="Planned lead time distribution (days)">
          <MiniBars
            data={leadBins.map((b) => ({ label: String(b.leadDays), value: b.count }))}
            height={140}
          />
        </Card>
        <Card title="Top articles">
          <MiniBars
            data={(data?.topArticles ?? []).map((a) => ({ label: a.name, value: a.count }))}
            height={140}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
            City leader: <strong>{k.topCity?.name ?? "—"}</strong>
          </div>
        </Card>
      </div>

      {/* Delivery schedule (next 12 weeks) */}
      <Card title="Delivery schedule (open, next 12 weeks)">
        {(data?.deliveryScheduleWeeks?.length ?? 0) ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Week</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Company</th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>Open</th>
                </tr>
              </thead>
              <tbody>
                {(data?.deliveryScheduleWeeks ?? []).map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: 8 }}>{row.week}</td>
                    <td style={{ padding: 8 }}>{row.company}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{fmt.format(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ opacity: 0.6 }}>No upcoming open deliveries.</div>
        )}
      </Card>

      {/* Activity heatmap */}
      <Card title="Order activity (weekday × hour)">
        <Heatmap cells={data?.activityHeatmap ?? []} />
      </Card>

      {/* Exceptions */}
      <Card title="Overdue (Top 10)">
        {(data?.exceptions?.overdueTop10?.length ?? 0) ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>ID</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Article</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Client</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>City</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Company</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Delivery date</th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>Age (d)</th>
                </tr>
              </thead>
              <tbody>
                {(data?.exceptions?.overdueTop10 ?? []).map((o) => (
                  <tr key={o.id}>
                    <td style={{ padding: 8 }}>{o.id}</td>
                    <td style={{ padding: 8 }}>{o.articleName}</td>
                    <td style={{ padding: 8 }}>{o.clientName}</td>
                    <td style={{ padding: 8 }}>{o.city}</td>
                    <td style={{ padding: 8 }}>{o.deliveryCompany}</td>
                    <td style={{ padding: 8 }}>{o.deliveryDate}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{o.ageDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ opacity: 0.6 }}>No overdue orders 🎉</div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
