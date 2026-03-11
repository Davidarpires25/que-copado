'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { revalidateStock, revalidateProducts, revalidateStorefront } from '@/lib/server/revalidate'
import { convertToBaseUnit, getBaseUnit } from '@/lib/server/unit-conversion'
import { devError } from '@/lib/server/error-messages'
import { recalculateProductsForIngredient } from './recipes'
import type {
  StockMovementFilters,
  StockAdjustmentData,
  StockPurchaseData,
  StockOverview,
  StockAlert,
  StockMovementWithDetails,
  IngredientWithStock,
  ProductWithStock,
  StockForecastItem,
  ReservedStockItem,
  ConsumptionReportItem,
  ProductionSheetIngredient,
  ProductionSheetResult,
} from '@/lib/types/stock'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns all ingredients and products that have stock tracking enabled,
 * ordered by name.
 */
export async function getStockOverview(): Promise<{ data: StockOverview | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const [ingredientsResult, productsResult] = await Promise.all([
    supabase
      .from('ingredients')
      .select('*')
      .eq('stock_tracking_enabled', true)
      .order('name'),
    supabase
      .from('products')
      .select('*')
      .eq('stock_tracking_enabled', true)
      .order('name'),
  ])

  if (ingredientsResult.error) return devError(ingredientsResult.error)
  if (productsResult.error) return devError(productsResult.error)

  return {
    data: {
      ingredients: ingredientsResult.data as IngredientWithStock[],
      products: productsResult.data as ProductWithStock[],
    },
    error: null,
  }
}

/**
 * Returns ALL ingredients and products (including non-tracked) for the stock dashboard.
 * Products are filtered to only include 'reventa' type since elaborated products
 * track stock through their ingredients.
 */
export async function getFullStockData(): Promise<{
  data: { ingredients: IngredientWithStock[]; products: ProductWithStock[] } | null
  error: string | null
}> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const [ingredientsResult, productsResult] = await Promise.all([
    supabase
      .from('ingredients')
      .select('*')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('products')
      .select('*')
      .eq('product_type', 'reventa')
      .eq('is_active', true)
      .order('name'),
  ])

  if (ingredientsResult.error) return devError(ingredientsResult.error)
  if (productsResult.error) return devError(productsResult.error)

  return {
    data: {
      ingredients: ingredientsResult.data as IngredientWithStock[],
      products: productsResult.data as ProductWithStock[],
    },
    error: null,
  }
}

/**
 * Returns items where current_stock < min_stock and tracking is enabled.
 */
export async function getStockAlerts(): Promise<{ data: StockAlert[] | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  // Run both queries in parallel
  const [ingResult, prodResult] = await Promise.all([
    supabase
      .from('ingredients')
      .select('id, name, unit, current_stock, min_stock')
      .eq('stock_tracking_enabled', true)
      .not('min_stock', 'is', null)
      .order('name'),
    supabase
      .from('products')
      .select('id, name, current_stock, min_stock')
      .eq('stock_tracking_enabled', true)
      .not('min_stock', 'is', null)
      .order('name'),
  ])

  if (ingResult.error) return devError(ingResult.error)
  if (prodResult.error) return devError(prodResult.error)

  const lowIngredients = ingResult.data
  const lowProducts = prodResult.data

  const alerts: StockAlert[] = []

  // Filter ingredients where current_stock < min_stock
  for (const ing of lowIngredients ?? []) {
    if (ing.min_stock !== null && ing.current_stock < ing.min_stock) {
      alerts.push({
        id: ing.id,
        name: ing.name,
        type: 'ingredient',
        unit: ing.unit,
        current_stock: ing.current_stock,
        min_stock: ing.min_stock,
      })
    }
  }

  // Filter products where current_stock < min_stock
  for (const prod of lowProducts ?? []) {
    if (prod.min_stock !== null && prod.current_stock < prod.min_stock) {
      alerts.push({
        id: prod.id,
        name: prod.name,
        type: 'product',
        unit: null,
        current_stock: prod.current_stock,
        min_stock: prod.min_stock,
      })
    }
  }

  return { data: alerts, error: null }
}

/**
 * Returns paginated stock movements with ingredient/product details.
 */
export async function getStockMovements(
  filters: StockMovementFilters = {}
): Promise<{ data: StockMovementWithDetails[] | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  let query = supabase
    .from('stock_movements')
    .select('*, ingredients(id, name, unit), products(id, name)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply filters
  if (filters.target_type === 'ingredient') {
    query = query.not('ingredient_id', 'is', null)
    if (filters.target_id) {
      query = query.eq('ingredient_id', filters.target_id)
    }
  } else if (filters.target_type === 'product') {
    query = query.not('product_id', 'is', null)
    if (filters.target_id) {
      query = query.eq('product_id', filters.target_id)
    }
  }

  if (filters.movement_type) {
    query = query.eq('movement_type', filters.movement_type)
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from)
  }

  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to)
  }

  const { data, error } = await query

  if (error) return devError(error)
  return { data: data as StockMovementWithDetails[], error: null }
}

/**
 * Returns ingredient consumption forecast based on historical sales data.
 * Calculates daily average and estimated days until depletion.
 */
export async function getStockForecast(
  period: '7d' | '30d' = '30d'
): Promise<{ data: StockForecastItem[] | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const periodDays = period === '7d' ? 7 : 30
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - periodDays)

  const { data: movements, error: movError } = await supabase
    .from('stock_movements')
    .select('ingredient_id, quantity')
    .eq('movement_type', 'sale')
    .not('ingredient_id', 'is', null)
    .gte('created_at', startDate.toISOString())

  if (movError) return devError(movError)
  if (!movements || movements.length === 0) return { data: [], error: null }

  // Aggregate total consumed per ingredient
  const consumptionMap = new Map<string, number>()
  for (const mov of movements) {
    if (!mov.ingredient_id) continue
    consumptionMap.set(mov.ingredient_id, (consumptionMap.get(mov.ingredient_id) ?? 0) + Math.abs(mov.quantity))
  }

  if (consumptionMap.size === 0) return { data: [], error: null }

  const ingredientIds = Array.from(consumptionMap.keys())
  const { data: ingredients, error: ingError } = await supabase
    .from('ingredients')
    .select('id, name, unit, current_stock')
    .in('id', ingredientIds)

  if (ingError) return devError(ingError)

  const result: StockForecastItem[] = (ingredients ?? []).map((ing) => {
    const total_consumed = consumptionMap.get(ing.id) ?? 0
    const daily_avg = total_consumed / periodDays
    return {
      ingredient_id: ing.id,
      name: ing.name,
      unit: ing.unit,
      current_stock: Number(ing.current_stock),
      total_consumed,
      daily_avg,
      days_remaining: daily_avg > 0 ? Number(ing.current_stock) / daily_avg : null,
    }
  })

  return { data: result, error: null }
}

/**
 * Returns products currently reserved in open table orders (mesas).
 * Only meaningful for reventa products with direct stock tracking.
 */
export async function getReservedStock(): Promise<{ data: ReservedStockItem[] | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_items(product_id, product_name, quantity, status)')
    .in('status', ['abierto', 'recibido', 'cuenta_pedida'])

  if (ordersError) return devError(ordersError)
  if (!orders || orders.length === 0) return { data: [], error: null }

  // Aggregate reserved quantities per product
  const reservedMap = new Map<string, { name: string; qty: number }>()
  for (const order of orders) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (order.order_items as any[]) ?? []
    for (const item of items) {
      if (!item.product_id || item.status === 'cancelado') continue
      const existing = reservedMap.get(item.product_id)
      if (existing) {
        existing.qty += item.quantity
      } else {
        reservedMap.set(item.product_id, { name: item.product_name, qty: item.quantity })
      }
    }
  }

  const result: ReservedStockItem[] = Array.from(reservedMap.entries()).map(([productId, { name, qty }]) => ({
    product_id: productId,
    product_name: name,
    reserved_qty: qty,
  }))

  return { data: result, error: null }
}

/**
 * Returns ingredient consumption report for a given period.
 * Ordered by total cost descending (most expensive ingredients first).
 */
export async function getConsumptionReport(
  period: '7d' | '30d' | '90d' = '30d'
): Promise<{ data: ConsumptionReportItem[] | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - periodDays)

  const { data: movements, error: movError } = await supabase
    .from('stock_movements')
    .select('ingredient_id, quantity')
    .eq('movement_type', 'sale')
    .not('ingredient_id', 'is', null)
    .gte('created_at', startDate.toISOString())

  if (movError) return devError(movError)
  if (!movements || movements.length === 0) return { data: [], error: null }

  // Aggregate per ingredient
  const aggMap = new Map<string, { total: number; count: number }>()
  for (const mov of movements) {
    if (!mov.ingredient_id) continue
    const existing = aggMap.get(mov.ingredient_id) ?? { total: 0, count: 0 }
    existing.total += Math.abs(mov.quantity)
    existing.count += 1
    aggMap.set(mov.ingredient_id, existing)
  }

  if (aggMap.size === 0) return { data: [], error: null }

  const ingredientIds = Array.from(aggMap.keys())
  const { data: ingredients, error: ingError } = await supabase
    .from('ingredients')
    .select('id, name, unit, cost_per_unit')
    .in('id', ingredientIds)

  if (ingError) return devError(ingError)

  const result: ConsumptionReportItem[] = (ingredients ?? [])
    .map((ing) => {
      const agg = aggMap.get(ing.id)!
      const total_consumed = agg.total
      const cost_per_unit = Number(ing.cost_per_unit) || 0
      return {
        ingredient_id: ing.id,
        name: ing.name,
        unit: ing.unit,
        total_consumed,
        total_cost: total_consumed * cost_per_unit,
        daily_avg: total_consumed / periodDays,
        movements_count: agg.count,
      }
    })
    .sort((a, b) => b.total_cost - a.total_cost)

  return { data: result, error: null }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Enable or disable stock tracking for an ingredient or product.
 */
export async function toggleStockTracking(
  type: 'ingredient' | 'product',
  id: string,
  enabled: boolean
): Promise<{ data: boolean | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!id) return { data: null, error: 'ID es requerido' }

  const table = type === 'ingredient' ? 'ingredients' : 'products'

  const { error } = await supabase
    .from(table)
    .update({ stock_tracking_enabled: enabled })
    .eq('id', id)

  if (error) return devError(error)

  revalidateStock()
  return { data: true, error: null }
}

/**
 * Set the minimum stock threshold for alerts.
 */
export async function updateMinStock(
  type: 'ingredient' | 'product',
  id: string,
  minStock: number | null
): Promise<{ data: boolean | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!id) return { data: null, error: 'ID es requerido' }
  if (minStock !== null && (isNaN(minStock) || minStock < 0)) {
    return { data: null, error: 'El stock minimo debe ser >= 0' }
  }

  const table = type === 'ingredient' ? 'ingredients' : 'products'

  const { error } = await supabase
    .from(table)
    .update({ min_stock: minStock })
    .eq('id', id)

  if (error) return devError(error)

  revalidateStock()
  return { data: true, error: null }
}

// ---------------------------------------------------------------------------
// Stock Mutations
// ---------------------------------------------------------------------------

/**
 * Manual stock adjustment (adjustment, waste, return).
 * Reads current stock, updates it, and records the movement.
 * Reason is required for adjustments.
 */
export async function adjustStock(
  data: StockAdjustmentData
): Promise<{ data: boolean | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  // Validations
  if (!data.id) return { data: null, error: 'ID es requerido' }
  if (data.quantity === 0) return { data: null, error: 'La cantidad no puede ser 0' }
  if (!data.reason?.trim()) return { data: null, error: 'El motivo es obligatorio para ajustes' }

  const validTypes = ['adjustment', 'waste', 'return']
  if (!validTypes.includes(data.movement_type)) {
    return { data: null, error: 'Tipo de movimiento no valido para ajuste' }
  }

  const table = data.type === 'ingredient' ? 'ingredients' : 'products'

  // Read current stock
  const { data: current, error: readError } = await supabase
    .from(table)
    .select('id, current_stock, stock_tracking_enabled')
    .eq('id', data.id)
    .single()

  if (readError) return devError(readError)
  if (!current) return { data: null, error: 'Item no encontrado' }
  if (!current.stock_tracking_enabled) {
    return { data: null, error: 'El control de stock no esta habilitado para este item' }
  }

  const previousStock = Number(current.current_stock)
  const newStock = previousStock + data.quantity

  // Update current_stock
  const { error: updateError } = await supabase
    .from(table)
    .update({ current_stock: newStock })
    .eq('id', data.id)

  if (updateError) return devError(updateError)

  // Insert stock movement record
  const movementPayload: Record<string, unknown> = {
    movement_type: data.movement_type,
    quantity: data.quantity,
    previous_stock: previousStock,
    new_stock: newStock,
    reason: data.reason.trim(),
    reference_type: 'manual',
    created_by: user.id,
  }

  if (data.type === 'ingredient') {
    movementPayload.ingredient_id = data.id
  } else {
    movementPayload.product_id = data.id
  }

  const { error: movementError } = await supabase
    .from('stock_movements')
    .insert(movementPayload)

  if (movementError) {
    // Best effort: log but don't fail the operation since stock was already updated
    if (process.env.NODE_ENV === 'development') {
      console.error('[Stock] Failed to record movement:', movementError.message)
    }
  }

  // Sync availability (best-effort)
  if (data.type === 'product') {
    // Reventa: sync this product's is_out_of_stock flag directly
    try {
      await _syncReventaProduct(supabase, data.id, newStock)
    } catch { /* best effort */ }
  } else {
    // Ingredient: re-evaluate all elaborado products that depend on it
    try {
      await _syncElaboradoAvailability(supabase)
    } catch { /* best effort */ }
  }

  revalidateStock()
  return { data: true, error: null }
}

/**
 * Register a purchase of ingredients. For each item:
 * - Increments current_stock
 * - Records a stock_movement with type 'purchase'
 * - Optionally updates the ingredient cost_per_unit
 */
export async function registerPurchase(
  data: StockPurchaseData
): Promise<{ data: boolean | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!data.items?.length) return { data: null, error: 'Debe incluir al menos un item' }

  for (const item of data.items) {
    if (!item.ingredient_id) return { data: null, error: 'ID de ingrediente requerido' }
    if (!item.quantity || item.quantity <= 0) return { data: null, error: 'La cantidad debe ser mayor a 0' }
    if (item.cost_per_unit !== undefined && item.cost_per_unit < 0) {
      return { data: null, error: 'El costo por unidad debe ser >= 0' }
    }
  }

  // Process each item
  for (const item of data.items) {
    // Read current stock
    const { data: ingredient, error: readError } = await supabase
      .from('ingredients')
      .select('id, current_stock, stock_tracking_enabled')
      .eq('id', item.ingredient_id)
      .single()

    if (readError) return devError(readError)
    if (!ingredient) return { data: null, error: `Ingrediente ${item.ingredient_id} no encontrado` }

    const previousStock = Number(ingredient.current_stock)
    const newStock = previousStock + item.quantity

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      current_stock: newStock,
    }
    if (item.cost_per_unit !== undefined) {
      updatePayload.cost_per_unit = item.cost_per_unit
    }

    // Update ingredient stock (and optionally cost)
    const { error: updateError } = await supabase
      .from('ingredients')
      .update(updatePayload)
      .eq('id', item.ingredient_id)

    if (updateError) return devError(updateError)

    // Insert stock movement
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        ingredient_id: item.ingredient_id,
        movement_type: 'purchase',
        quantity: item.quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reason: data.reason?.trim() || 'Compra de mercaderia',
        reference_type: 'purchase',
        created_by: user.id,
      })

    if (movementError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Stock] Failed to record purchase movement:', movementError.message)
      }
    }

    if (item.cost_per_unit !== undefined) {
      try {
        await recalculateProductsForIngredient(supabase, item.ingredient_id)
      } catch { /* best effort */ }
    }
  }

  // Ingredient stock increased: re-evaluate elaborado product availability (best-effort)
  try {
    await _syncElaboradoAvailability(supabase)
  } catch { /* best effort */ }

  revalidateStock()
  return { data: true, error: null }
}

/**
 * Set the initial stock for an ingredient or product.
 * This is meant for first-time inventory loading.
 */
export async function setInitialStock(
  type: 'ingredient' | 'product',
  id: string,
  quantity: number
): Promise<{ data: boolean | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!id) return { data: null, error: 'ID es requerido' }
  if (isNaN(quantity) || quantity < 0) return { data: null, error: 'La cantidad debe ser >= 0' }

  const table = type === 'ingredient' ? 'ingredients' : 'products'

  // Read current stock
  const { data: current, error: readError } = await supabase
    .from(table)
    .select('id, current_stock')
    .eq('id', id)
    .single()

  if (readError) return devError(readError)
  if (!current) return { data: null, error: 'Item no encontrado' }

  const previousStock = Number(current.current_stock)

  // Update current_stock and enable tracking
  const { error: updateError } = await supabase
    .from(table)
    .update({
      current_stock: quantity,
      stock_tracking_enabled: true,
    })
    .eq('id', id)

  if (updateError) return devError(updateError)

  // Insert stock movement
  const movementPayload: Record<string, unknown> = {
    movement_type: 'initial',
    quantity: quantity - previousStock,
    previous_stock: previousStock,
    new_stock: quantity,
    reason: 'Carga inicial de inventario',
    reference_type: 'manual',
    created_by: user.id,
  }

  if (type === 'ingredient') {
    movementPayload.ingredient_id = id
  } else {
    movementPayload.product_id = id
  }

  const { error: movementError } = await supabase
    .from('stock_movements')
    .insert(movementPayload)

  if (movementError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Stock] Failed to record initial stock movement:', movementError.message)
    }
  }

  // Sync availability for reventa products (best-effort)
  if (type === 'product') {
    try {
      await _syncReventaProduct(supabase, id, quantity)
    } catch { /* best effort */ }
  }

  revalidateStock()
  return { data: true, error: null }
}

// ---------------------------------------------------------------------------
// Theoretical Stock for Elaborated Products
// ---------------------------------------------------------------------------

/**
 * Calculates how many units of an elaborated product can be produced
 * given the current stock of its ingredients.
 *
 * Returns the minimum across all tracked ingredients (bottleneck).
 * Returns null if no ingredient has stock tracking enabled.
 */
export async function getTheoreticalStock(
  productId: string
): Promise<{ data: number | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  try {
    const stock = await _calculateTheoreticalStock(supabase, productId)
    return { data: stock, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error calculando stock teorico'
    return devError(msg)
  }
}

/**
 * Returns theoretical stock for ALL elaborated products at once.
 * Key: product ID, Value: number of producible units (or null if no tracking data).
 *
 * Optimized: uses 4 parallel bulk queries instead of N×M individual queries.
 * Calculates all theoretical stocks in memory from prefetched data.
 */
export async function getAllTheoreticalStocks(): Promise<{
  data: Record<string, number | null> | null
  error: string | null
}> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id')
    .eq('product_type', 'elaborado')
    .eq('is_active', true)

  if (prodError) return devError(prodError)
  if (!products || products.length === 0) return { data: {}, error: null }

  const productIds = products.map((p) => p.id)

  // Bulk-fetch everything needed in 3 parallel queries (replaces N×M waterfall)
  const [prResult, subResult, ingResult] = await Promise.all([
    supabase
      .from('product_recipes')
      .select(`
        product_id,
        quantity,
        recipes (
          recipe_ingredients (
            ingredient_id,
            quantity,
            unit
          )
        )
      `)
      .in('product_id', productIds),
    supabase
      .from('ingredient_sub_recipes')
      .select('parent_ingredient_id, child_ingredient_id, quantity, unit'),
    supabase
      .from('ingredients')
      .select('id, unit, waste_percentage, current_stock, stock_tracking_enabled'),
  ])

  if (prResult.error) return devError(prResult.error)
  if (subResult.error) return devError(subResult.error)
  if (ingResult.error) return devError(ingResult.error)

  // Build in-memory lookup maps
  type IngData = {
    id: string; unit: string; waste_percentage: number
    current_stock: number; stock_tracking_enabled: boolean
  }
  const ingMap = new Map<string, IngData>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ingResult.data ?? []).map((i: any) => [i.id, i])
  )

  const subMap = new Map<string, Array<{ child_ingredient_id: string; quantity: number; unit: string }>>()
  for (const sub of subResult.data ?? []) {
    const arr = subMap.get(sub.parent_ingredient_id) ?? []
    arr.push(sub)
    subMap.set(sub.parent_ingredient_id, arr)
  }

  type PREntry = {
    product_id: string; quantity: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recipes: { recipe_ingredients: Array<{ ingredient_id: string; quantity: number; unit: string }> } | any
  }
  const prMap = new Map<string, PREntry[]>()
  for (const pr of (prResult.data ?? []) as PREntry[]) {
    const arr = prMap.get(pr.product_id) ?? []
    arr.push(pr)
    prMap.set(pr.product_id, arr)
  }

  // Calculate all theoretical stocks in memory — zero additional DB calls
  const result: Record<string, number | null> = {}
  for (const product of products) {
    result[product.id] = _calcTheoreticalInMemory(product.id, prMap, ingMap, subMap)
  }

  return { data: result, error: null }
}

/**
 * Checks all active elaborated products and auto-disables those with theoretical stock = 0.
 * Restores auto-disabled products when stock recovers (only if auto_disabled = true).
 * Called after manual stock adjustments or purchases.
 */
export async function syncElaboradoAvailabilityAction(): Promise<{ data: boolean | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  await _syncElaboradoAvailability(supabase)
  revalidateStock()
  return { data: true, error: null }
}

/**
 * Re-evaluates all elaborado product availability based on current ingredient stock.
 * Updates is_out_of_stock / auto_disabled flags and revalidates the public storefront.
 * Best-effort: call from any action that changes ingredient stock.
 */
async function _syncElaboradoAvailability(supabase: SupabaseAdminClient): Promise<void> {
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, is_out_of_stock, auto_disabled')
    .eq('product_type', 'elaborado')
    .eq('is_active', true)

  if (prodError || !products || products.length === 0) return

  let anyChanged = false

  for (const product of products) {
    try {
      const theoreticalStock = await _calculateTheoreticalStock(supabase, product.id)
      if (theoreticalStock === null) continue

      if (theoreticalStock === 0 && !product.is_out_of_stock) {
        await supabase
          .from('products')
          .update({ is_out_of_stock: true, auto_disabled: true })
          .eq('id', product.id)
        anyChanged = true
      } else if (theoreticalStock > 0 && product.is_out_of_stock && product.auto_disabled) {
        await supabase
          .from('products')
          .update({ is_out_of_stock: false, auto_disabled: false })
          .eq('id', product.id)
        anyChanged = true
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Stock] Error syncing availability for product ${product.id}:`, err)
      }
    }
  }

  if (anyChanged) revalidateProducts()
}

/**
 * Toggles is_out_of_stock for an elaborado product.
 * When re-enabling manually, clears auto_disabled flag so the system
 * won't auto-restore over an admin's manual decision.
 */
export async function toggleElaboradoAvailability(
  productId: string,
  isOutOfStock: boolean
): Promise<{ data: boolean | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!productId) return { data: null, error: 'ID es requerido' }

  const { error } = await supabase
    .from('products')
    .update({ is_out_of_stock: isOutOfStock, auto_disabled: false })
    .eq('id', productId)

  if (error) return devError(error)

  revalidateStock()
  revalidateStorefront()
  return { data: true, error: null }
}

// ---------------------------------------------------------------------------
// In-memory calculation helpers (no DB calls — used by getAllTheoreticalStocks)
// ---------------------------------------------------------------------------

type IngData = {
  id: string; unit: string; waste_percentage: number
  current_stock: number; stock_tracking_enabled: boolean
}
type SubData = { child_ingredient_id: string; quantity: number; unit: string }
type PREntry = {
  product_id: string; quantity: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recipes: { recipe_ingredients: Array<{ ingredient_id: string; quantity: number; unit: string }> } | any
}
type Req = { requiredQty: number; currentStock: number; trackingEnabled: boolean }

function _calcTheoreticalInMemory(
  productId: string,
  prMap: Map<string, PREntry[]>,
  ingMap: Map<string, IngData>,
  subMap: Map<string, SubData[]>
): number | null {
  const productRecipes = prMap.get(productId)
  if (!productRecipes || productRecipes.length === 0) return null

  const requirements = new Map<string, Req>()

  for (const pr of productRecipes) {
    const multiplier = pr.quantity ?? 1
    const recipe = pr.recipes
    if (!recipe?.recipe_ingredients) continue

    for (const ri of recipe.recipe_ingredients) {
      const effectiveUnit = ri.unit ?? ingMap.get(ri.ingredient_id)?.unit ?? ri.unit
      _collectReqsInMemory(
        ri.ingredient_id,
        multiplier * ri.quantity,
        effectiveUnit,
        requirements,
        ingMap,
        subMap,
        new Set<string>()
      )
    }
  }

  let minProducible: number | null = null
  let hasAnyTracked = false

  for (const [, req] of requirements) {
    if (!req.trackingEnabled) continue
    hasAnyTracked = true
    if (req.requiredQty <= 0) continue
    const producible = Math.floor(req.currentStock / req.requiredQty)
    if (minProducible === null || producible < minProducible) {
      minProducible = producible
    }
  }

  if (!hasAnyTracked) return null
  return minProducible ?? 0
}

function _collectReqsInMemory(
  ingredientId: string,
  quantityInRecipeUnit: number,
  recipeUnit: string,
  requirements: Map<string, Req>,
  ingMap: Map<string, IngData>,
  subMap: Map<string, SubData[]>,
  visited: Set<string>
): void {
  if (visited.has(ingredientId)) return
  visited.add(ingredientId)

  const ingredient = ingMap.get(ingredientId)
  if (!ingredient) return
  if (getBaseUnit(recipeUnit) !== getBaseUnit(ingredient.unit)) return

  const baseQty = convertToBaseUnit(quantityInRecipeUnit, recipeUnit)
  const wastePct = Number(ingredient.waste_percentage) || 0
  const wasteFactor = 1 - wastePct / 100
  const actualQty = wasteFactor > 0 ? baseQty / wasteFactor : baseQty

  const subItems = subMap.get(ingredientId)
  if (subItems && subItems.length > 0) {
    for (const sub of subItems) {
      _collectReqsInMemory(
        sub.child_ingredient_id,
        sub.quantity * actualQty,
        sub.unit,
        requirements,
        ingMap,
        subMap,
        new Set(visited)
      )
    }
  } else {
    const existing = requirements.get(ingredientId)
    if (existing) {
      existing.requiredQty += actualQty
    } else {
      requirements.set(ingredientId, {
        requiredQty: actualQty,
        currentStock: Number(ingredient.current_stock),
        trackingEnabled: ingredient.stock_tracking_enabled,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers (not exported)
// ---------------------------------------------------------------------------

type SupabaseAdminClient = Awaited<ReturnType<typeof createAdminClient>>

/**
 * Auto-disables a reventa product when its stock reaches 0.
 * Restores it when stock recovers (ONLY if auto_disabled=true).
 */
async function _syncReventaProduct(
  supabase: SupabaseAdminClient,
  productId: string,
  newStock: number
): Promise<void> {
  const { data: product } = await supabase
    .from('products')
    .select('is_out_of_stock, auto_disabled')
    .eq('id', productId)
    .single()

  if (!product) return

  if (newStock <= 0 && !product.is_out_of_stock) {
    await supabase
      .from('products')
      .update({ is_out_of_stock: true, auto_disabled: true })
      .eq('id', productId)
    revalidateProducts()
    revalidateStorefront()
  } else if (newStock > 0 && product.is_out_of_stock && product.auto_disabled) {
    await supabase
      .from('products')
      .update({ is_out_of_stock: false, auto_disabled: false })
      .eq('id', productId)
    revalidateProducts()
    revalidateStorefront()
  }
}

type IngredientRequirements = Map<string, {
  requiredQty: number
  currentStock: number
  trackingEnabled: boolean
}>

async function _calculateTheoreticalStock(
  supabase: SupabaseAdminClient,
  productId: string
): Promise<number | null> {
  const { data: productRecipes, error: prError } = await supabase
    .from('product_recipes')
    .select(`
      quantity,
      recipes (
        id,
        recipe_ingredients (
          quantity,
          unit,
          ingredient_id,
          ingredients (
            id,
            unit,
            waste_percentage,
            current_stock,
            stock_tracking_enabled
          )
        )
      )
    `)
    .eq('product_id', productId)

  if (prError || !productRecipes || productRecipes.length === 0) return null

  const requirements: IngredientRequirements = new Map()

  for (const pr of productRecipes) {
    const recipeMultiplier = pr.quantity ?? 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe = pr.recipes as any
    if (!recipe?.recipe_ingredients) continue

    for (const ri of recipe.recipe_ingredients) {
      const ingredient = ri.ingredients
      if (!ingredient) continue

      const effectiveUnit = ri.unit ?? ingredient.unit
      await _collectIngredientRequirements(
        supabase,
        ingredient.id,
        recipeMultiplier * ri.quantity,
        effectiveUnit,
        requirements,
        new Set<string>()
      )
    }
  }

  let minProducible: number | null = null
  let hasAnyTracked = false

  for (const [, req] of requirements) {
    if (!req.trackingEnabled) continue
    hasAnyTracked = true
    if (req.requiredQty <= 0) continue
    const producible = Math.floor(req.currentStock / req.requiredQty)
    if (minProducible === null || producible < minProducible) {
      minProducible = producible
    }
  }

  if (!hasAnyTracked) return null
  return minProducible ?? 0
}

async function _collectIngredientRequirements(
  supabase: SupabaseAdminClient,
  ingredientId: string,
  quantityInRecipeUnit: number,
  recipeUnit: string,
  requirements: IngredientRequirements,
  visited: Set<string>
): Promise<void> {
  if (visited.has(ingredientId)) return
  visited.add(ingredientId)

  const { data: ingredient } = await supabase
    .from('ingredients')
    .select('id, unit, waste_percentage, current_stock, stock_tracking_enabled')
    .eq('id', ingredientId)
    .single()

  if (!ingredient) return
  if (getBaseUnit(recipeUnit) !== getBaseUnit(ingredient.unit)) return

  const baseQty = convertToBaseUnit(quantityInRecipeUnit, recipeUnit)
  const wastePct = Number(ingredient.waste_percentage) || 0
  const wasteFactor = 1 - wastePct / 100
  const actualQty = wasteFactor > 0 ? baseQty / wasteFactor : baseQty

  const { data: subItems } = await supabase
    .from('ingredient_sub_recipes')
    .select('child_ingredient_id, quantity, unit')
    .eq('parent_ingredient_id', ingredientId)

  if (subItems && subItems.length > 0) {
    for (const sub of subItems) {
      await _collectIngredientRequirements(
        supabase,
        sub.child_ingredient_id,
        sub.quantity * actualQty,
        sub.unit,
        requirements,
        new Set(visited)
      )
    }
  } else {
    const existing = requirements.get(ingredientId)
    if (existing) {
      existing.requiredQty += actualQty
    } else {
      requirements.set(ingredientId, {
        requiredQty: actualQty,
        currentStock: Number(ingredient.current_stock),
        trackingEnabled: ingredient.stock_tracking_enabled,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Production Sheet (Ficha Técnica)
// ---------------------------------------------------------------------------

type PSIngData = {
  id: string
  name: string
  unit: string
  waste_percentage: number
  cost_per_unit: number
  current_stock: number
  stock_tracking_enabled: boolean
}

type PSSubItem = { child_ingredient_id: string; quantity: number; unit: string }

function _buildPSIngredientNode(
  ing: PSIngData,
  netQtyBase: number,
  grossQtyBase: number,
  subMap: Map<string, PSSubItem[]>,
  ingMap: Map<string, PSIngData>,
  visited: Set<string>
): ProductionSheetIngredient {
  const node: ProductionSheetIngredient = {
    ingredient_id: ing.id,
    name: ing.name,
    unit: ing.unit,
    net_qty_per_unit: netQtyBase,
    gross_qty_per_unit: grossQtyBase,
    waste_pct: Number(ing.waste_percentage) || 0,
    cost_per_unit: Number(ing.cost_per_unit) || 0,
    current_stock: Number(ing.current_stock),
    stock_tracking_enabled: ing.stock_tracking_enabled,
  }

  const subs = subMap.get(ing.id) ?? []
  if (subs.length > 0 && !visited.has(ing.id)) {
    const newVisited = new Set(visited)
    newVisited.add(ing.id)

    const children: ProductionSheetIngredient[] = []
    for (const sub of subs) {
      const childIng = ingMap.get(sub.child_ingredient_id)
      if (!childIng) continue
      // sub.quantity per 1 parent base unit × grossQtyBase parent units → child qty in sub.unit
      const childNetBase = convertToBaseUnit(sub.quantity * grossQtyBase, sub.unit)
      const childWastePct = Number(childIng.waste_percentage) || 0
      const childWasteFactor = 1 - childWastePct / 100
      const childGrossBase = childWasteFactor > 0 ? childNetBase / childWasteFactor : childNetBase
      children.push(_buildPSIngredientNode(childIng, childNetBase, childGrossBase, subMap, ingMap, newVisited))
    }
    if (children.length > 0) node.children = children
  }

  return node
}

function _collectPSLeaves(
  node: ProductionSheetIngredient,
  shoppingMap: Map<string, { net: number; gross: number; item: ProductionSheetIngredient }>
): void {
  if (node.children && node.children.length > 0) {
    for (const child of node.children) _collectPSLeaves(child, shoppingMap)
  } else {
    const existing = shoppingMap.get(node.ingredient_id)
    if (existing) {
      existing.net += node.net_qty_per_unit
      existing.gross += node.gross_qty_per_unit
    } else {
      shoppingMap.set(node.ingredient_id, { net: node.net_qty_per_unit, gross: node.gross_qty_per_unit, item: node })
    }
  }
}

/**
 * Builds a production sheet for a given elaborated product.
 * Returns per-unit quantities (multiply by desired quantity on the frontend).
 */
export async function getProductionSheet(productId: string): Promise<{
  data: ProductionSheetResult | null
  error: string | null
}> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!productId) return { data: null, error: 'ID es requerido' }

  // 3 parallel queries
  const [productResult, productRecipesResult, subRecipesResult] = await Promise.all([
    supabase.from('products').select('id, name').eq('id', productId).single(),
    supabase
      .from('product_recipes')
      .select(`
        quantity,
        recipes (
          id,
          name,
          recipe_ingredients (
            ingredient_id,
            quantity,
            unit,
            ingredients (
              id, name, unit, waste_percentage, cost_per_unit, current_stock, stock_tracking_enabled
            )
          )
        )
      `)
      .eq('product_id', productId),
    supabase
      .from('ingredient_sub_recipes')
      .select('parent_ingredient_id, child_ingredient_id, quantity, unit'),
  ])

  if (productResult.error) return devError(productResult.error)
  if (!productResult.data) return { data: null, error: 'Producto no encontrado' }
  if (productRecipesResult.error) return devError(productRecipesResult.error)
  if (subRecipesResult.error) return devError(subRecipesResult.error)

  const product = productResult.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productRecipes: any[] = productRecipesResult.data ?? []
  const allSubRecipes = subRecipesResult.data ?? []

  // Build maps
  const subMap = new Map<string, PSSubItem[]>()
  for (const sub of allSubRecipes) {
    const arr = subMap.get(sub.parent_ingredient_id) ?? []
    arr.push({ child_ingredient_id: sub.child_ingredient_id, quantity: Number(sub.quantity), unit: sub.unit })
    subMap.set(sub.parent_ingredient_id, arr)
  }

  const ingMap = new Map<string, PSIngData>()
  for (const pr of productRecipes) {
    const recipe = pr.recipes
    if (!recipe?.recipe_ingredients) continue
    for (const ri of recipe.recipe_ingredients) {
      if (ri.ingredients) ingMap.set(ri.ingredients.id, ri.ingredients)
    }
  }

  // Fetch sub-recipe children that are not yet in ingMap
  const missingIds = Array.from(
    new Set(allSubRecipes.map((s) => s.child_ingredient_id))
  ).filter((id) => !ingMap.has(id))

  if (missingIds.length > 0) {
    const { data: extraIngs } = await supabase
      .from('ingredients')
      .select('id, name, unit, waste_percentage, cost_per_unit, current_stock, stock_tracking_enabled')
      .in('id', missingIds)
    for (const ing of extraIngs ?? []) ingMap.set(ing.id, ing)
  }

  // Build production sheet tree
  const recipes: ProductionSheetResult['recipes'] = []
  const shoppingMap = new Map<string, { net: number; gross: number; item: ProductionSheetIngredient }>()

  for (const pr of productRecipes) {
    const recipe = pr.recipes
    if (!recipe) continue

    const multiplier = Number(pr.quantity) || 1
    const ingredients: ProductionSheetIngredient[] = []

    for (const ri of recipe.recipe_ingredients ?? []) {
      const ing = ri.ingredients as PSIngData
      if (!ing) continue

      const effectiveUnit: string = ri.unit ?? ing.unit
      const netBase = convertToBaseUnit(Number(ri.quantity) * multiplier, effectiveUnit)
      const wastePct = Number(ing.waste_percentage) || 0
      const wasteFactor = 1 - wastePct / 100
      const grossBase = wasteFactor > 0 ? netBase / wasteFactor : netBase

      const node = _buildPSIngredientNode(ing, netBase, grossBase, subMap, ingMap, new Set<string>())
      ingredients.push(node)
      _collectPSLeaves(node, shoppingMap)
    }

    recipes.push({ recipe_id: recipe.id, recipe_name: recipe.name, multiplier, ingredients })
  }

  const shopping_list = Array.from(shoppingMap.values()).map(({ net, gross, item }) => ({
    ingredient_id: item.ingredient_id,
    name: item.name,
    unit: item.unit,
    net_qty_per_unit: net,
    gross_qty_per_unit: gross,
    cost_per_unit: item.cost_per_unit,
    current_stock: item.current_stock,
    stock_tracking_enabled: item.stock_tracking_enabled,
  }))

  return {
    data: { product_id: product.id, product_name: product.name, recipes, shopping_list },
    error: null,
  }
}

// ---------------------------------------------------------------------------
// Pre-sale Stock Check (POS)
// ---------------------------------------------------------------------------

export interface StockCheckItem {
  product_id: string
  quantity: number
}

export interface StockWarning {
  product_id: string
  product_name: string
  product_type: 'elaborado' | 'reventa'
  requested: number
  available: number | null
}

/**
 * Pre-checks stock availability for a list of items before confirming a sale.
 *
 * Returns only the items that would result in negative or insufficient stock.
 * An empty array means everything is OK.
 *
 * This is informational only -- it never blocks the sale.
 * If the check itself fails for any reason, it returns an empty array
 * so the POS flow is never interrupted.
 */
export async function checkStockForItems(
  items: StockCheckItem[]
): Promise<{ data: StockWarning[] | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!items || items.length === 0) return { data: [], error: null }

  try {
    // De-duplicate items by product_id, summing quantities
    const consolidated = new Map<string, number>()
    for (const item of items) {
      consolidated.set(
        item.product_id,
        (consolidated.get(item.product_id) ?? 0) + item.quantity
      )
    }

    const productIds = Array.from(consolidated.keys())

    // Fetch all products in a single query
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, product_type, current_stock, stock_tracking_enabled')
      .in('id', productIds)

    if (prodError || !products) return { data: [], error: null }

    const warnings: StockWarning[] = []

    for (const product of products) {
      const requested = consolidated.get(product.id) ?? 0

      if (product.product_type === 'reventa') {
        // Direct stock check -- only if tracking is enabled
        if (!product.stock_tracking_enabled) continue
        const available = Number(product.current_stock)
        if (available < requested) {
          warnings.push({
            product_id: product.id,
            product_name: product.name,
            product_type: 'reventa',
            requested,
            available,
          })
        }
      } else if (product.product_type === 'elaborado') {
        // Theoretical stock via recipes/ingredients
        try {
          const theoreticalStock = await _calculateTheoreticalStock(supabase, product.id)
          if (theoreticalStock !== null && theoreticalStock < requested) {
            warnings.push({
              product_id: product.id,
              product_name: product.name,
              product_type: 'elaborado',
              requested,
              available: theoreticalStock,
            })
          }
        } catch {
          // Skip this product silently -- don't block the sale
        }
      }
    }

    return { data: warnings, error: null }
  } catch {
    // Graceful degradation: never block the POS flow
    return { data: [], error: null }
  }
}
