import type { SupabaseClient } from '@supabase/supabase-js'
import { convertToBaseUnit, getBaseUnit } from '@/lib/server/unit-conversion'
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
  userId: string
): Promise<void> {
  for (const item of items) {
    if (item.quantity <= 0) continue

    const productId = resolveProductId(item)
    if (!productId) continue

    try {
      // Fetch product info
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, product_type, current_stock, stock_tracking_enabled')
        .eq('id', productId)
        .single()

      if (productError || !product) continue

      if (product.product_type === 'reventa') {
        await deductReventaStock(supabase, product, item.quantity, orderId, userId)
      } else if (product.product_type === 'elaborado') {
        await deductElaboradoStock(supabase, productId, item.quantity, orderId, userId)
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Stock] Error deducting stock for product ${productId}:`, err)
      }
    }
  }

  // After all deductions, sync elaborado availability (best-effort)
  try {
    await syncElaboradoAvailability(supabase)
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Stock] Error syncing elaborado availability:', err)
    }
  }
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
  userId: string
): Promise<void> {
  try {
    // Get all sale movements for this order
    const { data: movements, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('order_id', orderId)
      .eq('movement_type', 'sale')

    if (error || !movements || movements.length === 0) return

    for (const mov of movements) {
      try {
        // The original sale movement has a negative quantity.
        // To restore, we add back the absolute value.
        const restoreQty = Math.abs(mov.quantity)

        if (mov.ingredient_id) {
          // Restore ingredient stock
          const { data: ingredient } = await supabase
            .from('ingredients')
            .select('id, current_stock')
            .eq('id', mov.ingredient_id)
            .single()

          if (!ingredient) continue

          const previousStock = Number(ingredient.current_stock)
          const newStock = previousStock + restoreQty

          await supabase
            .from('ingredients')
            .update({ current_stock: newStock })
            .eq('id', mov.ingredient_id)

          await supabase.from('stock_movements').insert({
            ingredient_id: mov.ingredient_id,
            movement_type: 'sale_reversal',
            quantity: restoreQty,
            previous_stock: previousStock,
            new_stock: newStock,
            reason: 'Reversion por cancelacion de venta',
            reference_type: 'order',
            order_id: orderId,
            created_by: userId,
          })
        } else if (mov.product_id) {
          // Restore product stock
          const { data: product } = await supabase
            .from('products')
            .select('id, current_stock')
            .eq('id', mov.product_id)
            .single()

          if (!product) continue

          const previousStock = Number(product.current_stock)
          const newStock = previousStock + restoreQty

          await supabase
            .from('products')
            .update({ current_stock: newStock })
            .eq('id', mov.product_id)

          await supabase.from('stock_movements').insert({
            product_id: mov.product_id,
            movement_type: 'sale_reversal',
            quantity: restoreQty,
            previous_stock: previousStock,
            new_stock: newStock,
            reason: 'Reversion por cancelacion de venta',
            reference_type: 'order',
            order_id: orderId,
            created_by: userId,
          })

          // Re-enable if was auto-disabled and stock recovered (best-effort)
          try {
            await _syncReventaProduct(supabase, mov.product_id, newStock)
          } catch { /* best effort */ }
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Stock] Error restoring movement ${mov.id}:`, err)
        }
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Stock] Error restoring stock for order ${orderId}:`, err)
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Deducts stock for a 'reventa' product (direct stock on products table).
 */
async function deductReventaStock(
  supabase: SupabaseClient,
  product: { id: string; current_stock: number; stock_tracking_enabled: boolean },
  quantity: number,
  orderId: string,
  userId: string
): Promise<void> {
  if (!product.stock_tracking_enabled) return

  const previousStock = Number(product.current_stock)
  const newStock = previousStock - quantity

  const { error: updateError } = await supabase
    .from('products')
    .update({ current_stock: newStock })
    .eq('id', product.id)

  if (updateError) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Stock] Failed to update product ${product.id} stock:`, updateError.message)
    }
    return
  }

  // Record movement (best-effort)
  await supabase.from('stock_movements').insert({
    product_id: product.id,
    movement_type: 'sale',
    quantity: -quantity,
    previous_stock: previousStock,
    new_stock: newStock,
    reason: 'Venta automatica',
    reference_type: 'order',
    order_id: orderId,
    created_by: userId,
  })

  // Auto-disable when stock hits 0 (best-effort)
  try {
    await _syncReventaProduct(supabase, product.id, newStock)
  } catch { /* never block the sale */ }
}

/**
 * Recursively deducts stock for a single ingredient, then cascades into
 * its sub-recipe children (ingredient_sub_recipes table).
 *
 * @param supabase           - Authenticated Supabase client
 * @param ingredientId       - The ingredient to deduct from
 * @param quantityInRecipeUnit - Quantity expressed in `recipeUnit`
 * @param recipeUnit         - The unit specified in the recipe or sub-recipe
 * @param orderId            - Order UUID for traceability
 * @param userId             - User who made the sale
 * @param visited            - Set of ingredient IDs already processed (cycle detection)
 */
async function deductIngredientCascade(
  supabase: SupabaseClient,
  ingredientId: string,
  quantityInRecipeUnit: number,
  recipeUnit: string,
  orderId: string,
  userId: string,
  visited: Set<string>
): Promise<void> {
  // Cycle detection
  if (visited.has(ingredientId)) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Stock] Cycle detected for ingredient ${ingredientId}, skipping`)
    }
    return
  }
  visited.add(ingredientId)

  // Fetch ingredient
  const { data: ingredient, error: ingError } = await supabase
    .from('ingredients')
    .select('id, unit, waste_percentage, current_stock, stock_tracking_enabled')
    .eq('id', ingredientId)
    .single()

  if (ingError || !ingredient) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Stock] Failed to fetch ingredient ${ingredientId}:`, ingError?.message)
    }
    return
  }

  // Convert recipe quantity to base unit
  const baseQty = convertToBaseUnit(quantityInRecipeUnit, recipeUnit)

  // Verify unit compatibility
  if (getBaseUnit(recipeUnit) !== getBaseUnit(ingredient.unit)) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[Stock] Unit incompatibility: recipe uses '${recipeUnit}' but ingredient '${ingredient.id}' uses '${ingredient.unit}'`
      )
    }
    return
  }

  // Apply waste percentage
  const wastePct = Number(ingredient.waste_percentage) || 0
  const wasteFactor = 1 - wastePct / 100
  const actualQty = wasteFactor > 0 ? baseQty / wasteFactor : baseQty

  // Deduct stock if tracking is enabled
  if (ingredient.stock_tracking_enabled) {
    const previousStock = Number(ingredient.current_stock)
    const newStock = previousStock - actualQty

    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ current_stock: newStock })
      .eq('id', ingredient.id)

    if (updateError) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Stock] Failed to update ingredient ${ingredient.id} stock:`, updateError.message)
      }
    } else {
      // Record movement (best-effort)
      await supabase.from('stock_movements').insert({
        ingredient_id: ingredient.id,
        movement_type: 'sale',
        quantity: -actualQty,
        previous_stock: previousStock,
        new_stock: newStock,
        reason: 'Venta automatica',
        reference_type: 'order',
        order_id: orderId,
        created_by: userId,
      })
    }
  }

  // Fetch sub-recipe children
  const { data: subItems } = await supabase
    .from('ingredient_sub_recipes')
    .select('child_ingredient_id, quantity, unit')
    .eq('parent_ingredient_id', ingredientId)

  if (subItems && subItems.length > 0) {
    for (const sub of subItems) {
      // Scale child quantity by how much of the parent we actually used
      const childQty = sub.quantity * actualQty
      await deductIngredientCascade(
        supabase,
        sub.child_ingredient_id,
        childQty,
        sub.unit,
        orderId,
        userId,
        new Set(visited)
      )
    }
  }
}

// ---------------------------------------------------------------------------
// syncElaboradoAvailability
// ---------------------------------------------------------------------------

/**
 * Auto-disables a reventa product when its stock reaches 0.
 * Restores it when stock recovers (ONLY if auto_disabled=true).
 */
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
    revalidateProducts()
  } else if (newStock > 0 && product.is_out_of_stock && product.auto_disabled) {
    await supabase
      .from('products')
      .update({ is_out_of_stock: false, auto_disabled: false })
      .eq('id', productId)
    revalidateProducts()
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

  if (anyChanged) revalidateProducts()
}

type IngReq = Map<string, { requiredQty: number; currentStock: number; trackingEnabled: boolean }>

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
      await _collectReqs(supabase, sub.child_ingredient_id, sub.quantity * actualQty, sub.unit, requirements, new Set(visited))
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

/**
 * Deducts stock for an 'elaborado' product by walking its recipes and
 * recursively decrementing each ingredient (including sub-recipe cascades).
 *
 * Chain: product -> product_recipes -> recipes -> recipe_ingredients -> ingredients -> sub-recipes
 */
async function deductElaboradoStock(
  supabase: SupabaseClient,
  productId: string,
  orderQuantity: number,
  orderId: string,
  userId: string
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

      await deductIngredientCascade(
        supabase,
        ingredient.id,
        totalQty,
        effectiveUnit,
        orderId,
        userId,
        new Set<string>()
      )
    }
  }
}
