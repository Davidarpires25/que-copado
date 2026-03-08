export type Station = 'cocina' | 'barra'
export type ComandaStatus = 'pendiente' | 'en_preparacion' | 'listo'

export interface ComandaItem {
  id: string
  comanda_id: string
  order_item_id: string | null
  product_name: string
  quantity: number
  sale_tag: string | null
  notes: string | null
}

export interface Comanda {
  id: string
  order_id: string
  station: Station
  status: ComandaStatus
  notes: string | null
  created_at: string
  updated_at: string
  items: ComandaItem[]
  order?: { order_type: string | null; table_number: number | null }
}
