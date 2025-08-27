// /src/store/store.ts
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { CustomThemeDTO, ThemeName } from "../theme/theme";

/* ---------- Types ---------- */

export type OrderListItem = {
  id: number;
  articleName: string;
  done: boolean;
};

export type OpenedOrder = {
  orderId: number;
  articleName: string;
  position: number; // 1-based position; kept by backend
};

/* ---------- Theme helpers ---------- */

const getInitialTheme = (): ThemeName => {
  try {
    const saved = localStorage.getItem("theme") as ThemeName | null;
    if (saved === "light" || saved === "dark" || saved === "custom") return saved;
    const prefersDark =
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
    return prefersDark ? "dark" : "light";
  } catch {
    return "light";
  }
};

/* ---------- Store ---------- */

type AppState = {
  /* Theme */
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  toggleTheme: () => void;

  customTheme: CustomThemeDTO | null;
  loadCustomTheme: () => Promise<void>;
  saveCustomTheme: (payload: CustomThemeDTO) => Promise<void>;
  setCustomThemeLocal: (partial: Partial<CustomThemeDTO>) => void;

  /* UI */
  isOrderFormOpen: boolean;
  editingOrderId: number | null;
  openOrderForm: () => void;
  openOrderFormForEdit: (id: number) => void;
  closeOrderForm: () => void;

  /* Right Panel modes */
  showDashboard: boolean;
  openDashboard: () => void;
  closeDashboard: () => void;

  showSettings: boolean;
  openSettings: () => void;
  closeSettings: () => void;

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
  openInStack: (id: number) => Promise<void>; // append if missing; do NOT reorder
  closeFromStack: (id: number) => Promise<void>;
  openInStackAndEdit: (id: number) => Promise<void>;
};

export const useStore = create<AppState>((set, get) => ({
  /* Theme */
  theme: getInitialTheme(),
  setTheme: (t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {
      /* ignore */
    }
    set({ theme: t });
  },
  toggleTheme: () => {
    const order: ThemeName[] = ["light", "dark", "custom"];
    const curr = get().theme;
    const next = order[(order.indexOf(curr) + 1) % order.length];
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
    set({ theme: next });
  },

  customTheme: null,
  loadCustomTheme: async () => {
    try {
      const payload = await invoke<CustomThemeDTO | null>("get_theme_colors");
      set({ customTheme: payload ?? { base: "light", colors: {} } });
    } catch {
      set({ customTheme: { base: "light", colors: {} } }); // safe default
    }
  },
  saveCustomTheme: async (payload) => {
    await invoke("save_theme_colors", { payload });
    set({ customTheme: payload });
  },
  setCustomThemeLocal: (partial) => {
    const prev = get().customTheme ?? { base: "light", colors: {} };
    set({
      customTheme: {
        ...prev,
        ...partial,
        colors: { ...prev.colors, ...(partial as any).colors },
      },
    });
  },

  /* UI */
  isOrderFormOpen: false,
  editingOrderId: null,
  openOrderForm: () =>
    set({
      isOrderFormOpen: true,
      editingOrderId: null,
      showDashboard: false,
      showSettings: false,
    }),
  openOrderFormForEdit: (id) =>
    set({
      isOrderFormOpen: true,
      editingOrderId: id,
      showDashboard: false,
      showSettings: false,
    }),
  closeOrderForm: () => set({ isOrderFormOpen: false, editingOrderId: null }),

  /* Right Panel modes */
  showDashboard: false,
  openDashboard: () =>
    set({
      showDashboard: true,
      showSettings: false,
      isOrderFormOpen: false,
      editingOrderId: null,
    }),
  closeDashboard: () => set({ showDashboard: false }),

  showSettings: false,
  openSettings: () =>
    set({
      showSettings: true,
      showDashboard: false,
      isOrderFormOpen: false,
      editingOrderId: null,
    }),
  closeSettings: () => set({ showSettings: false }),

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
      set({
        error: e?.toString?.() ?? "Failed to load orders",
        loading: false,
      });
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
    // Append-only optimistic update: if already present, do nothing (no reorder)
    set((s) => {
      const exists = s.opened.some((x) => x.orderId === id);
      if (exists) {
        return {
          showDashboard: false,
          showSettings: false,
        };
      }

      const nextPos =
        s.opened.length === 0
          ? 1
          : Math.max(...s.opened.map((x) => x.position)) + 1;

      const articleName =
        s.orders.find((o) => o.id === id)?.articleName ?? String(id);

      return {
        opened: [
          ...s.opened,
          { orderId: id, articleName, position: nextPos },
        ],
        showDashboard: false,
        showSettings: false,
      };
    });

    try {
      await invoke("open_order", { id });
      // sync from DB (which also appends); keeps positions canonical
      await get().fetchOpened();
    } catch (e: any) {
      set({ openedError: e?.toString?.() ?? "Failed to open order" });
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
    set({
      isOrderFormOpen: true,
      editingOrderId: id,
      showDashboard: false,
      showSettings: false,
    });
  },
}));
