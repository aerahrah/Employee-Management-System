import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuth = create(
  persist(
    (set) => ({
      admin: null,
      token: null,
      login: (data) => set({ admin: data.admin, token: data.token }),
      logout: () => set({ admin: null, token: null }),
    }),
    {
      name: "auth",
      getStorage: () => localStorage,
    }
  )
);
