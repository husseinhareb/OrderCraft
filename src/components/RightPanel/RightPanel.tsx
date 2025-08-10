// /src/components/RightPanel/RightPanel.tsx
import type { FC } from "react";
import { Container } from "./Styles/style";
import OrderForm from "../OrderForm/OrderForm";
import OpenedOrders from "../OpenedOrders/OpenedOrders";
import OrderContent from "../OrderContent/OrderContent";

const RightPanel: FC = () => {
  return (
    <Container className="right-panel">
      <OrderForm />
      <OpenedOrders />
      <OrderContent />
    </Container>
  );
};

export default RightPanel;
