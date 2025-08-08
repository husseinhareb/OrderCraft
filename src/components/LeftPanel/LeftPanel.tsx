// /src/components/LeftPanel/LeftPanel.tsx
import { useEffect, type FC } from "react";
import { Container, Overlay, PlusButton, OrdersList, OrderItem, EmptyMsg, ErrorMsg } from "./Styles/style";
import { useStore } from "../../store/store";

type LeftPanelProps = {
  open: boolean;
  onClose: () => void;
};

const LeftPanel: FC<LeftPanelProps> = ({ open, onClose }) => {
  const openOrderForm = useStore((s) => s.openOrderForm);
  const { orders, loading, error, fetchOrders } = useStore();

  useEffect(() => {
    // Load orders on mount; call again when panel is opened if you want
    fetchOrders();
  }, [fetchOrders]);

  return (
    <>
      <Container id="left-menu" className="left-panel" $open={open}>
        {/* Orders list (show article names only) */}
        <OrdersList>
          {loading && <li>Loading…</li>}
          {error && <ErrorMsg role="alert">{error}</ErrorMsg>}
          {!loading && !error && orders.length === 0 && <EmptyMsg>No orders yet</EmptyMsg>}
          {orders.map((o) => (
            <OrderItem key={o.id} title={o.articleName}>
              {o.articleName}
            </OrderItem>
          ))}
        </OrdersList>

        <PlusButton
          type="button"
          aria-label="Add order"
          title="Add order"
          onClick={openOrderForm}
        >
          +
        </PlusButton>
      </Container>

      <Overlay $open={open} onClick={onClose} aria-hidden={!open} />
    </>
  );
};

export default LeftPanel;
