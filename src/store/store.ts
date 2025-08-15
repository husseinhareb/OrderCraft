// /src/store/store.ts
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

/* ---------- Theme ---------- */
export type ThemeName = "light" | "dark";

const getInitialTheme = (): ThemeName => {
  try {
    if (typeof window !== "undefined") {
      const saved = window.localStorage?.getItem("theme") as ThemeName | null;
      if (saved === "light" || saved === "dark") return saved;
      const prefersDark =
        window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
      return prefersDark ? "dark" : "light";
    }
  } catch {
    // ignore and fall back
  }
  return "light";
};

/* ---------- Types ---------- */

export type OrderListItem = {
  id: number;
  articleName: string;
  done: boolean;
};

export type OpenedOrder = {
  orderId: number;
  articleName: string;
  position: number; // 1 is top (most recently opened)
};

/* ---------- Store ---------- */

type AppState = {
  /* Theme */
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  toggleTheme: () => void;

  /* UI */
  isOrderFormOpen: boolean;
  editingOrderId: number | null;
  openOrderForm: () => void;
  openOrderFormForEdit: (id: number) => void;
  closeOrderForm: () => void;

  /* Dashboard (Right Panel) */
  showDashboard: boolean;
  openDashboard: () => void;
  closeDashboard: () => void;

  /* Orders */
  orders: OrderListItem[];
  loading: boolean; // for orders list
  error: string | null;
  fetchOrders: () => Promise<void>;
  deleteOrder: (id: number) => Promise<void>;
  setOrderDone: (id: number, done: boolean) => Promise<void>;

  /* Opened Orders stack */
  opened: OpenedOrder[];
  openedLoading: boolean;
  openedError: string | null;
  fetchOpened: () => Promise<void>;
  openInStack: (id: number) => Promise<void>; // promote/add to top
  closeFromStack: (id: number) => Promise<void>; // remove from stack
  openInStackAndEdit: (id: number) => Promise<void>;
};

export const useStore = create<AppState>((set, get) => ({
  /* Theme */
  theme: getInitialTheme(),
  setTheme: (t) => {
    try {
      window.localStorage?.setItem("theme", t);
    } catch {
      // ignore storage errors
    }
    set({ theme: t });
  },
  toggleTheme: () => {
    const next: ThemeName = get().theme === "light" ? "dark" : "light";
    try {
      window.localStorage?.setItem("theme", next);
    } catch {
      // ignore storage errors
    }
    set({ theme: next });
  },

  /* UI */
  isOrderFormOpen: false,
  editingOrderId: null,
  openOrderForm: () =>
    set({ isOrderFormOpen: true, editingOrderId: null, showDashboard: false }),
  openOrderFormForEdit: (id) =>
    set({ isOrderFormOpen: true, editingOrderId: id, showDashboard: false }),
  closeOrderForm: () => set({ isOrderFormOpen: false, editingOrderId: null }),

  /* Dashboard (Right Panel) */
  showDashboard: false,
  openDashboard: () =>
    set({ showDashboard: true, isOrderFormOpen: false, editingOrderId: null }),
  closeDashboard: () => set({ showDashboard: false }),

  /* Orders */
  orders: [],
  loading: false,
  error: null,

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const data = await invoke<OrderListItem[]>("list_orders");
      set({ orders: data, loading: false });
    } catch (e: any) {
      set({ error: e?.toString?.() ?? "Failed to load orders", loading: false });
    }
  },

  deleteOrder: async (id: number) => {
    set({ error: null });
    try {
      await invoke("delete_order", { id });
      // remove from local orders + opened stack (DB cascades, but mirror in memory)
      set((s) => ({
        orders: s.orders.filter((o) => o.id !== id),
        opened: s.opened.filter((oo) => oo.orderId !== id),
      }));
    } catch (e: any) {
      set({ error: e?.toString?.() ?? "Failed to delete order" });
    }
  },

  setOrderDone: async (id: number, done: boolean) => {
    // optimistic update in the list
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, done } : o)),
    }));
    try {
      await invoke("set_order_done", { id, done });
    } catch (e: any) {
      // revert on error
      set((s) => ({
        orders: s.orders.map((o) => (o.id === id ? { ...o, done: !done } : o)),
      }));
      set({ error: e?.toString?.() ?? "Failed to update order status" });
    }
  },

  /* Opened Orders stack */
  opened: [],
  openedLoading: false,
  openedError: null,

  fetchOpened: async () => {
    set({ openedLoading: true, openedError: null });
    try {
      const data = await invoke<OpenedOrder[]>("get_opened_orders");
      set({ opened: data, openedLoading: false });
    } catch (e: any) {
      set({
        openedError: e?.toString?.() ?? "Failed to load opened orders",
        openedLoading: false,
      });
    }
  },

  openInStack: async (id: number) => {
    // Optimistic: move to top in local state right away
    set((s) => {
      const rest = s.opened.filter((x) => x.orderId !== id);
      const existing = s.opened.find((x) => x.orderId === id);
      const top: OpenedOrder = existing
        ? { ...existing, position: 1 }
        : {
            orderId: id,
            articleName: s.orders.find((o) => o.id === id)?.articleName ?? String(id),
            position: 1,
          };
      const reindexed = [top, ...rest].map((x, i) => ({ ...x, position: i + 1 }));
      return {
        opened: reindexed,
        // keep right panel in "orders" mode whenever an order is opened
        showDashboard: false,
        isOrderFormOpen: s.isOrderFormOpen && s.editingOrderId === id ? s.isOrderFormOpen : s.isOrderFormOpen,
      };
    });

    try {
      await invoke("open_order", { id });
      // refresh from DB to ensure positions are exact
      await get().fetchOpened();
    } catch (e: any) {
      set({ openedError: e?.toString?.() ?? "Failed to open order" });
      // best-effort: reload from DB to correct optimistic state
      await get().fetchOpened();
    }
  },

  closeFromStack: async (id: number) => {
    // Optimistic remove
    set((s) => ({ opened: s.opened.filter((x) => x.orderId !== id) }));
    try {
      await invoke("remove_opened_order", { id });
      await get().fetchOpened();
    } catch (e: any) {
      set({ openedError: e?.toString?.() ?? "Failed to close opened order" });
      await get().fetchOpened();
    }
  },

  openInStackAndEdit: async (id: number) => {
    await get().openInStack(id);
    set({ isOrderFormOpen: true, editingOrderId: id, showDashboard: false });
  },
}));
