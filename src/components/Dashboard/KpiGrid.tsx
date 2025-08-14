// src/components/Dashboard/KpiGrid.tsx
import type { FC } from "react";
import { Card, Kpi } from "./ui";
import { days, fmt, pct } from "./utils";
import type { Kpis } from "./types";
import { Grid } from "./Styles/style";

const KpiGrid: FC<{ k: Kpis }> = ({ k }) => (
  <Grid $cols={6} $gap={12}>
    <Card><Kpi label="Total orders" value={k.totalOrders} /></Card>
    <Card><Kpi label="Open orders" value={k.openOrders} hint={`${fmt.format(k.overdueOpen)} overdue`} /></Card>
    <Card><Kpi label="Due today" value={k.dueToday} hint={`Next 7d: ${fmt.format(k.dueNext7)}`} /></Card>
    <Card><Kpi label="Done last 7d" value={k.done7d} hint={`30d: ${fmt.format(k.done30d)}`} /></Card>
    <Card><Kpi label="Unique clients" value={k.uniqueClients} hint={`Returning: ${pct(k.returningClientsPct)}`} /></Card>
    <Card><Kpi label="Planned lead time" value={days(k.medianLeadDays)} hint={`Avg: ${days(k.avgLeadDays)}`} /></Card>
  </Grid>
);

export default KpiGrid;