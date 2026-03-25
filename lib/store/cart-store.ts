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
  observations?: string // notas del cliente (e.g. "sin cebolla, extra cheddar")
  secondHalf?: Product // pizza mitad y mitad — primera mitad = product, segunda = secondHalf
  halfPrice?: number   // precio calculado (para métodos != 'max')
  halfProductId?: string // ID del producto 'mitad' padre
}

/** Unique key for a cart item (composite for half-and-half, suffixed for observations) */
export function getCartItemKey(item: CartItem): string {
  if (item.secondHalf) return `${item.product.id}__${item.secondHalf.id}`
  if (item.observations) return `${item.product.id}__obs`
  return item.product.id
}

/** Effective price: uses halfPrice if set (pricing_method-aware), otherwise max of two halves, or product price */
export function getCartItemPrice(item: CartItem): number {
  if (item.secondHalf) {
    return item.halfPrice ?? Math.max(item.product.price, item.secondHalf.price)
  }
  return item.product.price
}

/** Display name for the cart item */
export function getCartItemName(item: CartItem): string {
  return item.secondHalf
    ? `½ ${item.product.name} / ½ ${item.secondHalf.name}`
    : item.product.name
}

interface AddItemOptions {
  quantity?: number
  observations?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, options?: AddItemOptions) => void
  addHalfHalfItem: (product1: Product, product2: Product, halfPrice?: number, halfProductId?: string) => void
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

      addItem: (product: Product, options?: AddItemOptions) => {
        const qty = options?.quantity ?? 1
        const obs = options?.observations?.trim() || undefined

        set((state) => {
          // When observations are provided, use the __obs key slot
          if (obs) {
            const obsKey = `${product.id}__obs`
            const existingObs = state.items.find(
              (item) => getCartItemKey(item) === obsKey
            )
            if (existingObs) {
              return {
                items: state.items.map((item) =>
                  getCartItemKey(item) === obsKey
                    ? { ...item, quantity: item.quantity + qty, observations: obs }
                    : item
                ),
              }
            }
            return {
              items: [...state.items, { product, quantity: qty, observations: obs }],
            }
          }

          // Standard add (no observations)
          const existingItem = state.items.find(
            (item) => item.product.id === product.id && !item.secondHalf && !item.observations
          )

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id && !item.secondHalf && !item.observations
                  ? { ...item, quantity: item.quantity + qty }
                  : item
              ),
            }
          }

          return {
            items: [...state.items, { product, quantity: qty }],
          }
        })
      },

      addHalfHalfItem: (product1: Product, product2: Product, halfPrice?: number, halfProductId?: string) => {
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
            items: [...state.items, { product: product1, secondHalf: product2, quantity: 1, halfPrice, halfProductId }],
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
