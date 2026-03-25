import { create } from 'zustand'

interface UIStore {
  cartDrawerOpen: boolean
  setCartDrawerOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  cartDrawerOpen: false,
  setCartDrawerOpen: (open) => set({ cartDrawerOpen: open }),
}))
