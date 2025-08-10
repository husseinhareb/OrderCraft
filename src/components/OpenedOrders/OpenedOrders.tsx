import { useEffect, type FC } from "react";
import { useStore } from "../../store/store";
import { OpenedBar, OpenedList, OpenedChip, CloseChipBtn } from "./Styles/style";

const OpenedOrders: FC = () => {
  const { opened, fetchOpened, closeFromStack } = useStore();
  const openOrderFormForEdit = useStore((s) => s.openOrderFormForEdit);


    useEffect(() => {
    if (!opened.length) fetchOpened();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened.length]);
  return (
    <OpenedBar aria-label="Opened orders">
      <OpenedList>
        {opened.map((o) => (
          <OpenedChip key={o.orderId} title={o.articleName} onClick={() => openOrderFormForEdit(o.orderId)}>
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
