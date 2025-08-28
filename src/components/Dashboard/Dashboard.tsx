// src/components/Dashboard/Dashboard.tsx
import type { FC } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../../store/store";

import type { DashboardData, NameCount } from "./types";
import { normalizeLeadBins } from "./utils";
import KpiGrid from "./KpiGrid";
import TrendAndMix from "./TrendAndMix";
import DeliverySchedule from "./DeliverySchedule";
import ActivityHeatmap from "./ActivityHeatmap";
import ExceptionsTable from "./ExceptionsTable";
import TopDeliveryCompaniesCard from "./TopDeliveryCompaniesCard";
import { Card, MiniBars } from "./ui";
import { FlexRow, H2, IconButton, Grid, FinePrint } from "./Styles/style";

const Dashboard: FC = () => {
  const closeDashboard = useStore((s) => s.closeDashboard);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await invoke<DashboardData>("get_dashboard_data");
      setData(res);
    } catch (e: any) {
      setData(null);
      setErr(e?.toString?.() ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weeklySeries = useMemo(
    () =>
      (data?.ordersOverTimeWeekly ?? []).map((d) => ({
        x: d.period,
        y: d.count,
      })),
    [data]
  );

  const leadBins = useMemo(
    () => normalizeLeadBins(data?.leadTimeHistogram),
    [data]
  );

  // lifetime company share (falls back safely if backend hasn't exposed it yet)
  const companyShareLifetime: NameCount[] = useMemo(() => {
    const raw =
      (data as any)?.companyShareLifetime ?? data?.companyShare90d ?? [];
    return Array.isArray(raw) ? (raw as NameCount[]) : [];
  }, [data]);

  return (
    <div style={{ margin: "10px" }}>
      <Header onClose={closeDashboard} />

      {loading && (
        <Card>
          <p aria-live="polite">Loading analytics…</p>
        </Card>
      )}

      {!loading && err && (
        <Card>
          <p>
            <strong>Error:</strong> {err}
          </p>
          <IconButton onClick={fetchData} aria-label="Retry loading dashboard">
            ↻
          </IconButton>
        </Card>
      )}

      {!loading && !err && data && (
        <>
          {/* KPIs */}
          <KpiGrid k={data.kpis} />

          {/* Row: Orders trend + Top delivery (last 90d) */}
          <TrendAndMix
            kpis={data.kpis}
            weeklySeries={weeklySeries}
            companyShare90d={data.companyShare90d}
          />

          {/* Row: Top delivery (lifetime) + Top articles */}
          <Grid $cols={2} $gap={12}>
            <TopDeliveryCompaniesCard
              title="Top delivery company (lifetime)"
              companies={companyShareLifetime}
            />

            <Card title="Top articles">
              <MiniBars
                data={(data.topArticles ?? []).map((a) => ({
                  label: a.name,
                  value: a.count,
                }))}
                height={140}
                scroll
                minColPx={32}
              />
              <FinePrint>
                City leader: <strong>{data.kpis.topCity?.name ?? "—"}</strong>
              </FinePrint>
            </Card>
          </Grid>

          {/* Row: Planned lead time distribution (full width) */}
          <Grid $cols={1} $gap={12}>
            <Card title="Planned lead time distribution (days)">
              <MiniBars
                data={leadBins.map((b) => ({
                  label: String(b.leadDays),
                  value: b.count,
                }))}
                height={140}
                scroll
                minColPx={28}
              />
            </Card>
          </Grid>

          {/* Rest */}
          <DeliverySchedule schedule={data.deliveryScheduleWeeks} />
          <ActivityHeatmap cells={data.activityHeatmap} />
          <ExceptionsTable exceptions={data.exceptions} />
        </>
      )}
    </div>
  );
};

const Header: FC<{ onClose: () => void }> = ({ onClose }) => (
  <FlexRow $justify="space-between" $align="center">
    <H2>Dashboard</H2>
    <IconButton onClick={onClose} aria-label="Close dashboard">
      ✕
    </IconButton>
  </FlexRow>
);

export default Dashboard;
