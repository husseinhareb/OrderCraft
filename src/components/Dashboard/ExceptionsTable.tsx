// src/components/Dashboard/ExceptionsTable.tsx
import type { FC } from "react";
import { Card } from "./ui";
import type { Exceptions } from "./types";

const ExceptionsTable: FC<{ exceptions: Exceptions | null | undefined }> = ({ exceptions }) => {
  const rows = exceptions?.overdueTop10 ?? [];
  return (
    <Card title="Overdue (Top 10)">
      {rows.length ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>ID</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Article</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Client</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>City</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Company</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Delivery date</th>
                <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>Age (d)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td style={{ padding: 8 }}>{o.id}</td>
                  <td style={{ padding: 8 }}>{o.articleName}</td>
                  <td style={{ padding: 8 }}>{o.clientName}</td>
                  <td style={{ padding: 8 }}>{o.city}</td>
                  <td style={{ padding: 8 }}>{o.deliveryCompany}</td>
                  <td style={{ padding: 8 }}>{o.deliveryDate}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{o.ageDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ opacity: 0.6 }}>No overdue orders 🎉</div>
      )}
    </Card>
  );
};

export default ExceptionsTable;
