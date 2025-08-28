// /src/components/RightPanel/OrderContent.tsx
import { useEffect, useMemo, useState, useCallback, type FC } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Wrapper,
  Card,
  Header,
  Title,
  SubTitle,
  Actions,
  ActionBtn,
  MetaGrid,
  MetaItem,
  MetaLabel,
  MetaValue,
  BadgeRow,
  Badge,
  Description,
  EmptyState,
  ErrorBox,
  Separator,
} from "./Styles/style";
import { useStore } from "../../store/store";

type OrderDetail = {
  id: number;
  clientName: string;
  articleName: string;
  phone: string;
  city: string;
  address: string;
  deliveryCompany: string;
  deliveryDate: string; // yyyy-mm-dd
  description?: string | null;
  done?: boolean;
};

const formatDate = (isoLike: string) => {
  if (!isoLike) return "";
  const dt = new Date(isoLike);
  if (Number.isNaN(dt.getTime())) return isoLike;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(dt);
};

const copy = async (text: string) => {
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    /* ignore if clipboard unavailable */
  }
};

const OrderContent: FC = () => {
  const {
    opened,
    activeOrderId, // may not exist on older store; handled below
    openOrderFormForEdit,
    deleteOrder,
    setOrderDone,
    closeFromStack,
  } = useStore();

  const storeTheme = useStore((s) => s.theme); // "light" | "dark" | "custom"

  // Prefer explicit active id from the store; otherwise fall back to last opened
  const activeId = useMemo<number | null>(() => {
    if (typeof activeOrderId === "number") return activeOrderId;
    return opened.length ? opened[opened.length - 1].orderId : null;
  }, [activeOrderId, opened]);

  const [data, setData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // for optimistic toggle
  const [toggling, setToggling] = useState(false);

  // Confetti palette (computed server-side; may be 1..5 colors)
  const [confettiPalette, setConfettiPalette] = useState<string[]>(["#000000"]);

  const fetchPalette = useCallback(async () => {
    try {
      const colors = await invoke<string[]>("get_confetti_palette");
      if (Array.isArray(colors) && colors.length > 0) {
        setConfettiPalette(colors.slice(0, 5));
        return;
      }
    } catch {
      /* ignore */
    }
    setConfettiPalette(storeTheme === "dark" ? ["#ffffff"] : ["#000000"]);
  }, [storeTheme]);

  // Load order whenever the active id changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (activeId == null) {
        setData(null);
        setErr(null);
        return;
      }
      setLoading(true);
      setErr(null);
      try {
        const res = await invoke<OrderDetail>("get_order", { id: activeId });
        if (!cancelled) setData(res);
      } catch (e: any) {
        if (!cancelled) setErr(e?.toString?.() ?? "Failed to load order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // load / refresh confetti palette whenever theme changes
  useEffect(() => {
    (async () => {
      await fetchPalette();
    })();
  }, [storeTheme, fetchPalette]);

  // also refresh palette when backend announces a theme/confetti update
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen("theme:updated", async () => {
          await fetchPalette();
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      unlisten?.();
    };
  }, [fetchPalette]);

  const triggerConfetti = useCallback(async () => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    try {
      const { default: confetti } = await import("canvas-confetti");
      confetti({
        particleCount: 420,
        spread: 210,
        startVelocity: 50,
        gravity: 0.9,
        decay: 0.9,
        scalar: 1.0,
        origin: { x: 0.5, y: 0.5 },
        zIndex: 1200,
        colors:
          confettiPalette && confettiPalette.length > 0
            ? confettiPalette
            : ["#000000"],
      });
    } catch {
      /* ignore if confetti fails to load */
    }
  }, [confettiPalette]);

  const toggleDone = async () => {
    if (!data || toggling) return;
    const current = !!data.done;
    const next = !current;

    // Optimistic UI update
    setData((d) => (d ? { ...d, done: next } : d));
    setToggling(true);
    try {
      await setOrderDone(data.id, next);
      if (next) await triggerConfetti();
    } catch (e) {
      // Roll back on failure
      setData((d) => (d ? { ...d, done: current } : d));
      console.error(e);
      alert("Failed to update order status.");
    } finally {
      setToggling(false);
    }
  };

  if (!activeId) {
    return (
      <Wrapper>
        <EmptyState>
          <strong>No order selected</strong>
          <span>Pick an order from the left to preview it here.</span>
        </EmptyState>
      </Wrapper>
    );
  }

  if (loading) {
    return (
      <Wrapper>
        <Card aria-busy="true">
          <Header>
            <Title
              style={{
                opacity: 0.45,
                width: 240,
                height: 20,
                background: "#eee",
                borderRadius: 6,
              }}
            />
          </Header>
          <MetaGrid>
            {Array.from({ length: 6 }).map((_, i) => (
              <MetaItem key={i}>
                <MetaLabel style={{ opacity: 0.6 }}>Loading…</MetaLabel>
                <MetaValue
                  style={{ height: 16, background: "#f3f3f3", borderRadius: 4 }}
                />
              </MetaItem>
            ))}
          </MetaGrid>
        </Card>
      </Wrapper>
    );
  }

  if (err) {
    return (
      <Wrapper>
        <ErrorBox role="alert">{err}</ErrorBox>
      </Wrapper>
    );
  }

  if (!data) return null;

  const done = !!data.done;
  const delivDate = formatDate(data.deliveryDate);

  return (
    <Wrapper>
      <Card>
        <Header>
          <div>
            <Title>{data.articleName}</Title>
            <SubTitle>for {data.clientName}</SubTitle>
          </div>

          <Actions>
            <ActionBtn
              type="button"
              aria-label={done ? "Mark as not done" : "Mark as done"}
              data-variant={done ? "outline" : "primary"}
              onClick={toggleDone}
              disabled={toggling}
              title={done ? "Mark as not done" : "Mark as done"}
            >
              {done ? "✓ Done" : toggling ? "Marking…" : "Mark done"}
            </ActionBtn>

            <ActionBtn
              type="button"
              onClick={() => openOrderFormForEdit(data.id)}
            >
              Edit
            </ActionBtn>

            <ActionBtn
              type="button"
              data-variant="danger"
              onClick={async () => {
                if (confirm("Delete this order?")) {
                  await deleteOrder(data.id);
                  closeFromStack?.(data.id);
                }
              }}
            >
              Delete
            </ActionBtn>
          </Actions>
        </Header>

        <BadgeRow>
          {data.deliveryCompany && (
            <Badge title="Delivery company">{data.deliveryCompany}</Badge>
          )}
          {delivDate && <Badge title="Delivery date">{delivDate}</Badge>}
          {data.city && <Badge title="City">{data.city}</Badge>}
        </BadgeRow>

        <Separator />

        <MetaGrid>
          <MetaItem>
            <MetaLabel>Client</MetaLabel>
            <MetaValue>{data.clientName}</MetaValue>
          </MetaItem>

          <MetaItem>
            <MetaLabel>Phone</MetaLabel>
            <MetaValue>
              <a href={`tel:${data.phone}`}>{data.phone}</a>
              <ActionBtn
                type="button"
                data-variant="ghost"
                onClick={() => copy(data.phone)}
                title="Copy"
              >
                ⧉
              </ActionBtn>
            </MetaValue>
          </MetaItem>

          <MetaItem>
            <MetaLabel>City</MetaLabel>
            <MetaValue>{data.city}</MetaValue>
          </MetaItem>

          <MetaItem>
            <MetaLabel>Address</MetaLabel>
            <MetaValue>
              <span>{data.address}</span>
              <ActionBtn
                type="button"
                data-variant="ghost"
                onClick={() => copy(data.address)}
                title="Copy"
              >
                ⧉
              </ActionBtn>
            </MetaValue>
          </MetaItem>

          <MetaItem>
            <MetaLabel>Delivery</MetaLabel>
            <MetaValue>
              <span>{data.deliveryCompany}</span>
              {delivDate && (
                <span style={{ opacity: 0.7 }}> · {delivDate}</span>
              )}
            </MetaValue>
          </MetaItem>

          <MetaItem>
            <MetaLabel>ID</MetaLabel>
            <MetaValue>#{data.id}</MetaValue>
          </MetaItem>
        </MetaGrid>

        {data.description && (
          <>
            <Separator />
            <Description>
              <MetaLabel as="div">Notes</MetaLabel>
              <p>{data.description}</p>
            </Description>
          </>
        )}
      </Card>
    </Wrapper>
  );
};

export default OrderContent;
