// src/components/Dashboard/TrendAndMix.tsx
import type { FC } from "react";
import { Card, MiniBars, MiniLine } from "./ui";
import type { Kpis, NameCount } from "./types";
import { fmt } from "./utils";

const TrendAndMix: FC<{
  kpis: Kpis;
  weeklySeries: { x: string; y: number }[];
  companyShare90d: NameCount[];
}> = ({ kpis, weeklySeries, companyShare90d }) => (
  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
    <Card title="Orders (weekly)">
  {weeklySeries.length >= 2 ? (
    <MiniLine data={weeklySeries} height={120} />
  ) : (
    <MiniBars
      data={weeklySeries.map(p => ({ label: p.x, value: p.y }))}
      height={120}
    />
  )}
</Card>

    <Card title="Top delivery company (last 90d)">
      {kpis.topDeliveryCompany ? (
        <div>
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            <strong>{kpis.topDeliveryCompany.name}</strong> — {fmt.format(kpis.topDeliveryCompany.count)} (
            {kpis.topDeliveryCompany.sharePct.toFixed(1)}%)
          </div>
          <MiniBars
            data={(companyShare90d ?? []).map((c) => ({ label: c.name, value: c.count }))}
            height={140}
          />
        </div>
      ) : (
        <div style={{ opacity: 0.6 }}>No data in the last 90 days.</div>
      )}
    </Card>
  </div>
);

export default TrendAndMix;
