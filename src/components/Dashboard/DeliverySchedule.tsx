// src/components/Dashboard/DeliverySchedule.tsx
import type { FC } from "react";
import { Card } from "./ui";
import type { ScheduleItem } from "./types";
import { fmt } from "./utils";

const DeliverySchedule: FC<{ schedule: ScheduleItem[] }> = ({ schedule }) => (
  <Card title="Delivery schedule (open, next 12 weeks)">
    {(schedule?.length ?? 0) ? (
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
            {(schedule ?? []).map((row, i) => (
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
);

export default DeliverySchedule;
