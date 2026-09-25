import type { Ingredient, Product } from './database'

// ---------------------------------------------------------------------------
// Movement Types
// ---------------------------------------------------------------------------

/** Types of stock movements */
export type StockMovementType = 'purchase' | 'adjustment' | 'waste' | 'initial' | 'sale' | 'sale_reversal'

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
  /**
   * `oculto`: el sistema dejo de ofrecer este producto. No es un insumo bajo,
   * es una decision que el sistema ya tomo, y hasta ahora la tomaba en
   * silencio: tres pizzas desaparecieron del catalogo y el unico rastro era
   * "Salsa de tomate: 0" en otra lista, sin nada que conectara las dos cosas.
   */
  type: 'ingredient' | 'product' | 'oculto'
  unit: string | null
  current_stock: number
  min_stock: number
  /** Solo en `oculto`: que falta para poder volver a hacerlo. */
  falta?: string[]
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

/**
 * Una linea de la compra: un insumo o un producto de reventa, uno de los dos.
 * Los mismos nombres que las columnas de `stock_movements`.
 */
export type StockPurchaseItem = (
  | { ingredient_id: string; product_id?: never }
  | { product_id: string; ingredient_id?: never }
) & {
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
  movements_count: number
}

// ---------------------------------------------------------------------------
// Movement type labels (for UI)
// ---------------------------------------------------------------------------

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  purchase: 'Compra',
  adjustment: 'Ajuste',
  waste: 'Desperdicio',
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
