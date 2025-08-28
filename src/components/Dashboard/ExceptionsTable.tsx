// src/components/Dashboard/ExceptionsTable.tsx
import type { FC } from "react";
import { Card } from "./ui";
import type { Exceptions } from "./types";
import { Muted, ScrollX, TD, TH, Table } from "./Styles/style";

const ExceptionsTable: FC<{ exceptions: Exceptions | null | undefined }> = ({
  exceptions,
}) => {
  const rows = exceptions?.overdueTop10 ?? [];
  return (
    <Card title="Overdue (Top 10)">
      {rows.length ? (
        <ScrollX>
          <Table>
            <thead>
              <tr>
                <TH>ID</TH>
                <TH>Article</TH>
                <TH>Client</TH>
                <TH>City</TH>
                <TH>Company</TH>
                <TH>Delivery date</TH>
                <TH>Age (d)</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <TD>{o.id}</TD>
                  <TD>{o.articleName}</TD>
                  <TD>{o.clientName}</TD>
                  <TD>{o.city}</TD>
                  <TD>{o.deliveryCompany}</TD>
                  <TD>{o.deliveryDate}</TD>
                  <TD>{o.ageDays}</TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </ScrollX>
      ) : (
        <Muted>No overdue orders 🎉</Muted>
      )}
    </Card>
  );
};

export default ExceptionsTable;
