// /src/components/LeftPanel/LeftPanel.tsx
import { useEffect, type FC } from "react";
import {
  Container,
  Overlay,
  PlusButton,
  OrdersList,
  OrderItem,
  EmptyMsg,
  ErrorMsg,
  Row,
  RowTitle,
  RowActions,
  IconButton,
  CheckOrder,
} from "./Styles/style";
import { useStore } from "../../store/store";

type LeftPanelProps = { open: boolean; onClose: () => void };

const LeftPanel: FC<LeftPanelProps> = ({ open, onClose }) => {
  const {
    orders,
    loading,
    error,
    fetchOrders,
    openOrderForm,
    openOrderFormForEdit,
    deleteOrder,
    setOrderDone,
  } = useStore();

  // Load once on mount
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm("Delete this order?")) {
      await deleteOrder(id);
    }
  };

  const handleDoneToggle = async (id: number, next: boolean) => {
    await setOrderDone(id, next);

    // Celebrate only when marking as done
    if (next) {
      try {
        const { default: confetti } = await import("canvas-confetti");
        confetti({
          particleCount: 440,
          spread: 110,
          startVelocity: 50,
          gravity: 0.9,
          decay: 0.9,
          scalar: 1.0,
          // center-ish from lower area of the viewport
          origin: { x: 0.5, y: 0.8 },
          // optional: custom colors/shapes
          // colors: ["#16a34a", "#f59e0b", "#3b82f6", "#ef4444"],
          // shapes: ["square", "circle"],
          zIndex: 1200,
        });
      } catch {
        // If the package isn't available for some reason, just ignore
      }
    }
  };

  return (
    <>
      <Container id="left-menu" className="left-panel" $open={open}>
        <OrdersList>
          {loading && <li>Loading…</li>}
          {error && <ErrorMsg role="alert">{error}</ErrorMsg>}
          {!loading && !error && orders.length === 0 && (
            <EmptyMsg>No orders yet</EmptyMsg>
          )}

          {orders.map((o) => (
            <OrderItem
              key={o.id}
              title={o.articleName}
              data-done={o.done ? "true" : "false"}
            >
              <Row>
                <CheckOrder
                  checked={o.done}
                  onChange={(e) => handleDoneToggle(o.id, e.target.checked)}
                  aria-label={o.done ? "Mark as not done" : "Mark as done"}
                />
                <RowTitle>{o.articleName}</RowTitle>
                <RowActions>
                  <IconButton
                    type="button"
                    onClick={() => openOrderFormForEdit(o.id)}
                    aria-label="Edit order"
                  >
                    Edit
                  </IconButton>
                  <IconButton
                    type="button"
                    data-variant="danger"
                    onClick={() => handleDelete(o.id)}
                    aria-label="Delete order"
                  >
                    Delete
                  </IconButton>
                </RowActions>
              </Row>
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
