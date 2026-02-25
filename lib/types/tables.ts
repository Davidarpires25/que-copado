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

// Section labels for UI grouping
export const TABLE_SECTION_LABELS: Record<string, string> = {
  salon: 'Salon',
  terraza: 'Terraza',
  barra: 'Barra',
  principal: 'Principal',
}
