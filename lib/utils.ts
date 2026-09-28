import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge resuelve conflictos por grupo (dos tamaños: gana el ultimo),
 * y un `text-*` que no conoce lo toma por color. La escala de texto del panel
 * (`text-panel-*`, globals.css) es tamaño: sin decirselo, `cn('text-panel-sm
 * text-[var(--admin-text)]')` borraba el tamaño y el texto heredaba 16px.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["panel-2xs", "panel-xs", "panel-sm", "panel-base", "panel-lg", "panel-xl"] }],
    },
  },
})

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
