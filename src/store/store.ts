// /src/store/store.ts
import { create } from "zustand";

type UIState = {
  isOrderFormOpen: boolean;
  openOrderForm: () => void;
  closeOrderForm: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  isOrderFormOpen: false,
  openOrderForm: () => set({ isOrderFormOpen: true }),
  closeOrderForm: () => set({ isOrderFormOpen: false }),
}));
