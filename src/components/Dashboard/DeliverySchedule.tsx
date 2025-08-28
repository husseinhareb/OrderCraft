// src/components/Dashboard/DeliverySchedule.tsx
import type { FC } from "react";
import { Card } from "./ui";
import type { ScheduleItem } from "./types";
import { fmt } from "./utils";
import { Muted, ScrollX, TD, TH, Table } from "./Styles/style";

const DeliverySchedule: FC<{ schedule: ScheduleItem[] }> = ({ schedule }) => (
  <Card title="Delivery schedule (open, next 12 weeks)">
    {schedule?.length ?? 0 ? (
      <ScrollX>
        <Table>
          <thead>
            <tr>
              <TH>Week</TH>
              <TH>Company</TH>
              <TH>Open</TH>
            </tr>
          </thead>
          <tbody>
            {(schedule ?? []).map((row, i) => (
              <tr key={i}>
                <TD>{row.week}</TD>
                <TD>{row.company}</TD>
                <TD>{fmt.format(row.count)}</TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </ScrollX>
    ) : (
      <Muted>No upcoming open deliveries.</Muted>
    )}
  </Card>
);

export default DeliverySchedule;
