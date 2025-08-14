// src/components/Dashboard/Dashboard.tsx
import type { FC } from "react";
import  { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../../store/store";

import type { DashboardData } from "./types";
import { normalizeLeadBins } from "./utils";
import KpiGrid from "./KpiGrid";
import TrendAndMix from "./TrendAndMix";
import LeadAndTopArticles from "./LeadAndTopArticles";
import DeliverySchedule from "./DeliverySchedule";
import ActivityHeatmap from "./ActivityHeatmap";
import ExceptionsTable from "./ExceptionsTable";
import { Card } from "./ui";
import { FlexRow, H2, IconButton } from "./Styles/style";

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
      <div >
        <Header onClose={closeDashboard} />
        <Card >
          <p >Loading analytics…</p>
        </Card>
      </div>
    );
  }

  if (err) {
    return (
      <div >
        <Header onClose={closeDashboard} />
        <Card >
          <strong>Error:</strong> {err}
        </Card>
      </div>
    );
  }

  return (
    <div >
      <Header onClose={closeDashboard} />
      <KpiGrid k={data!.kpis} />
      <TrendAndMix
        kpis={data!.kpis}
        weeklySeries={weeklySeries}
        companyShare90d={data!.companyShare90d}
      />
      <LeadAndTopArticles
        leadBins={leadBins}
        topArticles={data!.topArticles}
        topCity={data!.kpis.topCity}
      />
      <DeliverySchedule schedule={data!.deliveryScheduleWeeks} />
      <ActivityHeatmap cells={data!.activityHeatmap} />
      <ExceptionsTable exceptions={data!.exceptions} />
    </div>
  );
};

const Header: FC<{ onClose: () => void }> = ({ onClose }) => (
  <FlexRow $justify="space-between" $align="center">
    <H2>Dashboard</H2>
    <IconButton onClick={onClose} aria-label="Close dashboard">✕</IconButton>
  </FlexRow>
);

export default Dashboard;