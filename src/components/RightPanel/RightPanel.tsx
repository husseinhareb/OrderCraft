// /src/components/RightPanel/RightPanel.tsx
import type { FC } from "react";
import { Container } from "./Styles/style";
import OrderForm from "../OrderForm/OrderForm";

const RightPanel: FC = () => {
  return (
    <Container className="right-panel">
      {/* Your normal right-side content goes here */}

      {/* The form slides in from the right when opened */}
      <OrderForm />
    </Container>
  );
};

export default RightPanel;
