import type { FC } from "react";
import { Card, MiniBars } from "./ui";
import type { NameCount } from "./types";

const pct = (num: number, den: number) =>
  den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "0%";

const TopDeliveryCompaniesCard: FC<{
  title?: string;
  companies: NameCount[]; // [{ name, count }]
}> = ({ title = "Top delivery company", companies }) => {
  const total = companies.reduce((s, c) => s + c.count, 0);
  const top = companies[0];

  return (
    <Card title={title}>
      {top ? (
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          {top.name} — {top.count} ({pct(top.count, total)})
        </div>
      ) : (
        <div style={{ opacity: 0.6, marginBottom: 8 }}>No data</div>
      )}

      <MiniBars
        data={companies.map((c) => ({ label: c.name, value: c.count }))}
        height={140}
        /* auto-fits when it can, scrolls when it can't (same behavior as Top articles) */
        scroll
        minColPx={32}
      />
    </Card>
  );
};

export default TopDeliveryCompaniesCard;
