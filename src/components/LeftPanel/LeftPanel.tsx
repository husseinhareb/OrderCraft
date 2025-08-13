// /src/components/LeftPanel/LeftPanel.tsx
import { useEffect, useState, lazy, Suspense, type FC } from "react";
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
  SettingsButton,
  CheckContainer,
  CheckOrder,
  CheckLabel,
  SettingsOverlay,
  SettingsModal,
  SettingsHeader,
  SettingsTitle,
  CloseBtn,
} from "./Styles/style";
import { useStore } from "../../store/store";

// Lazy-load the settings component. Path: /src/components/Settings/Settings.tsx
const Settings = lazy(() => import("../Settings/Settings"));

type LeftPanelProps = { open: boolean; onClose: () => void };

// ----------------------------------------------------------

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
    closeOrderForm,
  } = useStore();

  // Show/hide Settings modal
  const [showSettings, setShowSettings] = useState(false);

  // initial data
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep layout var in sync with open/close
  useEffect(() => {
    const root = document.documentElement;
    const openWidth = "min(360px, 80vw)";
    const closedWidth = "var(--left-closed-width, 0px)";
    root.style.setProperty("--left-panel-width", open ? openWidth : closedWidth);
    return () => {
      root.style.setProperty("--left-panel-width", closedWidth);
    };
  }, [open]);

  const openContent = (id: number) => {
    closeOrderForm?.();
    useStore.getState().openInStack(id);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this order?")) {
      await deleteOrder(id);
    }
  };

  const handleDoneToggle = async (id: number, next: boolean) => {
    await setOrderDone(id, next);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (next && !prefersReducedMotion) {
      try {
        const { default: confetti } = await import("canvas-confetti");
        confetti({
          particleCount: 840,
          spread: 210,
          startVelocity: 50,
          gravity: 0.9,
          decay: 0.9,
          scalar: 1.0,
          origin: { x: 0.5, y: 0.5 },
          zIndex: 1200,
        });
      } catch {
        // ignore
      }
    }
  };

  const handleOpenSettings = () => {
    closeOrderForm?.();
    setShowSettings(true);
  };
  const handleCloseSettings = () => setShowSettings(false);

  const settingsTitleId = "settings-title";

  return (
    <>
      <Container id="left-menu" className="left-panel" $open={open}>
        {/* Header with Settings button */}
        <SettingsButton
          type="button"
          onClick={handleOpenSettings}
          aria-label="Open settings"
          title="Settings"
        >
          ⚙︎
        </SettingsButton>

        <OrdersList>
          {loading && <li>Loading…</li>}
          {error && <ErrorMsg role="alert">{error}</ErrorMsg>}
          {!loading && !error && orders.length === 0 && <EmptyMsg>No orders yet</EmptyMsg>}

          {orders.map((o) => {
            const cid = `order-check-${o.id}`;
            return (
              <OrderItem
                key={o.id}
                title={o.articleName}
                data-done={o.done ? "true" : "false"}
                onClick={() => openContent(o.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    openContent(o.id);
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === " " || e.key === "Spacebar") {
                    e.preventDefault();
                    openContent(o.id);
                  }
                }}
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
                      <svg width="43" height="43" viewBox="0 0 90 90" aria-hidden="true">
                        <rect x="30" y="20" width="50" height="50" stroke="black" fill="none" />
                        <g transform="translate(0,-952.36218)">
                          <path
                            d="m 13,983 c 33,6 40,26 55,48 "
                            stroke="black"
                            strokeWidth="3"
                            className="path1"
                            fill="none"
                          />
                          <path
                            d="M 75,970 C 51,981 34,1014 25,1031 "
                            stroke="black"
                            strokeWidth="3"
                            className="path1"
                            fill="none"
                          />
                        </g>
                      </svg>
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

        <PlusButton type="button" aria-label="Add order" title="Add order" onClick={openOrderForm}>
          +
        </PlusButton>
      </Container>

      {/* Overlay that closes the left panel */}
      <Overlay $open={open} onClick={onClose} aria-hidden={!open} />

      {/* SETTINGS MODAL (styled-components) */}
      {showSettings && (
        <>
          <SettingsOverlay onClick={handleCloseSettings} aria-hidden="true" />
          <SettingsModal
            role="dialog"
            aria-modal="true"
            aria-labelledby={settingsTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <SettingsHeader>
              <SettingsTitle id={settingsTitleId}>Settings</SettingsTitle>
              <CloseBtn
                type="button"
                onClick={handleCloseSettings}
                aria-label="Close settings"
                title="Close"
              >
                ✕
              </CloseBtn>
            </SettingsHeader>

            <Suspense fallback={<div style={{ padding: 12 }}>Loading settings…</div>}>
              <Settings />
            </Suspense>
          </SettingsModal>
        </>
      )}
    </>
  );
};

export default LeftPanel;
