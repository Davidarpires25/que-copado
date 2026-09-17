import type { SupabaseClient } from '@supabase/supabase-js'
import { convertToBaseUnit, getBaseUnit } from '@/lib/server/unit-conversion'
import { escalarComponente } from '@/lib/server/sub-recipes'
import { revalidateProducts } from '@/lib/server/revalidate'

/**
 * Minimal item shape needed for stock deduction.
 * Works with both OrderItem (POS counter sales) and order_items rows (table orders).
 */
interface StockDeductionItem {
  product_id?: string | null
  /** OrderItem uses `id` as the product id */
  id?: string
  quantity: number
}

/**
 * Resolves the product_id from different item shapes.
 * - order_items rows use `product_id`
 * - OrderItem (JSON) uses `id` as the product identifier
 */
function resolveProductId(item: StockDeductionItem): string | null {
  return item.product_id ?? item.id ?? null
}

/**
 * Movimiento pendiente de aplicar.
 *
 * El recorrido del arbol de recetas ya no escribe a medida que baja: acumula
 * estos movimientos y al final los aplica de una, en una transaccion
 * (`aplicar_movimientos_de_stock`, migracion 033). Eso es lo que elimina la
 * carrera entre ventas simultaneas y hace que el stock y su movimiento no
 * puedan quedar desfasados.
 */
export interface MovimientoPendiente {
  tipo: 'ingredient' | 'product'
  id: string
  /** Positiva: es cuanto se RESTA del stock. */
  cantidad: number
}

/** Acumula sumando, para que el mismo ingrediente en dos recetas sea un solo movimiento. */
function acumular(destino: Map<string, MovimientoPendiente>, mov: MovimientoPendiente): void {
  const clave = `${mov.tipo}:${mov.id}`
  const previo = destino.get(clave)
  if (previo) previo.cantidad += mov.cantidad
  else destino.set(clave, { ...mov })
}

// ---------------------------------------------------------------------------
// deductStockForOrder
// ---------------------------------------------------------------------------

/**
 * Best-effort stock deduction after a sale is confirmed.
 *
 * - For `reventa` products with stock_tracking_enabled: decrements products.current_stock
 * - For `elaborado` products: decrements each ingredient via recipe_ingredients (recursive through sub-recipes)
 * - Negative stock is allowed (common in gastronomy)
 * - Errors are logged but NEVER block the sale
 *
 * @param supabase - Authenticated Supabase client
 * @param items    - Order items (either OrderItem[] or order_items rows)
 * @param orderId  - The order UUID for traceability
 * @param userId   - The authenticated user who made the sale
 */
export async function deductStockForOrder(
  supabase: SupabaseClient,
  items: StockDeductionItem[],
  orderId: string,
  _userId: string | null
): Promise<void> {
  const pendientes = new Map<string, MovimientoPendiente>()

  for (const item of items) {
    if (item.quantity <= 0) continue

    const productId = resolveProductId(item)
    if (!productId) continue

    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, product_type, current_stock, stock_tracking_enabled')
        .eq('id', productId)
        .single()

      if (productError || !product) continue

      await acumularProducto(supabase, product, item.quantity, pendientes)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Stock] Error calculando stock del producto ${productId}:`, err)
      }
    }
  }

  if (pendientes.size > 0) {
    const { data, error } = await supabase.rpc('aplicar_movimientos_de_stock', {
      p_order_id: orderId,
      p_movimientos: Array.from(pendientes.values()),
    })

    if (error) {
      // Ya no hay estado a medias que compensar: la transaccion no se aplico.
      console.error(`[Stock] No se pudo aplicar el descuento del pedido ${orderId}:`, error.message)
    } else {
      const resultado = data as { duplicado?: boolean; negativos?: unknown[] } | null
      if (resultado?.duplicado) {
        console.error(`[Stock] El pedido ${orderId} ya habia descontado stock; no se duplico`)
      }
      // Vender en rojo no se bloquea, pero queda constancia: antes una venta que
      // dejaba el stock en negativo no se distinguia de una normal.
      if (resultado?.negativos?.length) {
        console.error(
          `[Stock] El pedido ${orderId} dejo items en negativo:`,
          JSON.stringify(resultado.negativos)
        )
      }
    }
  }

  // El auto-agotado de los productos de reventa lo hacia deductReventaStock
  // justo despues de escribir. Ahora que la escritura vive en la RPC, se
  // re-sincroniza aca con el stock ya aplicado.
  for (const mov of pendientes.values()) {
    if (mov.tipo !== 'product') continue
    try {
      const { data: prod } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', mov.id)
        .single()
      if (prod) await _syncReventaProduct(supabase, mov.id, Number(prod.current_stock))
    } catch { /* nunca bloquea la venta */ }
  }

  await syncElaboradoAvailability(supabase).catch((err) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Stock] Error syncing elaborado availability:', err)
    }
  })
}

// ---------------------------------------------------------------------------
// restoreStockForOrder
// ---------------------------------------------------------------------------

/**
 * Reverses all 'sale' stock movements for a given order.
 * Used when cancelling a POS order that was already paid.
 *
 * For each original 'sale' movement:
 * - Restores the stock on the ingredient or product
 * - Creates a 'sale_reversal' movement for audit trail
 */
export async function restoreStockForOrder(
  supabase: SupabaseClient,
  orderId: string,
  _userId: string | null
): Promise<void> {
  const { data, error } = await supabase.rpc('revertir_movimientos_de_stock', {
    p_order_id: orderId,
  })

  if (error) {
    console.error(`[Stock] No se pudo revertir el stock del pedido ${orderId}:`, error.message)
    return
  }

  const resultado = data as { duplicado?: boolean; revertidos?: number } | null
  if (resultado?.duplicado && process.env.NODE_ENV === 'development') {
    console.error(`[Stock] El pedido ${orderId} ya estaba revertido; no se duplico`)
  }

  // Sin movimientos revertidos no cambio ningun stock, y sin stock que cambie no
  // hay nada que resincronizar. El barrido recorre todos los elaborados activos
  // con una consulta anidada por producto, en serie: quince productos son ~2,4
  // segundos. Cancelar un pendiente —que todavia no descontó nada, porque eso
  // pasa al cobrar— los pagaba enteros para no tocar una sola fila.
  if (!resultado?.revertidos) return

  await syncElaboradoAvailability(supabase).catch(() => { /* nunca bloquea la cancelacion */ })
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Deducts stock for a 'reventa' product (direct stock on products table).
 */
async function collectIngredientCascade(
  supabase: SupabaseClient,
  ingredientId: string,
  quantityInRecipeUnit: number,
  recipeUnit: string,
  pendientes: Map<string, MovimientoPendiente>,
  visited: Set<string>
): Promise<void> {
  if (visited.has(ingredientId)) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Stock] Cycle detected for ingredient ${ingredientId}, skipping`)
    }
    return
  }
  visited.add(ingredientId)

  const { data: ingredient, error: ingError } = await supabase
    .from('ingredients')
    .select('id, unit, waste_percentage, current_stock, stock_tracking_enabled, yield_quantity')
    .eq('id', ingredientId)
    .single()

  if (ingError || !ingredient) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Stock] Failed to fetch ingredient ${ingredientId}:`, ingError?.message)
    }
    return
  }

  const baseQty = convertToBaseUnit(quantityInRecipeUnit, recipeUnit)

  if (getBaseUnit(recipeUnit) !== getBaseUnit(ingredient.unit)) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[Stock] Unit incompatibility: recipe uses '${recipeUnit}' but ingredient '${ingredient.id}' uses '${ingredient.unit}'`
      )
    }
    return
  }

  const wastePct = Number(ingredient.waste_percentage) || 0
  const wasteFactor = 1 - wastePct / 100
  const actualQty = wasteFactor > 0 ? baseQty / wasteFactor : baseQty

  // Un ingrediente con sub-receta se resuelve a sus componentes y no descuenta
  // de si mismo: las preparaciones se hacen en el momento, no se guardan. Es el
  // mismo criterio que usa _collectReqs para decidir si alcanza el stock.
  const { data: subItems } = await supabase
    .from('ingredient_sub_recipes')
    .select('child_ingredient_id, quantity, unit')
    .eq('parent_ingredient_id', ingredientId)

  if (subItems && subItems.length > 0) {
    for (const sub of subItems) {
      await collectIngredientCascade(
        supabase,
        sub.child_ingredient_id,
        escalarComponente(sub.quantity, actualQty, ingredient.yield_quantity),
        sub.unit,
        pendientes,
        new Set(visited)
      )
    }
    return
  }

  if (ingredient.stock_tracking_enabled) {
    acumular(pendientes, { tipo: 'ingredient', id: ingredient.id, cantidad: actualQty })
  }
}

async function _syncReventaProduct(
  supabase: SupabaseClient,
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
    // Defer revalidation to avoid calling revalidatePath during render
    setTimeout(() => {
      try {
        revalidateProducts()
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('[Stock] defer revalidateProducts error:', err)
      }
    }, 0)
  } else if (newStock > 0 && product.is_out_of_stock && product.auto_disabled) {
    await supabase
      .from('products')
      .update({ is_out_of_stock: false, auto_disabled: false })
      .eq('id', productId)
    // Defer revalidation to avoid calling revalidatePath during render
    setTimeout(() => {
      try {
        revalidateProducts()
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('[Stock] defer revalidateProducts error:', err)
      }
    }, 0)
  }
}

/**
 * Auto-disables elaborated products when theoretical stock reaches 0.
 * Restores them when stock recovers (ONLY if auto_disabled=true).
 * Best-effort: errors never propagate.
 */
async function syncElaboradoAvailability(supabase: SupabaseClient): Promise<void> {
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, is_out_of_stock, auto_disabled')
    .eq('product_type', 'elaborado')
    .eq('is_active', true)

  if (prodError || !products || products.length === 0) return

  let anyChanged = false

  for (const product of products) {
    try {
      const theoreticalStock = await _calcTheoreticalStock(supabase, product.id)
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

  if (anyChanged) {
    // Defer revalidation to avoid calling revalidatePath during render
    setTimeout(() => {
      try {
        revalidateProducts()
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('[Stock] defer revalidateProducts error:', err)
      }
    }, 0)
  }
}

type IngReq = Map<string, { requiredQty: number; currentStock: number; trackingEnabled: boolean }>

/**
 * Computes the maximum number of units of an elaborado product that can be
 * produced given the current ingredient stock. Returns null if no ingredient
 * tracking is enabled (meaning there's no practical limit).
 *
 * Exported so the public page can display urgency indicators.
 */
export async function calcElaboradoStock(supabase: SupabaseClient, productId: string): Promise<number | null> {
  return _calcTheoreticalStock(supabase, productId)
}

async function _calcTheoreticalStock(supabase: SupabaseClient, productId: string): Promise<number | null> {
  const { data: productRecipes, error } = await supabase
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

  if (error || !productRecipes || productRecipes.length === 0) return null

  const requirements: IngReq = new Map()

  for (const pr of productRecipes) {
    const recipeMultiplier = pr.quantity ?? 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe = pr.recipes as any
    if (!recipe?.recipe_ingredients) continue

    for (const ri of recipe.recipe_ingredients) {
      const ingredient = ri.ingredients
      if (!ingredient) continue

      const effectiveUnit = ri.unit ?? ingredient.unit
      await _collectReqs(
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
    if (minProducible === null || producible < minProducible) minProducible = producible
  }

  if (!hasAnyTracked) return null
  return minProducible ?? 0
}

async function _collectReqs(
  supabase: SupabaseClient,
  ingredientId: string,
  quantityInRecipeUnit: number,
  recipeUnit: string,
  requirements: IngReq,
  visited: Set<string>
): Promise<void> {
  if (visited.has(ingredientId)) return
  visited.add(ingredientId)

  const { data: ingredient } = await supabase
    .from('ingredients')
    .select('id, unit, waste_percentage, current_stock, stock_tracking_enabled, yield_quantity')
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
      await _collectReqs(supabase, sub.child_ingredient_id, escalarComponente(sub.quantity, actualQty, ingredient.yield_quantity), sub.unit, requirements, new Set(visited))
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

/** Lo minimo que hace falta saber de un producto para descontarlo. */
interface ProductoParaDescontar {
  id: string
  product_type: string | null
  stock_tracking_enabled?: boolean | null
}

/**
 * Acumula lo que descuenta un producto, sea del tipo que sea.
 *
 * Un combo se expande a sus componentes y cada uno vuelve a entrar por acá: la
 * bebida descuenta como reventa y la hamburguesa camina su receta. Eso es lo que
 * hace que la coca de un combo y la coca vendida sola salgan del mismo stock, en
 * vez de los dos inventarios paralelos que habia antes.
 *
 * La expansion ocurre acá y no al vender: el pedido guarda el combo como lo que
 * es —una linea con su precio— y recien al descontar se resuelve en partes.
 */
async function acumularProducto(
  supabase: SupabaseClient,
  product: ProductoParaDescontar,
  cantidad: number,
  pendientes: Map<string, MovimientoPendiente>,
  profundidad = 0
): Promise<void> {
  if (product.product_type === 'reventa') {
    if (product.stock_tracking_enabled) {
      acumular(pendientes, { tipo: 'product', id: product.id, cantidad })
    }
    return
  }

  if (product.product_type === 'elaborado') {
    await collectElaboradoStock(supabase, product.id, cantidad, pendientes)
    return
  }

  if (product.product_type === 'combo') {
    // Un combo no contiene combos —lo impide la configuracion— pero el limite
    // esta igual: un ciclo en la base no puede colgar un cobro.
    if (profundidad > 2) return

    const { data: componentes, error } = await supabase
      .from('product_components')
      .select('quantity, products:component_id (id, product_type, stock_tracking_enabled)')
      .eq('parent_id', product.id)

    if (error || !componentes) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Stock] No se pudieron leer los componentes del combo ${product.id}:`, error?.message)
      }
      return
    }

    for (const componente of componentes) {
      const hijo = componente.products as unknown as ProductoParaDescontar | null
      if (!hijo) continue
      // La cantidad se multiplica: tres combos con dos bebidas cada uno son seis.
      await acumularProducto(supabase, hijo, cantidad * Number(componente.quantity ?? 1), pendientes, profundidad + 1)
    }
  }
}

/**
 * Deducts stock for an 'elaborado' product by walking its recipes and
 * recursively decrementing each ingredient (including sub-recipe cascades).
 *
 * Chain: product -> product_recipes -> recipes -> recipe_ingredients -> ingredients -> sub-recipes
 */
async function collectElaboradoStock(
  supabase: SupabaseClient,
  productId: string,
  orderQuantity: number,
  pendientes: Map<string, MovimientoPendiente>
): Promise<void> {
  // Fetch all recipe ingredients for this product in one query
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

  if (prError || !productRecipes) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Stock] Failed to fetch recipes for product ${productId}:`, prError?.message)
    }
    return
  }

  // Walk the recipe tree and deduct ingredients
  for (const pr of productRecipes) {
    const recipeMultiplier = pr.quantity ?? 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe = pr.recipes as any
    if (!recipe?.recipe_ingredients) continue

    for (const ri of recipe.recipe_ingredients) {
      const ingredient = ri.ingredients
      if (!ingredient) continue

      // Total quantity = order qty * product_recipes.quantity * recipe_ingredients.quantity
      const totalQty = orderQuantity * recipeMultiplier * ri.quantity
      // Effective unit: use recipe_ingredient.unit if specified, else ingredient's own unit
      const effectiveUnit = ri.unit ?? ingredient.unit

      await collectIngredientCascade(
        supabase,
        ingredient.id,
        totalQty,
        effectiveUnit,
        pendientes,
        new Set<string>()
      )
    }
  }
}
