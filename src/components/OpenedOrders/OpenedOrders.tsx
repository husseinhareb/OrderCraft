// /src/components/OpenedOrders/OpenedOrders.tsx
import { useEffect, useRef, type FC } from "react";
import { useStore } from "../../store/store";
import {
  OpenedBar,
  OpenedList,
  OpenedChip,
  CloseChipBtn,
} from "./Styles/style";

const OpenedOrders: FC = () => {
  const { opened, fetchOpened, closeFromStack, closeOrderForm } = useStore();
  const activeOrderId = useStore((s) => s.activeOrderId);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOpened(); // fetch once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Convert vertical mouse wheel to horizontal scroll (VS Code-like)
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollWidth <= el.clientWidth) return;
    const delta =
      Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta !== 0) {
      el.scrollLeft += delta;
      e.preventDefault();
    }
  };

  const openContent = (id: number) => {
    closeOrderForm?.();
    const state = useStore.getState();

    // Focus the order (without reordering)
    if (typeof (state as any).focusInStack === "function") {
      (state as any).focusInStack(id);
    } else if (typeof (state as any).setActiveOrderId === "function") {
      (state as any).setActiveOrderId(id);
    }

    // Append only if it's not already in the opened stack
    const exists = state.opened.some((x) => x.orderId === id);
    if (!exists) {
      state.openInStack(id);
    }

    // Ensure the chip is visible (no smooth animation to avoid flicker)
    requestAnimationFrame(() => {
      const chip = listRef.current?.querySelector<HTMLButtonElement>(
        `button[data-order-id="${id}"]`
      );
      chip?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };

  return (
    <OpenedBar aria-label="Opened orders">
      <OpenedList ref={listRef} onWheel={onWheel}>
        {opened.map((o) => {
          const isActive = o.orderId === activeOrderId;
          return (
            <OpenedChip
              key={o.orderId}
              data-order-id={o.orderId}
              data-active={isActive ? "true" : undefined}
              aria-current={isActive ? "page" : undefined}
              title={o.articleName}
              onClick={() => openContent(o.orderId)}
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
          );
        })}
      </OpenedList>
    </OpenedBar>
  );
};

export default OpenedOrders;
