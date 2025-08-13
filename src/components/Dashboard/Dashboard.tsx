import type { FC } from "react";
import { useStore } from "../../store/store";

const Dashboard: FC = () => {
  const closeDashboard = useStore((s) => s.closeDashboard);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <button onClick={closeDashboard} aria-label="Close dashboard">✕</button>
      </div>

      {/* Drop your charts here */}
      <div
        style={{
          marginTop: 12,
          border: "1px solid #000",
          borderRadius: 12,
          padding: 16,
          minHeight: 240,
          background: "#fff",
        }}
      >
        <p style={{ margin: 0, opacity: 0.7 }}>
          Charts go here. Hook up your data and favorite chart lib when ready.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
