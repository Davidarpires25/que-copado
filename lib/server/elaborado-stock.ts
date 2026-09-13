import type { SupabaseClient } from '@supabase/supabase-js'
import { convertToBaseUnit, getBaseUnit } from '@/lib/server/unit-conversion'

/**
 * Calcula cuántas unidades de un producto elaborado se pueden producir
 * con el stock actual de ingredientes. Replica la lógica de deductElaboradoStock
 * pero en modo lectura. Retorna null si no hay ingredientes trackeados (sin límite).
 *
 * Vive acá y no en `app/actions/orders.ts` porque tiene dos consumidores: la
 * validación de stock del checkout y el endpoint del menú que consume el agente
 * de WhatsApp. Un archivo `'use server'` no es el lugar: todo lo que exporta
 * queda expuesto como server action, y esta función recibe un cliente de
 * Supabase, que no es serializable.
 */
export async function getMaxElaboradoQuantity(
  supabase: SupabaseClient,
  productId: string
): Promise<number | null> {
  const { data: productRecipes } = await supabase
    .from('product_recipes')
    .select(`
      quantity,
      recipes (
        recipe_ingredients (
          quantity,
          unit,
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

  if (!productRecipes?.length) return null

  let maxQty: number | null = null

  for (const pr of productRecipes) {
    const recipeMultiplier = (pr.quantity as number) ?? 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe = pr.recipes as any
    if (!recipe?.recipe_ingredients) continue

    for (const ri of recipe.recipe_ingredients) {
      const ingredient = ri.ingredients
      if (!ingredient?.stock_tracking_enabled) continue
      if (ingredient.current_stock === null) continue

      const effectiveUnit = ri.unit ?? ingredient.unit
      if (getBaseUnit(effectiveUnit) !== getBaseUnit(ingredient.unit)) continue

      // Cantidad necesaria del ingrediente por 1 unidad de producto
      const neededPerUnit = convertToBaseUnit(recipeMultiplier * ri.quantity, effectiveUnit)
      const wastePct = Number(ingredient.waste_percentage) || 0
      const wasteFactor = 1 - wastePct / 100
      const actualNeededPerUnit = wasteFactor > 0 ? neededPerUnit / wasteFactor : neededPerUnit
      if (actualNeededPerUnit <= 0) continue

      const producible = Math.floor(Number(ingredient.current_stock) / actualNeededPerUnit)
      if (maxQty === null || producible < maxQty) maxQty = producible
    }
  }

  return maxQty
}
