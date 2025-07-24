import { create } from 'zustand'

export const useAuth = create((set) => ({
  admin: null,
  login: (data) => set({ admin: data }),
  logout: () => set({ admin: null }),
}))

