// /src/components/OpenedOrders/OpenedOrders.tsx
import { useEffect, type FC } from "react";
import { useStore } from "../../store/store";
import { OpenedBar, OpenedList, OpenedChip, CloseChipBtn } from "./Styles/style";

const OpenedOrders: FC = () => {
  const { opened, fetchOpened, closeFromStack, closeOrderForm } = useStore();

  useEffect(() => {
    fetchOpened(); // fetch once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openContent = (id: number) => {
    // ensure the edit drawer is closed, then focus this order in the stack
    closeOrderForm?.();
    useStore.getState().openInStack(id);
  };

  return (
    <OpenedBar aria-label="Opened orders">
      <OpenedList>
        {opened.map((o) => (
          <OpenedChip
            key={o.orderId}
            title={o.articleName}
            onClick={() => openContent(o.orderId)}     // <-- show content, not form
          >
            <span className="title">{o.articleName}</span>
            <CloseChipBtn
              type="button"
              aria-label={`Close ${o.articleName}`}
              onClick={(e) => {
                e.stopPropagation();
                closeFromStack(o.orderId);
              }}
            >
              ✕
            </CloseChipBtn>
          </OpenedChip>
        ))}
      </OpenedList>
    </OpenedBar>
  );
};

export default OpenedOrders;
