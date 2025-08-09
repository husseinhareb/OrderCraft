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
  CheckContainer,
  CheckOrder,
  CheckLabel,
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
          origin: { x: 0.5, y: 0.8 },
          zIndex: 1200,
        });
      } catch {
        // ignore if package missing
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

          {orders.map((o) => {
            const cid = `order-check-${o.id}`;
            return (
              <OrderItem
                key={o.id}
                title={o.articleName}
                data-done={o.done ? "true" : "false"}
                onClick={() => useStore.getState().openInStack(o.id)} // open in stack
              >
                <Row>
                  <CheckContainer onClick={(e) => e.stopPropagation()}>
                    <CheckOrder
                      id={cid}
                      checked={o.done}
                      onChange={(e) => handleDoneToggle(o.id, e.target.checked)}
                      aria-label={o.done ? "Mark as not done" : "Mark as done"}
                    />
                    <CheckLabel htmlFor={cid}>
                      {/* svg as before */}
                    </CheckLabel>
                  </CheckContainer>

                  <RowTitle>{o.articleName}</RowTitle>

                  <RowActions onClick={(e) => e.stopPropagation()}>
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
            );
          })}
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
