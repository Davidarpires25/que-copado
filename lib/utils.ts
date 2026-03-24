import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formateo de precios en pesos argentinos
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(price)
}

// Coordenadas de San Fernando del Valle de Catamarca
export const CATAMARCA_COORDS = {
  lat: -28.4696,
  lng: -65.7795,
  zoom: 13,
} as const
