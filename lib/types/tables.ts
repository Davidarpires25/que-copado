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
}

// Order with its normalized items
export interface OrderWithItems extends Order {
  order_items: OrderItemRow[]
}

// Table with its current order loaded (from Supabase join)
export interface TableWithOrder extends RestaurantTable {
  orders: OrderWithItems | null
}

// Table status config for UI
export const TABLE_STATUS_CONFIG: Record<TableStatus, {
  label: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  libre: {
    label: 'Libre',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  ocupada: {
    label: 'Ocupada',
    color: 'text-[#FEC501]',
    bgColor: 'bg-[#FEC501]/10',
    borderColor: 'border-[#FEC501]/30',
  },
  cuenta_pedida: {
    label: 'Cuenta Pedida',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
}

// Color palette for sale tags (comensales) — index-based assignment
export const TAG_COLORS = [
  { dot: 'bg-green-400',  text: 'text-green-400',  bg: 'bg-green-400/12',  print: 'bg-green-400/10 border-green-400/20 text-green-400'  },
  { dot: 'bg-blue-400',   text: 'text-blue-400',   bg: 'bg-blue-400/12',   print: 'bg-blue-400/10 border-blue-400/20 text-blue-400'   },
  { dot: 'bg-amber-400',  text: 'text-amber-400',  bg: 'bg-amber-400/12',  print: 'bg-amber-400/10 border-amber-400/20 text-amber-400'  },
  { dot: 'bg-purple-400', text: 'text-purple-400', bg: 'bg-purple-400/12', print: 'bg-purple-400/10 border-purple-400/20 text-purple-400' },
  { dot: 'bg-pink-400',   text: 'text-pink-400',   bg: 'bg-pink-400/12',   print: 'bg-pink-400/10 border-pink-400/20 text-pink-400'   },
] as const

// Section labels for UI grouping
export const TABLE_SECTION_LABELS: Record<string, string> = {
  salon: 'Salon',
  terraza: 'Terraza',
  barra: 'Barra',
  principal: 'Principal',
}
