// /src/store/store.ts
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type OrderListItem = {
  id: number;
  articleName: string;
};

type AppState = {
  // UI
  isOrderFormOpen: boolean;
  openOrderForm: () => void;
  closeOrderForm: () => void;

  // Orders
  orders: OrderListItem[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
};

export const useStore = create<AppState>((set) => ({
  // UI
  isOrderFormOpen: false,
  openOrderForm: () => set({ isOrderFormOpen: true }),
  closeOrderForm: () => set({ isOrderFormOpen: false }),

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
}));
