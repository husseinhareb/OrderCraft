// src/components/Dashboard/LeadAndTopArticles.tsx
import type { FC } from "react";
import { Card, MiniBars } from "./ui";
import type { NameCount } from "./types";
import { Grid, FinePrint } from "./Styles/style";

const LeadAndTopArticles: FC<{
  leadBins: { leadDays: number; count: number }[];
  topArticles: NameCount[];
  topCity: NameCount | null;
}> = ({ leadBins, topArticles, topCity }) => (
  <Grid $cols={2} $gap={12}>
    <Card title="Planned lead time distribution (days)">
      <MiniBars
        data={leadBins.map((b) => ({ label: String(b.leadDays), value: b.count }))}
        height={140}
        scroll                    // ✅ enables horizontal scrolling
        minColPx={28}             // tweak if you want wider bars/labels
      />
    </Card>
    <Card title="Top articles">
      <MiniBars
        data={(topArticles ?? []).map((a) => ({ label: a.name, value: a.count }))}
        height={140}
      />
      <FinePrint>
        City leader: <strong>{topCity?.name ?? "—"}</strong>
      </FinePrint>
    </Card>
  </Grid>
);

export default LeadAndTopArticles;
