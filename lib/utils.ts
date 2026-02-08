import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Configuración de envío
export const SHIPPING_CONFIG = {
  FREE_SHIPPING_THRESHOLD: 15000,
  SHIPPING_COST: 1500,
} as const

export function calculateShipping(subtotal: number): number {
  return subtotal > SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD
    ? 0
    : SHIPPING_CONFIG.SHIPPING_COST
}

// Formateo de precios en pesos argentinos
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(price)
}
