// /src/components/RightPanel/RightPanel.tsx
import type { FC } from "react";
import { Container } from "./Styles/style";
import OrderForm from "../OrderForm/OrderForm";
import OpenedOrders from "../OpenedOrders/OpenedOrders";
// import OpenedOrders from "../OpenedOrders/OpenedOrders"; // if used elsewhere, keep it

const RightPanel: FC = () => {
  return (
    <Container className="right-panel">
        <OrderForm />
        <OpenedOrders />
    </Container>
  );
};

export default RightPanel;
