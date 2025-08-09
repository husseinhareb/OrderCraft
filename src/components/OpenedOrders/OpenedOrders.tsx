import type { FC } from "react";
import { useStore } from "../../store/store";
import { OpenedBar, OpenedList, OpenedChip, CloseChipBtn } from "./Styles/style";

const OpenedOrders: FC = () => {
  const { opened, fetchOpened, closeFromStack } = useStore();
  const openOrderFormForEdit = useStore((s) => s.openOrderFormForEdit);

  // Ensure list is loaded (in case not fetched yet)
  // You can also move this to App/RightPanel if you prefer
  // React 18 strict mounts twice in dev; harmless
  // eslint-disable-next-line react-hooks/exhaustive-deps
  if (!opened.length) fetchOpened();

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
