// /src/components/LeftPanel/LeftPanel.tsx
import { useEffect, useCallback, useState, type FC } from "react";
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
  ChartButton,
} from "./Styles/style";
import { useStore } from "../../store/store";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faGear, faPlus } from "@fortawesome/free-solid-svg-icons";
import { invoke } from "@tauri-apps/api/core";

type LeftPanelProps = { open: boolean; onClose: () => void };

// small helper to read a single setting
async function getSetting(key: string) {
  try {
    return (await invoke<string | null>("get_setting", { key })) ?? null;
  } catch {
    return null;
  }
}

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

  // current theme from Zustand: "light" | "dark" | "custom"
  const theme = useStore((s) => s.theme) as "light" | "dark" | "custom";

  // settings + palette
  const [confettiEnabled, setConfettiEnabled] = useState(true);
  const [confettiPalette, setConfettiPalette] = useState<string[] | null>(null);

  // initial data
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep layout var in sync with open/close (client-only)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const openWidth = "min(360px, 80vw)";
    const closedWidth = "var(--left-closed-width, 0px)";
    root.style.setProperty("--left-panel-width", open ? openWidth : closedWidth);
    return () => {
      root.style.setProperty("--left-panel-width", closedWidth);
    };
  }, [open]);

  // load user setting (confettiOnDone) once
  useEffect(() => {
    (async () => {
      const v = await getSetting("confettiOnDone");
      setConfettiEnabled((v ?? "true") !== "false");
    })();
  }, []);

  // fetch effective confetti palette whenever theme changes
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // ask backend for the computed palette (handles custom vs light/dark)
        const colors = await invoke<string[]>("get_confetti_palette");
        if (!alive) return;
        if (Array.isArray(colors) && colors.length > 0) {
          setConfettiPalette(colors);
          return;
        }
      } catch {
        // fall through to theme-based default
      }
      if (!alive) return;
      setConfettiPalette(theme === "dark" ? ["#ffffff"] : ["#000000"]);
    })();
    return () => {
      alive = false;
    };
  }, [theme]);

  const openContent = useCallback((id: number) => {
    closeOrderForm?.();
    const { closeDashboard, closeSettings, openInStack } = useStore.getState();
    closeDashboard?.(); // ensure right panel exits dashboard mode
    closeSettings?.();  // ensure right panel exits settings mode
    openInStack(id);
  }, [closeOrderForm]);

  const handleDelete = useCallback(async (id: number) => {
    if (confirm("Delete this order?")) {
      await deleteOrder(id);
    }
  }, [deleteOrder]);

  const handleDoneToggle = useCallback(async (id: number, next: boolean) => {
    await setOrderDone(id, next);

    // bail if not asked to celebrate
    if (!next || !confettiEnabled) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    try {
      const { default: confetti } = await import("canvas-confetti");
      const colors = confettiPalette && confettiPalette.length > 0
        ? confettiPalette
        : (theme === "dark" ? ["#ffffff"] : ["#000000"]);

      confetti({
        particleCount: 420,
        spread: 210,
        startVelocity: 50,
        gravity: 0.9,
        decay: 0.9,
        scalar: 1.0,
        origin: { x: 0.5, y: 0.5 },
        zIndex: 1200,
        colors,
      });
    } catch {
      // ignore if confetti fails to load
    }
  }, [setOrderDone, confettiEnabled, confettiPalette, theme]);

  const handleOpenSettings = useCallback(() => {
    closeOrderForm?.();
    const { closeDashboard, openSettings } = useStore.getState();
    closeDashboard?.();
    openSettings(); // flip right panel into Settings mode
  }, [closeOrderForm]);

  const handleOpenDashboard = useCallback(() => {
    closeOrderForm?.();
    const { openDashboard, closeSettings } = useStore.getState();
    closeSettings?.();
    openDashboard(); // flip right panel into Dashboard mode
  }, [closeOrderForm]);

  const makeRowKeyDown = useCallback(
    (id: number) =>
      (e: React.KeyboardEvent<HTMLLIElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openContent(id);
        }
      },
    [openContent]
  );

  return (
    <>
      <Container id="left-menu" className="left-panel" $open={open} aria-expanded={open}>
        {/* Header buttons */}
        <ChartButton
          type="button"
          onClick={handleOpenDashboard}
          aria-label="Open dashboard"
          title="Dashboard"
        >
          <FontAwesomeIcon icon={faChartLine} />
        </ChartButton>

        <SettingsButton
          type="button"
          onClick={handleOpenSettings}
          aria-label="Open settings"
          title="Settings"
        >
          <FontAwesomeIcon icon={faGear} />
        </SettingsButton>

        <OrdersList aria-busy={loading || undefined}>
          {loading && <li>Loading…</li>}
          {error && <ErrorMsg role="alert">{error}</ErrorMsg>}
          {!loading && !error && orders.length === 0 && <EmptyMsg>No orders yet</EmptyMsg>}

          {!loading && !error && orders.map((o) => {
            const cid = `order-check-${o.id}`;
            return (
              <OrderItem
                key={o.id}
                title={o.articleName}
                data-done={o.done ? "true" : "false"}
                onClick={() => openContent(o.id)}
                role="button"
                tabIndex={0}
                onKeyDown={makeRowKeyDown(o.id)}
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
                      onClick={() => {
                        const { closeDashboard, closeSettings } = useStore.getState();
                        closeDashboard?.();
                        closeSettings?.();
                        openOrderFormForEdit(o.id);
                      }}
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
          <FontAwesomeIcon icon={faPlus} />
        </PlusButton>
      </Container>

      {/* Overlay that closes the left panel */}
      <Overlay $open={open} onClick={onClose} aria-hidden={!open} />
    </>
  );
};

export default LeftPanel;
