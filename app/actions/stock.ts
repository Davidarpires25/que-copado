'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { revalidateStock, revalidateStorefront } from '@/lib/server/revalidate'
import { convertToBaseUnit, getBaseUnit } from '@/lib/server/unit-conversion'
import { escalarComponente } from '@/lib/server/sub-recipes'
import { devError } from '@/lib/server/error-messages'
import { recalculateProductsForIngredient } from './recipes'
import { syncAvailability, calcularStockTeorico, syncReventaProduct, insumosQueFaltan, detalleDeInsumos, cargarRecetasEnMemoria, stockTeoricoEnMemoria } from '@/lib/server/stock-deduction'
import type {
  StockMovementFilters,
  StockAdjustmentData,
  StockPurchaseData,
  StockOverview,
  StockAlert,
  StockMovementWithDetails,
  IngredientWithStock,
  ProductWithStock,
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

  // Sin el filtro de `min_stock is not null`: un item en rojo es una alerta
  // aunque nadie le haya puesto minimo. Antes, vender de mas algo sin minimo
  // definido dejaba el stock en negativo sin que apareciera en ningun lado —el
  // aviso existia, pero moria en un console.error del servidor—.
  const [ingResult, prodResult] = await Promise.all([
    supabase
      .from('ingredients')
      .select('id, name, unit, current_stock, min_stock')
      .eq('stock_tracking_enabled', true)
      .order('name'),
    supabase
      .from('products')
      .select('id, name, current_stock, min_stock')
      .eq('stock_tracking_enabled', true)
      .order('name'),
  ])

  if (ingResult.error) return devError(ingResult.error)
  if (prodResult.error) return devError(prodResult.error)

  const lowIngredients = ingResult.data
  const lowProducts = prodResult.data

  const alerts: StockAlert[] = []

  // En rojo, o por debajo del minimo si tiene uno.
  for (const ing of lowIngredients ?? []) {
    if (ing.current_stock < 0 || (ing.min_stock !== null && ing.current_stock < ing.min_stock)) {
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

  for (const prod of lowProducts ?? []) {
    if (prod.current_stock < 0 || (prod.min_stock !== null && prod.current_stock < prod.min_stock)) {
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

  // Lo que el sistema dejo de ofrecer, y por que.
  //
  // Esconder un producto es una decision comercial, y se tomaba sin avisar: las
  // tres pizzas desaparecieron del catalogo y el unico rastro era un
  // "Salsa de tomate: 0" en la lista de arriba, sin nada que conectara una cosa
  // con la otra. Quien atiende se entero por la calle.
  //
  // Solo los que apago el sistema —`auto_disabled`—: si una persona lo marco
  // agotado a mano, ya sabe por que.
  const { data: escondidos } = await supabase
    .from('products')
    .select('id, name, product_type, current_stock, product_components!parent_id (products:component_id (name, is_out_of_stock, is_active))')
    .eq('is_out_of_stock', true)
    .eq('auto_disabled', true)
    .eq('is_active', true)
    .order('name')

  if (escondidos && escondidos.length > 0) {
    // Los nombres de todos los insumos, de una: son pocos productos escondidos
    // pero cada uno puede nombrar varios insumos, y preguntarlos de a uno seria
    // un viaje por insumo.
    const porProducto = await Promise.all(
      escondidos.map(async (prod) => ({
        prod,
        faltanIds: prod.product_type === 'reventa' ? [] : await insumosQueFaltan(supabase, prod.id),
      }))
    )

    const todosLosIds = [...new Set(porProducto.flatMap((x) => x.faltanIds))]
    const nombres = new Map<string, string>()
    if (todosLosIds.length > 0) {
      const { data: ings } = await supabase
        .from('ingredients')
        .select('id, name')
        .in('id', todosLosIds)
      for (const i of ings ?? []) nombres.set(i.id, i.name)
    }

    for (const { prod, faltanIds } of porProducto) {
      const falta = faltanIds.map((id) => nombres.get(id)).filter((n): n is string => !!n)

      // Un combo tambien se frena por un componente agotado, que no es un
      // insumo sino otro producto del catalogo.
      const componentes = (prod.product_components ?? []) as unknown as {
        products: { name: string; is_out_of_stock: boolean; is_active: boolean } | null
      }[]
      for (const c of componentes) {
        if (c.products && (c.products.is_out_of_stock || !c.products.is_active)) {
          falta.push(c.products.name)
        }
      }

      // Un reventa se esconde por su propio stock, y ese numero ya va abajo.
      if (prod.product_type === 'reventa' && falta.length === 0) {
        falta.push(prod.name)
      }

      alerts.push({
        id: prod.id,
        name: prod.name,
        type: 'oculto',
        unit: null,
        current_stock: prod.current_stock ?? 0,
        min_stock: 0,
        falta: [...new Set(falta)],
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

  // Un compuesto se resuelve a sus componentes al vender, asi que su propio
  // stock nunca bajaria: quedaria congelado mostrando un numero que miente.
  if (type === 'ingredient' && enabled) {
    const { count } = await supabase
      .from('ingredient_sub_recipes')
      .select('id', { count: 'exact', head: true })
      .eq('parent_ingredient_id', id)

    if ((count ?? 0) > 0) {
      return {
        data: null,
        error: 'Este ingrediente se arma con otros, asi que el stock se controla sobre sus componentes',
      }
    }
  }

  const { error } = await supabase
    .from(table)
    .update({ stock_tracking_enabled: enabled })
    .eq('id', id)

  if (error) return devError(error)

  // Sin revalidar a proposito. `revalidateStock()` incluye `/admin/stock`, que es
  // la pagina donde esta parado quien apreto el interruptor: revalidarla obliga a
  // re-renderizar el server component y la pantalla salta al tope. Quien estaba
  // revisando una tabla larga pierde el lugar en cada activacion.
  //
  // No hace falta: la tabla ya aplica el cambio en su estado y lo revierte si
  // esto falla.
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

  // Mismo criterio que `toggleStockTracking`: no se revalida `/admin/stock`
  // porque es la pagina desde donde se edita, y revalidarla mueve la pantalla.
  // Cambiar un umbral no mueve stock ni deja movimiento: la fila se actualiza
  // sola.
  return { data: true, error: null }
}

// ---------------------------------------------------------------------------
// Stock Mutations
// ---------------------------------------------------------------------------

/**
 * Manual stock adjustment.
 * Reads current stock, updates it, and records the movement.
 *
 * Dos movimientos posibles, que corresponden a las dos intenciones reales:
 *  - 'adjustment': correccion de inventario. El delta puede ser + o -, y el
 *    motivo es opcional (cae en DEFAULT_ADJUSTMENT_REASON).
 *  - 'waste': merma. Siempre resta, y el motivo es obligatorio.
 */
const DEFAULT_ADJUSTMENT_REASON = 'Recuento de inventario'

export async function adjustStock(
  data: StockAdjustmentData
): Promise<{ data: boolean | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  // Validations
  if (!data.id) return { data: null, error: 'ID es requerido' }
  if (data.quantity === 0) return { data: null, error: 'La cantidad no puede ser 0' }

  const validTypes = ['adjustment', 'waste']
  if (!validTypes.includes(data.movement_type)) {
    return { data: null, error: 'Tipo de movimiento no valido para ajuste' }
  }

  if (data.movement_type === 'waste') {
    if (data.quantity > 0) {
      return { data: null, error: 'La merma siempre resta stock' }
    }
    if (!data.reason?.trim()) {
      return { data: null, error: 'El motivo es obligatorio para registrar merma' }
    }
  }

  const reason = data.reason?.trim() || DEFAULT_ADJUSTMENT_REASON

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
    reason,
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
      await syncReventaProduct(supabase, data.id, newStock)
    } catch { /* best effort */ }
  } else {
    // Ingredient: re-evaluate all elaborado products that depend on it
    try {
      await syncAvailability(supabase)
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
/**
 * Registra una compra: suma stock, actualiza costos y deja el historial.
 *
 * Todo en una sola llamada. Antes recorria las lineas haciendo tres viajes por
 * cada una --leer, actualizar, insertar el movimiento-- y ademas no era
 * atomica: si la linea 5 de 10 fallaba, las cuatro primeras quedaban aplicadas
 * y no habia forma de saber cual mitad habia entrado. Peor, si fallaba el
 * insert del movimiento el stock ya habia cambiado y el error moria en un
 * console.error de desarrollo: el stock quedaba alto y el historial no lo
 * explicaba.
 *
 * Ese historial es lo que permitio reconstruir hoy cuanto morron se habia usado
 * de verdad. Un movimiento que falta es un numero que despues nadie recupera.
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

  const { data: resultado, error } = await supabase.rpc('registrar_compra_de_stock', {
    p_items: data.items.map((item) => ({
      id: item.ingredient_id,
      cantidad: item.quantity,
      costo: item.cost_per_unit ?? null,
    })),
    p_motivo: data.reason?.trim() || null,
  })

  if (error) return devError(error)

  // Solo los insumos a los que les cambio el costo obligan a recalcular los
  // productos que los usan. Set porque el mismo insumo puede venir dos veces.
  const cambiaronCosto = [...new Set((resultado?.cambiaron_costo ?? []) as string[])]
  for (const ingredientId of cambiaronCosto) {
    try {
      await recalculateProductsForIngredient(supabase, ingredientId)
    } catch { /* best effort: el costo se puede recalcular despues, la compra ya entro */ }
  }

  // Entro stock: puede haber productos que vuelvan a estar disponibles.
  try {
    await syncAvailability(supabase)
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
      await syncReventaProduct(supabase, id, quantity)
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
    const stock = await calcularStockTeorico(supabase, productId)
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

  // La misma carga que usa el barrido: tres consultas y despues todo en
  // memoria. Estaba escrita aca y el barrido tenia su propia cascada.
  const cargado = await cargarRecetasEnMemoria(supabase, products.map((p) => p.id))
  if (!cargado) return { data: {}, error: null }

  const result: Record<string, number | null> = {}
  for (const product of products) {
    result[product.id] = await stockTeoricoEnMemoria(product.id, cargado)
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

  await syncAvailability(supabase)
  revalidateStock()
  return { data: true, error: null }
}

/**
 * Marca un producto elaborado como disponible o agotado, a mano.
 *
 * Marcarlo disponible deja escrito que lo decidio una persona
 * —`forzado_disponible`—, y eso es lo que impide que el barrido se lo vuelva a
 * apagar al siguiente movimiento de stock. Marcarlo agotado suelta las dos
 * marcas: vuelve a ser una decision del sistema.
 *
 * Es la misma escritura que hace `toggleProductStock` desde la pantalla de
 * productos. Estaban separadas y no hacian lo mismo: aquella no limpiaba
 * `auto_disabled`, y dejaba el producto en un estado que el barrido no produce.
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
    .update({
      is_out_of_stock: isOutOfStock,
      auto_disabled: false,
      forzado_disponible: !isOutOfStock,
    })
    .eq('id', productId)

  if (error) return devError(error)

  revalidateStock()
  revalidateStorefront()
  return { data: true, error: null }
}

/**
 * Re-evaluates all elaborado product availability based on current ingredient stock.
 * Updates is_out_of_stock / auto_disabled flags and revalidates the public storefront.
 * Best-effort: call from any action that changes ingredient stock.
 */


// ---------------------------------------------------------------------------
// Internal helpers (not exported)
// ---------------------------------------------------------------------------


/**
 * Auto-disables a reventa product when its stock reaches 0.
 * Restores it when stock recovers (ONLY if auto_disabled=true).
 */




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
  yield_quantity: number | null
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
      // La linea se carga como se cocina ("1 kg de mayonesa") junto al
      // rendimiento del compuesto ("rinde 1,5 kg"); escalarComponente divide.
      const childNetBase = convertToBaseUnit(
        escalarComponente(sub.quantity, grossQtyBase, ing.yield_quantity),
        sub.unit
      )
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
              id, name, unit, waste_percentage, cost_per_unit, current_stock, stock_tracking_enabled, yield_quantity
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
      .select('id, name, unit, waste_percentage, cost_per_unit, current_stock, stock_tracking_enabled, yield_quantity')
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

    // Separate reventa and elaborado products
    const reventaWarnings: StockWarning[] = []
    const elaboradoProducts: { id: string; name: string; requested: number }[] = []

    for (const product of products) {
      const requested = consolidated.get(product.id) ?? 0
      if (product.product_type === 'reventa') {
        if (!product.stock_tracking_enabled) continue
        const available = Number(product.current_stock)
        if (available < requested) {
          reventaWarnings.push({
            product_id: product.id,
            product_name: product.name,
            product_type: 'reventa',
            requested,
            available,
          })
        }
      } else if (product.product_type === 'elaborado') {
        elaboradoProducts.push({ id: product.id, name: product.name, requested })
      }
    }

    // If there are elaborado products, fetch required recipe/ingredient data once
    if (elaboradoProducts.length > 0) {
      // La misma carga que usa el barrido y la pantalla de stock. Era la
      // tercera copia de las mismas tres consultas y los mismos tres Maps.
      const cargado = await cargarRecetasEnMemoria(supabase, elaboradoProducts.map((p) => p.id))
      if (!cargado) return { data: warnings, error: null }

      for (const prod of elaboradoProducts) {
        const theoreticalStock = await stockTeoricoEnMemoria(prod.id, cargado)
        if (theoreticalStock !== null && theoreticalStock < prod.requested) {
          warnings.push({
            product_id: prod.id,
            product_name: prod.name,
            product_type: 'elaborado',
            requested: prod.requested,
            available: theoreticalStock,
          })
        }
      }
    }

    // Merge reventa warnings
    return { data: [...warnings, ...reventaWarnings], error: null }
  } catch {
    // Graceful degradation: never block the POS flow
    return { data: [], error: null }
  }
}

// ---------------------------------------------------------------------------
// El detalle de insumos de un producto, para la pantalla de alertas
// ---------------------------------------------------------------------------

/** Una linea del detalle: que pide el producto y que hay. */
export interface InsumoDelProducto {
  id: string
  nombre: string
  /** La unidad en que se comparan las dos cantidades: kg, litro o unidad. */
  unidad: string
  /** Cuanto consume una unidad del producto, con merma incluida. */
  necesita: number
  hay: number
  /** Para cuantas unidades del producto alcanza. `null` si no se le sigue el stock. */
  alcanzaPara: number | null
  /** Si es este el que frena al producto. */
  limita: boolean
  /** Si se le sigue el stock. Sin seguimiento no limita a nadie. */
  sigue: boolean
}

/**
 * De que depende un producto y cuanto queda de cada cosa.
 *
 * Existe porque el sistema escondia un producto y lo unico que ofrecia era un
 * cartel que decia "no hay ingredientes suficientes" y un link a la misma
 * pantalla donde ya estabas. Saber cual insumo lo frena obligaba a abrir la
 * ficha tecnica y comparar a mano contra la tabla de stock.
 *
 * Se pide al desplegar una fila y no para toda la tabla: son 16 productos y
 * cada uno recorre sus recetas y sub-recetas.
 */
export async function getInsumosDelProducto(
  productId: string
): Promise<{ data: InsumoDelProducto[] | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const detalle = await detalleDeInsumos(supabase, productId)
  if (!detalle || detalle.length === 0) return { data: [], error: null }

  const { data: ingredientes } = await supabase
    .from('ingredients')
    .select('id, name, unit')
    .in('id', detalle.map((d) => d.ingredientId))

  const porId = new Map((ingredientes ?? []).map((i) => [i.id, i]))

  const lineas: InsumoDelProducto[] = detalle.map((d) => {
    const ing = porId.get(d.ingredientId)
    const alcanzaPara = d.sigue && d.necesita > 0 ? Math.floor(d.hay / d.necesita) : null
    return {
      id: d.ingredientId,
      nombre: ing?.name ?? 'Insumo',
      unidad: getBaseUnit(ing?.unit ?? 'unidad'),
      necesita: d.necesita,
      hay: d.hay,
      alcanzaPara,
      limita: false,
      sigue: d.sigue,
    }
  })

  // El que limita es el de menor tope. Puede haber mas de uno empatado, y estan
  // todos: comprar solo uno no destraba el producto.
  const topes = lineas.map((l) => l.alcanzaPara).filter((t): t is number => t !== null)
  if (topes.length > 0) {
    const minimo = Math.min(...topes)
    for (const l of lineas) if (l.alcanzaPara === minimo) l.limita = true
  }

  // Primero lo que falta, despues lo que menos queda.
  lineas.sort((a, b) => {
    if (a.limita !== b.limita) return a.limita ? -1 : 1
    return (a.alcanzaPara ?? Infinity) - (b.alcanzaPara ?? Infinity)
  })

  return { data: lineas, error: null }
}

// ---------------------------------------------------------------------------
// La planilla de conteo
// ---------------------------------------------------------------------------

type SupabaseAdmin = Awaited<ReturnType<typeof createAdminClient>>

/** Una linea de la planilla: lo que el sistema dice tener de algo. */
export interface LineaDePlanilla {
  id: string
  nombre: string
  unidad: string
  /** Lo que el sistema dice. Lo contado y la diferencia se escriben a mano. */
  stockDelSistema: number
  /** Si es un producto de reventa y no un insumo. Se cuentan igual. */
  esProducto: boolean
}

/** Lo que hay que contar de una categoria, junto. */
export interface GrupoDePlanilla {
  categoria: string
  /** Para que el papel diga si es deposito o mercaderia que se revende. */
  esReventa: boolean
  lineas: LineaDePlanilla[]
}

/** Una categoria, con cuantas filas tiene, para elegir antes de imprimir. */
export interface CategoriaParaPlanilla {
  id: string
  nombre: string
  filas: number
  /** De donde salen: del deposito de insumos o de los productos que se revenden. */
  origen: 'insumo' | 'reventa'
}

/**
 * Lo que no tiene categoria va junto bajo esta clave, no se pierde.
 *
 * Sin `export`: un archivo `'use server'` solo puede exportar funciones async,
 * porque todo lo que exporta queda expuesto como server action. La clave viaja
 * igual, adentro del `id` de la categoria.
 */
const SIN_CATEGORIA = 'sin-categoria'

/**
 * Lo que se cuenta: insumos y productos de reventa, los dos.
 *
 * David, mirando la primera version: "no sale lo que hay en el sistema en el
 * caso de bebidas, ninguna sale con seguimiento". Y era cierto: las bebidas
 * reales son **productos de reventa**, no insumos. La planilla listaba los 12
 * insumos-bebida --las filas muertas que quedaron de cuando las gaseosas se
 * cargaban como ingredientes de un combo, ninguna con seguimiento-- y dejaba
 * afuera las 16 bebidas de verdad.
 *
 * Frente a la heladera lo que se cuenta es la botella. Que el sistema la llame
 * insumo o producto es una distincion suya, no del que cuenta.
 *
 * Solo lo que tiene seguimiento: si el sistema no lleva la cuenta de algo, no
 * hay numero contra el cual comparar y la fila es ruido. Eso es justo lo que se
 * veia: una hoja entera diciendo "sin seguimiento".
 */
async function _loQueSeCuenta(supabase: SupabaseAdmin) {
  const [insumos, productos, catInsumos, catProductos] = await Promise.all([
    supabase
      .from('ingredients')
      .select('id, name, unit, current_stock, category_id')
      .eq('is_active', true)
      .eq('stock_tracking_enabled', true)
      .order('name'),
    supabase
      .from('products')
      .select('id, name, current_stock, category_id')
      .eq('is_active', true)
      .eq('product_type', 'reventa')
      .eq('stock_tracking_enabled', true)
      .order('name'),
    supabase.from('ingredient_categories').select('id, name'),
    supabase.from('categories').select('id, name'),
  ])

  return { insumos, productos, catInsumos, catProductos }
}

/**
 * La clave de un grupo: de donde sale, y de que categoria.
 *
 * Los insumos y los productos tienen cada uno su tabla de categorias, y las dos
 * tienen una BEBIDAS. En la primera version se agrupaban por nombre para que
 * cayeran juntas, y David lo corrigio: "entonces deberia haber una opcion para
 * productos de reventa".
 *
 * Tiene razon. Son dos cosas distintas: un insumo se consume haciendo otra
 * cosa, un producto de reventa se vende tal cual. Mezclarlos bajo un mismo
 * titulo deja al que cuenta sin saber por que una gaseosa aparece dos veces, y
 * sin poder llevarse solo una de las dos listas.
 */
function _clavePorCategoria(
  categoryId: string | null,
  nombres: Map<string, string>,
  origen: 'insumo' | 'reventa'
): { clave: string; nombre: string } {
  const nombre = categoryId ? nombres.get(categoryId) : null
  if (!nombre) return { clave: `${origen}:${SIN_CATEGORIA}`, nombre: 'Sin categoría' }
  return { clave: `${origen}:${categoryId}`, nombre }
}

/**
 * Las categorias con cuantas filas tiene cada una.
 *
 * Se piden antes de imprimir para elegir que entra: marcando CARNES y BEBIDAS
 * sale la hoja del freezer y la heladera, y no las 120 filas de todo. El numero
 * al lado es para no llevarse tres paginas sin querer.
 */
export async function getCategoriasParaPlanilla(): Promise<{
  data: CategoriaParaPlanilla[] | null
  error: string | null
}> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const { insumos, productos, catInsumos, catProductos } = await _loQueSeCuenta(supabase)
  if (insumos.error) return devError(insumos.error)
  if (productos.error) return devError(productos.error)

  const nombresInsumo = new Map((catInsumos.data ?? []).map((c) => [c.id, c.name]))
  const nombresProducto = new Map((catProductos.data ?? []).map((c) => [c.id, c.name]))

  const cuenta = new Map<string, { nombre: string; filas: number; origen: 'insumo' | 'reventa' }>()

  const sumar = (
    categoryId: string | null,
    nombres: Map<string, string>,
    origen: 'insumo' | 'reventa'
  ) => {
    const { clave, nombre } = _clavePorCategoria(categoryId, nombres, origen)
    const actual = cuenta.get(clave) ?? { nombre, filas: 0, origen }
    actual.filas += 1
    cuenta.set(clave, actual)
  }

  for (const i of insumos.data ?? []) sumar(i.category_id, nombresInsumo, 'insumo')
  for (const p of productos.data ?? []) sumar(p.category_id, nombresProducto, 'reventa')

  // Los insumos primero: es el deposito, y es lo que mas filas tiene. Lo que no
  // tiene categoria va al fondo de su bloque.
  const resultado = [...cuenta.entries()]
    .map(([clave, { nombre, filas, origen }]) => ({ id: clave, nombre, filas, origen }))
    .sort((a, b) => {
      if (a.origen !== b.origen) return a.origen === 'insumo' ? -1 : 1
      if (a.id.endsWith(SIN_CATEGORIA)) return 1
      if (b.id.endsWith(SIN_CATEGORIA)) return -1
      return a.nombre.localeCompare(b.nombre, 'es')
    })

  return { data: resultado, error: null }
}

/**
 * Lo que hay que contar, agrupado por categoria.
 *
 * Sin categorias elegidas devuelve todo: es lo que pasa si alguien entra
 * directo a la URL de impresion.
 */
export async function getPlanillaDeConteo(
  categoriaIds: string[] = []
): Promise<{ data: GrupoDePlanilla[] | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const { insumos, productos, catInsumos, catProductos } = await _loQueSeCuenta(supabase)
  if (insumos.error) return devError(insumos.error)
  if (productos.error) return devError(productos.error)

  const nombresInsumo = new Map((catInsumos.data ?? []).map((c) => [c.id, c.name]))
  const nombresProducto = new Map((catProductos.data ?? []).map((c) => [c.id, c.name]))

  const elegidas = new Set(categoriaIds)
  const filtrar = elegidas.size > 0
  const grupos = new Map<string, GrupoDePlanilla>()

  const agregar = (
    linea: LineaDePlanilla,
    categoryId: string | null,
    nombres: Map<string, string>,
    origen: 'insumo' | 'reventa'
  ) => {
    const { clave, nombre } = _clavePorCategoria(categoryId, nombres, origen)
    if (filtrar && !elegidas.has(clave)) return
    const grupo: GrupoDePlanilla =
      grupos.get(clave) ?? { categoria: nombre, esReventa: origen === 'reventa', lineas: [] }
    grupo.lineas.push(linea)
    grupos.set(clave, grupo)
  }

  for (const i of insumos.data ?? []) {
    agregar(
      {
        id: i.id,
        nombre: i.name,
        unidad: i.unit,
        stockDelSistema: Number(i.current_stock) || 0,
        esProducto: false,
      },
      i.category_id,
      nombresInsumo,
      'insumo'
    )
  }

  for (const p of productos.data ?? []) {
    agregar(
      {
        id: p.id,
        // Un producto de reventa se cuenta de a uno: la unidad es la botella.
        nombre: p.name,
        unidad: 'unidad',
        stockDelSistema: Number(p.current_stock) || 0,
        esProducto: true,
      },
      p.category_id,
      nombresProducto,
      'reventa'
    )
  }

  // Alfabetico, con lo que no tiene categoria al final: es el grupo mas
  // heterogeneo y el que menos sentido tiene contar de un saque.
  const ordenados = [...grupos.entries()]
    .sort(([a, ga], [b, gb]) => {
      if (ga.esReventa !== gb.esReventa) return ga.esReventa ? 1 : -1
      if (a.endsWith(SIN_CATEGORIA)) return 1
      if (b.endsWith(SIN_CATEGORIA)) return -1
      return ga.categoria.localeCompare(gb.categoria, 'es')
    })
    .map(([, g]) => {
      g.lineas.sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'))
      return g
    })

  return { data: ordenados, error: null }
}
