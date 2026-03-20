"use client";

import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UIState {
  sidebarOpen: boolean;
  theme: "dark" | "light";

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
}

// ─── UI Store ─────────────────────────────────────────────────────────────────
export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  theme: "dark",

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
}));
