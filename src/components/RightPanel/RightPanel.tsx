import { type FC, lazy, Suspense } from "react";
import { Container } from "./Styles/style";
import OrderForm from "../OrderForm/OrderForm";
import OpenedOrders from "../OpenedOrders/OpenedOrders";
import OrderContent from "../OrderContent/OrderContent";
import Dashboard from "../Dashboard/Dashboard";
import { useStore } from "../../store/store";

const Settings = lazy(() => import("../Settings/Settings"));

const RightPanel: FC = () => {
  const showDashboard = useStore((s) => s.showDashboard);
  const showSettings = useStore((s) => s.showSettings);

  return (
    <Container className="right-panel">
      {showDashboard ? (
        <Dashboard />
      ) : showSettings ? (
        <Suspense fallback={<div style={{ padding: 12 }}>Loading settings…</div>}>
          <Settings />
        </Suspense>
      ) : (
        <>
          <OrderForm />
          <OpenedOrders />
          <OrderContent />
        </>
      )}
    </Container>
  );
};

export default RightPanel;
