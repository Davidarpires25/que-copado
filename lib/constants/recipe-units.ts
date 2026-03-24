import type { IngredientUnit } from '@/lib/types/database'

export const UNIT_TO_BASE: Record<string, number> = {
  kg: 1,
  g: 0.001,
  litro: 1,
  ml: 0.001,
  unidad: 1,
}

export const UNIT_FAMILY: Record<string, string> = {
  kg: 'masa',
  g: 'masa',
  litro: 'volumen',
  ml: 'volumen',
  unidad: 'unidad',
}

export const ALL_UNITS: IngredientUnit[] = ['kg', 'g', 'litro', 'ml', 'unidad']

export const formatCost = (cost: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(cost)
