// /src/components/LeftPanel/LeftPanel.tsx
import { useEffect, type FC } from "react";
import {
  Container, Overlay, PlusButton, OrdersList, OrderItem,
  EmptyMsg, ErrorMsg, Row, RowTitle, RowActions, IconButton
} from "./Styles/style";
import { useStore } from "../../store/store";

type LeftPanelProps = { open: boolean; onClose: () => void };

const LeftPanel: FC<LeftPanelProps> = ({ open, onClose }) => {
  const { orders, loading, error, fetchOrders, openOrderForm, openOrderFormForEdit, deleteOrder } = useStore();

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleDelete = async (id: number) => {
    if (confirm("Delete this order?")) await deleteOrder(id);
  };

  return (
    <>
      <Container id="left-menu" className="left-panel" $open={open}>
        <OrdersList>
          {loading && <li>Loading…</li>}
          {error && <ErrorMsg role="alert">{error}</ErrorMsg>}
          {!loading && !error && orders.length === 0 && <EmptyMsg>No orders yet</EmptyMsg>}

          {orders.map((o) => (
            <OrderItem key={o.id} title={o.articleName}>
              <Row>
                <RowTitle>{o.articleName}</RowTitle>
                <RowActions>
                  <IconButton type="button" onClick={() => openOrderFormForEdit(o.id)} aria-label="Edit order">Edit</IconButton>
                  <IconButton type="button" data-variant="danger" onClick={() => handleDelete(o.id)} aria-label="Delete order">Delete</IconButton>
                </RowActions>
              </Row>
            </OrderItem>
          ))}
        </OrdersList>

        <PlusButton type="button" aria-label="Add order" title="Add order" onClick={openOrderForm}>+</PlusButton>
      </Container>

      <Overlay $open={open} onClick={onClose} aria-hidden={!open} />
    </>
  );
};

export default LeftPanel;
