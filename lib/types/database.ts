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

export type ZoneType = 'polygon' | 'circle'

export interface ZoneCenter {
  lat: number
  lng: number
}

// Discriminated union for geometry drawn on the map
export type DrawnZoneGeometry =
  | { type: 'polygon'; polygon: GeoJSONPolygon }
  | { type: 'circle'; center: ZoneCenter; radius_meters: number }

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          color?: string
          created_at?: string
        }
      }
      product_types: {
        Row: {
          type_key: string
          label: string
          description: string | null
          uses_recipes: boolean
          sends_to_kitchen: boolean
        }
        Insert: {
          type_key: string
          label: string
          description?: string | null
          uses_recipes?: boolean
          sends_to_kitchen?: boolean
        }
        Update: {
          type_key?: string
          label?: string
          description?: string | null
          uses_recipes?: boolean
          sends_to_kitchen?: boolean
        }
      }
      product_half_configs: {
        Row: {
          product_id: string
          source_category_id: string | null
          pricing_method: string
          pricing_markup_pct: number | null
        }
        Insert: {
          product_id: string
          source_category_id?: string | null
          pricing_method?: string
          pricing_markup_pct?: number | null
        }
        Update: {
          product_id?: string
          source_category_id?: string | null
          pricing_method?: string
          pricing_markup_pct?: number | null
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
          product_type: string
          image_url: string | null
          is_active: boolean
          is_out_of_stock: boolean
          current_stock: number
          min_stock: number | null
          stock_tracking_enabled: boolean
          auto_disabled: boolean
          station: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string | null
          price: number
          cost?: number | null
          product_type?: string
          image_url?: string | null
          is_active?: boolean
          is_out_of_stock?: boolean
          current_stock?: number
          min_stock?: number | null
          stock_tracking_enabled?: boolean
          auto_disabled?: boolean
          station?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          cost?: number | null
          product_type?: string
          image_url?: string | null
          is_active?: boolean
          is_out_of_stock?: boolean
          current_stock?: number
          min_stock?: number | null
          stock_tracking_enabled?: boolean
          auto_disabled?: boolean
          station?: string | null
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          created_at: string
          total: number
          items: Json
          customer_phone: string | null
          customer_name: string | null
          customer_address: string | null
          customer_coordinates: Json
          shipping_cost: number
          delivery_zone_id: string | null
          notes: string | null
          payment_method: string
          status: string
          order_source: string
          order_type: string | null
          table_number: number | null
          cash_register_session_id: string | null
          opened_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          total: number
          items: Json
          customer_phone?: string | null
          customer_name?: string | null
          customer_address?: string | null
          customer_coordinates?: Json
          shipping_cost?: number
          delivery_zone_id?: string | null
          notes?: string | null
          payment_method: string
          status?: string
          order_source?: string
          order_type?: string | null
          table_number?: number | null
          cash_register_session_id?: string | null
          opened_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          total?: number
          items?: Json
          customer_phone?: string | null
          customer_name?: string | null
          customer_address?: string | null
          customer_coordinates?: Json
          shipping_cost?: number
          delivery_zone_id?: string | null
          notes?: string | null
          payment_method?: string
          status?: string
          order_source?: string
          order_type?: string | null
          table_number?: number | null
          cash_register_session_id?: string | null
          opened_at?: string | null
          updated_at?: string | null
        }
      }
      cash_register_sessions: {
        Row: {
          id: string
          opened_at: string
          closed_at: string | null
          opened_by: string | null
          closed_by: string | null
          opening_balance: number
          expected_cash: number | null
          actual_cash: number | null
          cash_difference: number | null
          total_sales: number
          total_orders: number
          total_cash_sales: number
          total_card_sales: number
          total_transfer_sales: number
          total_withdrawals: number
          total_deposits: number
          notes: string | null
          status: string
        }
        Insert: {
          id?: string
          opened_at?: string
          closed_at?: string | null
          opened_by?: string | null
          closed_by?: string | null
          opening_balance?: number
          expected_cash?: number | null
          actual_cash?: number | null
          cash_difference?: number | null
          total_sales?: number
          total_orders?: number
          total_cash_sales?: number
          total_card_sales?: number
          total_transfer_sales?: number
          total_withdrawals?: number
          total_deposits?: number
          notes?: string | null
          status?: string
        }
        Update: {
          id?: string
          opened_at?: string
          closed_at?: string | null
          opened_by?: string | null
          closed_by?: string | null
          opening_balance?: number
          expected_cash?: number | null
          actual_cash?: number | null
          cash_difference?: number | null
          total_sales?: number
          total_orders?: number
          total_cash_sales?: number
          total_card_sales?: number
          total_transfer_sales?: number
          total_withdrawals?: number
          total_deposits?: number
          notes?: string | null
          status?: string
        }
      }
      cash_movements: {
        Row: {
          id: string
          session_id: string
          type: string
          amount: number
          reason: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          type: string
          amount: number
          reason: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          type?: string
          amount?: number
          reason?: string
          created_by?: string | null
          created_at?: string
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
      restaurant_tables: {
        Row: {
          id: string
          number: number
          label: string | null
          section: string
          capacity: number
          status: string
          current_order_id: string | null
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          number: number
          label?: string | null
          section?: string
          capacity?: number
          status?: string
          current_order_id?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          number?: number
          label?: string | null
          section?: string
          capacity?: number
          status?: string
          current_order_id?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_price: number
          quantity: number
          notes: string | null
          status: string
          sale_tag: string | null
          added_at: string
          added_by: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_price: number
          quantity?: number
          notes?: string | null
          status?: string
          sale_tag?: string | null
          added_at?: string
          added_by?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_price?: number
          quantity?: number
          notes?: string | null
          status?: string
          sale_tag?: string | null
          added_at?: string
          added_by?: string | null
          metadata?: Json | null
        }
      }
      comandas: {
        Row: {
          id: string
          order_id: string
          station: string
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          station: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          station?: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      comanda_items: {
        Row: {
          id: string
          comanda_id: string
          order_item_id: string | null
          product_name: string
          quantity: number
          sale_tag: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          comanda_id: string
          order_item_id?: string | null
          product_name: string
          quantity: number
          sale_tag?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          comanda_id?: string
          order_item_id?: string | null
          product_name?: string
          quantity?: number
          sale_tag?: string | null
          notes?: string | null
        }
      }
      payment_splits: {
        Row: {
          id: string
          order_id: string
          sale_tag: string | null
          amount: number
          method: string
          paid_at: string
          session_id: string | null
        }
        Insert: {
          id?: string
          order_id: string
          sale_tag?: string | null
          amount: number
          method: string
          paid_at?: string
          session_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          sale_tag?: string | null
          amount?: number
          method?: string
          paid_at?: string
          session_id?: string | null
        }
      }
      ingredient_categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      ingredients: {
        Row: {
          id: string
          name: string
          unit: string
          cost_per_unit: number
          waste_percentage: number
          category_id: string | null
          is_active: boolean
          current_stock: number
          min_stock: number | null
          stock_tracking_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          unit: string
          cost_per_unit: number
          waste_percentage?: number
          category_id?: string | null
          is_active?: boolean
          current_stock?: number
          min_stock?: number | null
          stock_tracking_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          unit?: string
          cost_per_unit?: number
          waste_percentage?: number
          category_id?: string | null
          is_active?: boolean
          current_stock?: number
          min_stock?: number | null
          stock_tracking_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          ingredient_id: string
          quantity: number
          unit: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          ingredient_id: string
          quantity: number
          unit?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          ingredient_id?: string
          quantity?: number
          unit?: string | null
          created_at?: string
        }
      }
      product_recipes: {
        Row: {
          id: string
          product_id: string
          recipe_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          recipe_id: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          recipe_id?: string
          quantity?: number
          created_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          ingredient_id: string | null
          product_id: string | null
          movement_type: string
          quantity: number
          previous_stock: number
          new_stock: number
          reason: string | null
          reference_type: string | null
          order_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ingredient_id?: string | null
          product_id?: string | null
          movement_type: string
          quantity: number
          previous_stock: number
          new_stock: number
          reason?: string | null
          reference_type?: string | null
          order_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string | null
          product_id?: string | null
          movement_type?: string
          quantity?: number
          previous_stock?: number
          new_stock?: number
          reason?: string | null
          reference_type?: string | null
          order_id?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      delivery_zones: {
        Row: {
          id: string
          name: string
          zone_type: string
          polygon: Json | null
          center: Json | null
          radius_meters: number | null
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
          zone_type?: string
          polygon?: Json | null
          center?: Json | null
          radius_meters?: number | null
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
          zone_type?: string
          polygon?: Json | null
          center?: Json | null
          radius_meters?: number | null
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
  customer_phone: string | null
  customer_name: string | null
  customer_address: string | null
  customer_coordinates: { lat: number; lng: number } | null
  shipping_cost: number
  delivery_zone_id: string | null
  notes: string | null
  payment_method: PaymentMethod
  status: OrderStatus
  order_source: OrderSource
  order_type: PosOrderType | null
  table_number: number | null
  cash_register_session_id: string | null
  opened_at: string | null
  updated_at: string | null
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

export type OrderStatus = 'abierto' | 'recibido' | 'cuenta_pedida' | 'pagado' | 'entregado' | 'cancelado'
export type PaymentMethod = 'cash' | 'transfer' | 'mercadopago' | 'card'
export type OrderSource = 'web' | 'pos'
export type PosOrderType = 'mostrador' | 'mesa'
export type CashRegisterSessionStatus = 'open' | 'closed'
export type CashMovementType = 'withdrawal' | 'deposit'

export type ProductWithCategory = Product & {
  categories: Category
}

export type OrderWithZone = Order & {
  delivery_zones: DeliveryZone | null
}

export interface DeliveryZone {
  id: string
  name: string
  zone_type: ZoneType
  polygon: GeoJSONPolygon | null
  center: ZoneCenter | null
  radius_meters: number | null
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

// Ingredient Categories
export type IngredientCategory = Database['public']['Tables']['ingredient_categories']['Row']

// Ingredients
export type Ingredient = Database['public']['Tables']['ingredients']['Row']

export type IngredientWithCategory = Ingredient & {
  ingredient_categories: IngredientCategory | null
}
export type IngredientUnit = 'kg' | 'g' | 'litro' | 'ml' | 'unidad'

export const INGREDIENT_UNIT_LABELS: Record<IngredientUnit, string> = {
  kg: 'Kilogramo', g: 'Gramo', litro: 'Litro', ml: 'Mililitro', unidad: 'Unidad',
}
export const INGREDIENT_UNIT_ABBR: Record<IngredientUnit, string> = {
  kg: 'kg', g: 'g', litro: 'lt', ml: 'ml', unidad: 'u',
}

// Recipes
export type Recipe = Database['public']['Tables']['recipes']['Row']
export type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Row']
export type ProductRecipe = Database['public']['Tables']['product_recipes']['Row']

export type RecipeIngredientWithDetails = RecipeIngredient & {
  ingredients: Ingredient
}

export type RecipeWithIngredients = Recipe & {
  recipe_ingredients: RecipeIngredientWithDetails[]
}

export type ProductRecipeWithDetails = ProductRecipe & {
  recipes: RecipeWithIngredients
}

// Product types
export type ProductType = 'elaborado' | 'reventa' | 'mitad'

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  elaborado: 'Elaborado',
  reventa: 'Reventa',
  mitad: 'Mitad y Mitad',
}

export const PRODUCT_TYPE_DESCRIPTIONS: Record<ProductType, string> = {
  elaborado: 'Se prepara con recetas (ej: hamburguesas, papas)',
  reventa: 'Se compra y revende tal cual (ej: bebidas, extras)',
  mitad: 'Pizza con selección de 2 mitades',
}

// Kitchen routing helper — use instead of hardcoded `=== 'elaborado'`
export const KITCHEN_PRODUCT_TYPES: ProductType[] = ['elaborado', 'mitad']
export const sendsToKitchen = (pt: string): boolean =>
  KITCHEN_PRODUCT_TYPES.includes(pt as ProductType)

// Half-pizza config type
export type HalfConfig = Database['public']['Tables']['product_half_configs']['Row']
export type ProductWithHalfConfig = Product & { product_half_configs: HalfConfig[] }

// Ingredient Sub-Recipes (BOM)
export type IngredientSubRecipe = {
  id: string
  parent_ingredient_id: string
  child_ingredient_id: string
  quantity: number
  unit: string
  created_at: string
}

export type IngredientSubRecipeWithChild = IngredientSubRecipe & {
  ingredients: Pick<Ingredient, 'id' | 'name' | 'unit' | 'cost_per_unit'>
}
