// src/components/Dashboard/ActivityHeatmap.tsx
import type { FC } from "react";
import { Card, Heatmap } from "./ui";
import type { HeatCell } from "./types";

const ActivityHeatmap: FC<{ cells: HeatCell[] }> = ({ cells }) => (
  <Card title="Order activity (weekday × hour)">
    <Heatmap cells={cells ?? []} />
  </Card>
);

export default ActivityHeatmap;
