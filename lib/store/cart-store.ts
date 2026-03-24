'use client'

import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/lib/types/database'

// Hook to check if component is hydrated (client-side)
const emptySubscribe = () => () => {}
export function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export interface CartItem {
  product: Product
  quantity: number
  secondHalf?: Product // pizza mitad y mitad
}

/** Unique key for a cart item (composite for half-and-half) */
export function getCartItemKey(item: CartItem): string {
  return item.secondHalf
    ? `${item.product.id}__${item.secondHalf.id}`
    : item.product.id
}

/** Effective price: max of the two halves (Argentine convention), or product price */
export function getCartItemPrice(item: CartItem): number {
  return item.secondHalf
    ? Math.max(item.product.price, item.secondHalf.price)
    : item.product.price
}

/** Display name for the cart item */
export function getCartItemName(item: CartItem): string {
  return item.secondHalf
    ? `½ ${item.product.name} / ½ ${item.secondHalf.name}`
    : item.product.name
}

interface CartStore {
  items: CartItem[]
  addItem: (product: Product) => void
  addHalfHalfItem: (product1: Product, product2: Product) => void
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product.id === product.id && !item.secondHalf
          )

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id && !item.secondHalf
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            }
          }

          return {
            items: [...state.items, { product, quantity: 1 }],
          }
        })
      },

      addHalfHalfItem: (product1: Product, product2: Product) => {
        const key = `${product1.id}__${product2.id}`
        set((state) => {
          const existingItem = state.items.find(
            (item) => getCartItemKey(item) === key
          )
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                getCartItemKey(item) === key
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            }
          }
          return {
            items: [...state.items, { product: product1, secondHalf: product2, quantity: 1 }],
          }
        })
      },

      removeItem: (key: string) => {
        set((state) => ({
          items: state.items.filter((item) => getCartItemKey(item) !== key),
        }))
      },

      updateQuantity: (key: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(key)
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            getCartItemKey(item) === key ? { ...item, quantity } : item
          ),
        }))
      },

      clearCart: () => {
        set({ items: [] })
      },

      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + getCartItemPrice(item) * item.quantity,
          0
        )
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: 'que-copado-cart',
    }
  )
)
