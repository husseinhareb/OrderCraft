// /src/store/store.ts
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type OrderListItem = {
  id: number;
  articleName: string;
  done: boolean;          
};

type AppState = {
  // UI
  isOrderFormOpen: boolean;
  editingOrderId: number | null;
  openOrderForm: () => void;
  openOrderFormForEdit: (id: number) => void;
  closeOrderForm: () => void;

  // Orders
  orders: OrderListItem[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  deleteOrder: (id: number) => Promise<void>;
  setOrderDone: (id: number, done: boolean) => Promise<void>; 
};

export const useStore = create<AppState>((set, get) => ({
  // UI
  isOrderFormOpen: false,
  editingOrderId: null,
  openOrderForm: () => set({ isOrderFormOpen: true, editingOrderId: null }),
  openOrderFormForEdit: (id) => set({ isOrderFormOpen: true, editingOrderId: id }),
  closeOrderForm: () => set({ isOrderFormOpen: false, editingOrderId: null }),

  // Orders
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
      set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
    } catch (e: any) {
      set({ error: e?.toString?.() ?? "Failed to delete order" });
    }
  },

  setOrderDone: async (id: number, done: boolean) => {
    // optimistic update
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, done } : o)) }));
    try {
      await invoke("set_order_done", { id, done });
    } catch (e: any) {
      // revert on error
      set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, done: !done } : o)) }));
      set({ error: e?.toString?.() ?? "Failed to update order status" });
    }
  },
}));
