import type { Order } from './database'

// Restaurant Table
export interface RestaurantTable {
  id: string
  number: number
  label: string | null
  section: string
  capacity: number
  status: TableStatus
  current_order_id: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export type TableStatus = 'libre' | 'ocupada' | 'cuenta_pedida'

// Normalized order item (DB row)
export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_price: number
  quantity: number
  notes: string | null
  status: 'pendiente' | 'cancelado'
  sale_tag: string | null
  added_at: string
  added_by: string | null
  kitchen_print_batch_id?: string | null
}

// Order with its normalized items
export interface OrderWithItems extends Order {
  order_items: OrderItemRow[]
}

// Table with its current order loaded (from Supabase join)
export interface TableWithOrder extends RestaurantTable {
  orders: OrderWithItems | null
}

/**
 * Config unica de estados de mesa.
 *
 * `table-card.tsx` tenia su propia copia (`STATUS_STYLES`) que pintaba
 * "Cuenta pedida" de rojo mientras esta la pintaba de naranja, asi que la misma
 * mesa cambiaba de color entre el plano y el panel. Se unifico en rojo: es el
 * unico estado que exige una accion inmediata y tiene que saltar en el salon.
 */
/**
 * Estados de mesa.
 *
 * Los colores eran tonos `-400` y un `#FEC501` crudo, calibrados para fondo
 * oscuro: sobre el blanco del admin claro daban 1.6:1, muy por debajo del 4.5:1
 * de AA. En la grilla de mesas "Ocupada" salia en un amarillo lavado y, como la
 * tarjeta pintaba tambien el monto con este color, la plata heredaba el mismo
 * problema.
 *
 * Ahora siguen la regla del repo, la misma que `lib/constants/payments.ts`:
 * `-700` en claro, `-400` en oscuro.
 */
export const TABLE_STATUS_CONFIG: Record<TableStatus, {
  label: string
  /** Color del texto. Par claro/oscuro, nunca un tono suelto. */
  color: string
  bgColor: string
  borderColor: string
  /** Fondo solido para puntos e indicadores de estado. */
  dotColor: string
}> = {
  libre: {
    label: 'Libre',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
  },
  ocupada: {
    label: 'Ocupada',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
  },
  cuenta_pedida: {
    label: 'Cuenta Pedida',
    color: 'text-rose-700 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    dotColor: 'bg-rose-500',
  },
}

/**
 * Colores de los comensales, asignados por indice.
 *
 * `text` va en par claro/oscuro: los `-400` eran de tema oscuro y sobre blanco
 * el nombre del comensal quedaba lavado. `print` va siempre en `-700` porque el
 * papel es blanco en los dos temas. `dot` y `bg` son fondos y no cambian.
 */
export const TAG_COLORS = [
  { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/12', print: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' },
  { dot: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-500/12',    print: 'bg-blue-500/10 border-blue-500/20 text-blue-700'          },
  { dot: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-500/12',   print: 'bg-amber-500/10 border-amber-500/20 text-amber-700'       },
  { dot: 'bg-purple-500',  text: 'text-purple-700 dark:text-purple-400',   bg: 'bg-purple-500/12',  print: 'bg-purple-500/10 border-purple-500/20 text-purple-700'    },
  { dot: 'bg-pink-500',    text: 'text-pink-700 dark:text-pink-400',       bg: 'bg-pink-500/12',    print: 'bg-pink-500/10 border-pink-500/20 text-pink-700'          },
] as const

// Section labels for UI grouping
export const TABLE_SECTION_LABELS: Record<string, string> = {
  salon: 'Salon',
  terraza: 'Terraza',
  barra: 'Barra',
  principal: 'Principal',
}
