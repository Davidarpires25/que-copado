export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
        }
        Insert: {
          id?: string
          created_at?: string
          total: number
          items: Json
          customer_phone: string
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
        }
        Update: {
          id?: string
          created_at?: string
          total?: number
          items?: Json
          customer_phone?: string
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
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

export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Order = Database['public']['Tables']['orders']['Row']

export type ProductWithCategory = Product & {
  categories: Category
}

// GeoJSON Types for Delivery Zones
export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
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
