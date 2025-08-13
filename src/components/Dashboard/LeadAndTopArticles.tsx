// src/components/Dashboard/LeadAndTopArticles.tsx
import type { FC } from "react";
import { Card, MiniBars } from "./ui";
import type { NameCount } from "./types";

const LeadAndTopArticles: FC<{
  leadBins: { leadDays: number; count: number }[];
  topArticles: NameCount[];
  topCity: NameCount | null;
}> = ({ leadBins, topArticles, topCity }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
    <Card title="Planned lead time distribution (days)">
      <MiniBars
        data={leadBins.map((b) => ({ label: String(b.leadDays), value: b.count }))}
        height={140}
      />
    </Card>
    <Card title="Top articles">
      <MiniBars
        data={(topArticles ?? []).map((a) => ({ label: a.name, value: a.count }))}
        height={140}
      />
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
        City leader: <strong>{topCity?.name ?? "—"}</strong>
      </div>
    </Card>
  </div>
);

export default LeadAndTopArticles;
