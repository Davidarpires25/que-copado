export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// GeoJSON Types for Delivery Zones (declared before Database since it's referenced in table types)
export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string | null
          price: number
          cost: number | null
          image_url: string | null
          is_active: boolean
          is_out_of_stock: boolean
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string | null
          price: number
          cost?: number | null
          image_url?: string | null
          is_active?: boolean
          is_out_of_stock?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          cost?: number | null
          image_url?: string | null
          is_active?: boolean
          is_out_of_stock?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          created_at: string
          total: number
          items: Json
          customer_phone: string
          customer_name: string
          customer_address: string
          customer_coordinates: Json
          shipping_cost: number
          delivery_zone_id: string | null
          notes: string | null
          payment_method: string
          status: string
        }
        Insert: {
          id?: string
          created_at?: string
          total: number
          items: Json
          customer_phone: string
          customer_name: string
          customer_address: string
          customer_coordinates?: Json
          shipping_cost?: number
          delivery_zone_id?: string | null
          notes?: string | null
          payment_method: string
          status?: string
        }
        Update: {
          id?: string
          created_at?: string
          total?: number
          items?: Json
          customer_phone?: string
          customer_name?: string
          customer_address?: string
          customer_coordinates?: Json
          shipping_cost?: number
          delivery_zone_id?: string | null
          notes?: string | null
          payment_method?: string
          status?: string
        }
      }
      business_settings: {
        Row: {
          id: string
          operating_days: Json
          opening_time: string
          closing_time: string
          is_paused: boolean
          pause_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          operating_days?: Json
          opening_time?: string
          closing_time?: string
          is_paused?: boolean
          pause_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          operating_days?: Json
          opening_time?: string
          closing_time?: string
          is_paused?: boolean
          pause_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      delivery_zones: {
        Row: {
          id: string
          name: string
          polygon: Json
          shipping_cost: number
          color: string
          is_active: boolean
          sort_order: number
          free_shipping_threshold: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          polygon: Json
          shipping_cost: number
          color?: string
          is_active?: boolean
          sort_order?: number
          free_shipping_threshold?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          polygon?: Json
          shipping_cost?: number
          color?: string
          is_active?: boolean
          sort_order?: number
          free_shipping_threshold?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases with proper business types
export interface Order {
  id: string
  created_at: string
  total: number
  items: Json
  customer_phone: string
  customer_name: string
  customer_address: string
  customer_coordinates: { lat: number; lng: number } | null
  shipping_cost: number
  delivery_zone_id: string | null
  notes: string | null
  payment_method: PaymentMethod
  status: OrderStatus
}

export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']

export interface BusinessSettings {
  id: string
  operating_days: number[]
  opening_time: string
  closing_time: string
  is_paused: boolean
  pause_message: string | null
  created_at: string
  updated_at: string
}

export type OrderStatus = 'recibido' | 'pagado' | 'entregado' | 'cancelado'
export type PaymentMethod = 'cash' | 'transfer' | 'mercadopago'

export type ProductWithCategory = Product & {
  categories: Category
}

export type OrderWithZone = Order & {
  delivery_zones: DeliveryZone | null
}

export interface DeliveryZone {
  id: string
  name: string
  polygon: GeoJSONPolygon
  shipping_cost: number
  color: string
  is_active: boolean
  sort_order: number
  free_shipping_threshold: number | null
  created_at: string
  updated_at: string
}

export interface ShippingResult {
  zone: DeliveryZone | null
  shippingCost: number
  isFreeShipping: boolean
  isOutOfCoverage: boolean
}
