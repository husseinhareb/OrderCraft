// /src/store/store.ts
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type OrderListItem = { id: number; articleName: string };

type AppState = {
  // UI
  isOrderFormOpen: boolean;
  editingOrderId: number | null;
  openOrderForm: () => void;                // create new
  openOrderFormForEdit: (id: number) => void;
  closeOrderForm: () => void;

  // Orders
  orders: OrderListItem[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  deleteOrder: (id: number) => Promise<void>;
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
    set({ loading: true, error: null });
    try {
      await invoke("delete_order", { id });
      await get().fetchOrders();
    } catch (e: any) {
      set({ error: e?.toString?.() ?? "Failed to delete order" });
    } finally {
      set({ loading: false });
    }
  },
}));
