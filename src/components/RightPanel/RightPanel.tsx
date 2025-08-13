import type { FC } from "react";
import { Container } from "./Styles/style";
import OrderForm from "../OrderForm/OrderForm";
import OpenedOrders from "../OpenedOrders/OpenedOrders";
import OrderContent from "../OrderContent/OrderContent";
import { useStore } from "../../store/store";
import Dashboard from "../Dashboard/Dashboard";

const RightPanel: FC = () => {
  const showDashboard = useStore((s) => s.showDashboard);

  return (
    <Container className="right-panel">
      <OrderForm />
      {showDashboard ? (
        <Dashboard />
      ) : (
        <>
          <OpenedOrders />
          <OrderContent />
        </>
      )}
    </Container>
  );
};

export default RightPanel;
