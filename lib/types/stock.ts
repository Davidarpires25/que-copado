import type { Ingredient, Product } from './database'

// ---------------------------------------------------------------------------
// Movement Types
// ---------------------------------------------------------------------------

/** Types of stock movements */
export type StockMovementType = 'purchase' | 'adjustment' | 'waste' | 'return' | 'initial' | 'sale' | 'sale_reversal'

export type StockReferenceType = 'manual' | 'purchase' | 'order'

// ---------------------------------------------------------------------------
// Stock Movement
// ---------------------------------------------------------------------------

export interface StockMovement {
  id: string
  ingredient_id: string | null
  product_id: string | null
  movement_type: StockMovementType
  quantity: number
  previous_stock: number
  new_stock: number
  reason: string | null
  reference_type: StockReferenceType | null
  order_id: string | null
  created_by: string | null
  created_at: string
}

export interface StockMovementWithDetails extends StockMovement {
  ingredients: Pick<Ingredient, 'id' | 'name' | 'unit'> | null
  products: Pick<Product, 'id' | 'name'> | null
}

// ---------------------------------------------------------------------------
// Stock Alert
// ---------------------------------------------------------------------------

export interface StockAlert {
  id: string
  name: string
  type: 'ingredient' | 'product'
  unit: string | null
  current_stock: number
  min_stock: number
}

// ---------------------------------------------------------------------------
// Extended entities with stock fields
// ---------------------------------------------------------------------------

export interface IngredientWithStock extends Ingredient {
  current_stock: number
  min_stock: number | null
  stock_tracking_enabled: boolean
}

export interface ProductWithStock extends Product {
  current_stock: number
  min_stock: number | null
  stock_tracking_enabled: boolean
}

// ---------------------------------------------------------------------------
// Filters & Input Data
// ---------------------------------------------------------------------------

export interface StockMovementFilters {
  target_type?: 'ingredient' | 'product'
  target_id?: string
  movement_type?: StockMovementType
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export interface StockAdjustmentData {
  type: 'ingredient' | 'product'
  id: string
  quantity: number
  movement_type: StockMovementType
  reason: string
}

export interface StockPurchaseItem {
  ingredient_id: string
  target_type?: 'ingredient' | 'product'
  quantity: number
  cost_per_unit?: number
}

export interface StockPurchaseData {
  items: StockPurchaseItem[]
  reason?: string
}

// ---------------------------------------------------------------------------
// Stock Overview response
// ---------------------------------------------------------------------------

export interface StockOverview {
  ingredients: IngredientWithStock[]
  products: ProductWithStock[]
}

// ---------------------------------------------------------------------------
// Forecast & Analytics
// ---------------------------------------------------------------------------

export interface StockForecastItem {
  ingredient_id: string
  name: string
  unit: string
  current_stock: number
  total_consumed: number
  daily_avg: number
  days_remaining: number | null  // null if daily_avg = 0 (no consumption)
}

export interface ReservedStockItem {
  product_id: string
  product_name: string
  reserved_qty: number
}

export interface ConsumptionReportItem {
  ingredient_id: string
  name: string
  unit: string
  total_consumed: number
  total_cost: number
  daily_avg: number
  movements_count: number
}

// ---------------------------------------------------------------------------
// Movement type labels (for UI)
// ---------------------------------------------------------------------------

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  purchase: 'Compra',
  adjustment: 'Ajuste',
  waste: 'Desperdicio',
  return: 'Devolucion',
  initial: 'Carga inicial',
  sale: 'Venta',
  sale_reversal: 'Reversion de venta',
}

// ---------------------------------------------------------------------------
// Production Sheet (Ficha Técnica)
// ---------------------------------------------------------------------------

export interface ProductionSheetIngredient {
  ingredient_id: string
  name: string
  unit: string                   // base unit (kg, litro, unidad)
  net_qty_per_unit: number       // net qty needed per 1 product (before waste)
  gross_qty_per_unit: number     // gross qty needed per 1 product (after waste)
  waste_pct: number
  cost_per_unit: number
  current_stock: number
  stock_tracking_enabled: boolean
  children?: ProductionSheetIngredient[]  // sub-ingredients if compound
}

export interface ProductionSheetRecipe {
  recipe_id: string
  recipe_name: string
  multiplier: number             // product_recipes.quantity
  ingredients: ProductionSheetIngredient[]
}

export interface ProductionSheetShoppingItem {
  ingredient_id: string
  name: string
  unit: string
  net_qty_per_unit: number
  gross_qty_per_unit: number
  cost_per_unit: number
  current_stock: number
  stock_tracking_enabled: boolean
}

export interface ProductionSheetResult {
  product_id: string
  product_name: string
  recipes: ProductionSheetRecipe[]
  shopping_list: ProductionSheetShoppingItem[]  // leaf ingredients, summed & deduplicated
}
