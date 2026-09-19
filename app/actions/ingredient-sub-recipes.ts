'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { revalidateIngredients } from '@/lib/server/revalidate'
import { friendlyError } from '@/lib/server/error-messages'
import { convertToBaseUnit, convertFromBaseUnit } from '@/lib/server/unit-conversion'
import { rendimientoEfectivo } from '@/lib/server/sub-recipes'
import type { IngredientSubRecipeWithChild } from '@/lib/types/database'

/**
 * Fetches all sub-recipe items for a given parent ingredient.
 */
export async function getIngredientSubRecipes(
  ingredientId: string
): Promise<{ data: IngredientSubRecipeWithChild[] | null; yieldQuantity: number; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, yieldQuantity: 1, error: 'No autorizado' }

  const [{ data, error }, { data: parent }] = await Promise.all([
    supabase
      .from('ingredient_sub_recipes')
      .select('*, ingredients:child_ingredient_id(id, name, unit, cost_per_unit)')
      .eq('parent_ingredient_id', ingredientId)
      .order('created_at', { ascending: true }),
    supabase.from('ingredients').select('yield_quantity').eq('id', ingredientId).maybeSingle(),
  ])

  if (error) return { data: null, yieldQuantity: 1, error: friendlyError(error) }
  return {
    data: data as IngredientSubRecipeWithChild[],
    yieldQuantity: Number(parent?.yield_quantity) || 1,
    error: null,
  }
}

/**
 * Sets (replaces) all sub-recipe items for a parent ingredient.
 * Deletes existing items and re-inserts. Then recalculates the parent cost.
 */
export async function setIngredientSubRecipes(
  parentId: string,
  items: { child_ingredient_id: string; quantity: number; unit: string }[],
  /** Cuanto rinde la preparacion, en la unidad del propio ingrediente. */
  yieldQuantity?: number
): Promise<{ data: boolean | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!parentId) return { data: null, error: 'ID del ingrediente padre es requerido' }
  if (yieldQuantity !== undefined && (!Number.isFinite(yieldQuantity) || yieldQuantity <= 0)) {
    return { data: null, error: 'El rendimiento debe ser mayor a 0' }
  }

  // Validate: no self-reference (DB constraint exists, but validate early)
  for (const item of items) {
    if (item.child_ingredient_id === parentId) {
      return { data: null, error: 'Un ingrediente no puede ser sub-ingrediente de si mismo' }
    }
    if (!item.child_ingredient_id) return { data: null, error: 'Ingrediente hijo invalido' }
    if (!item.quantity || item.quantity <= 0) return { data: null, error: 'Cantidad debe ser mayor a 0' }
    if (!item.unit) return { data: null, error: 'La unidad es requerida' }
  }

  // Delete existing sub-recipe items
  const { error: deleteError } = await supabase
    .from('ingredient_sub_recipes')
    .delete()
    .eq('parent_ingredient_id', parentId)

  if (deleteError) return { data: null, error: friendlyError(deleteError) }

  // Insert new items
  if (items.length > 0) {
    const { error: insertError } = await supabase
      .from('ingredient_sub_recipes')
      .insert(
        items.map((item) => ({
          parent_ingredient_id: parentId,
          child_ingredient_id: item.child_ingredient_id,
          quantity: item.quantity,
          unit: item.unit,
        }))
      )

    if (insertError) {
      if (insertError.code === '23505') {
        return { data: null, error: 'No se puede agregar el mismo ingrediente hijo dos veces' }
      }
      return { data: null, error: friendlyError(insertError) }
    }
  }

  // Recalculate parent cost based on sub-ingredients
  if (yieldQuantity !== undefined) {
    await supabase
      .from('ingredients')
      .update({ yield_quantity: yieldQuantity })
      .eq('id', parentId)
  }

  // Despues de guardar el rendimiento: el costo por unidad lo divide por el.
  await recalculateParentCost(parentId)

  // El compuesto ya no controla stock propio: al vender se descuentan sus
  // componentes, asi que su numero quedaria congelado.
  await supabase
    .from('ingredients')
    .update({ stock_tracking_enabled: false })
    .eq('id', parentId)

  revalidateIngredients()
  return { data: true, error: null }
}

/**
 * Deletes all sub-recipe items for a parent ingredient.
 */
export async function deleteIngredientSubRecipes(
  parentId: string
): Promise<{ data: boolean | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const { error } = await supabase
    .from('ingredient_sub_recipes')
    .delete()
    .eq('parent_ingredient_id', parentId)

  if (error) return { data: null, error: friendlyError(error) }

  revalidateIngredients()
  return { data: true, error: null }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Recalculates cost_per_unit for a parent ingredient based on its sub-ingredients.
 * cost_parent = sum( cantidad en la unidad del hijo / (1 - waste_pct/100) * child.cost_per_unit )
 */
async function recalculateParentCost(parentId: string): Promise<void> {
  const supabase = await createAdminClient()

  const [{ data: subItems }, { data: parent }] = await Promise.all([
    supabase
      .from('ingredient_sub_recipes')
      .select('quantity, unit, child_ingredient_id, ingredients:child_ingredient_id(unit, cost_per_unit, waste_percentage)')
      .eq('parent_ingredient_id', parentId),
    supabase.from('ingredients').select('yield_quantity').eq('id', parentId).maybeSingle(),
  ])

  if (!subItems || subItems.length === 0) return

  let totalCost = 0
  for (const item of subItems) {
    const child = item.ingredients as unknown as {
      unit: string; cost_per_unit: number; waste_percentage: number
    } | null
    if (!child) continue

    const baseQty = convertToBaseUnit(item.quantity, item.unit)
    const wasteFactor = 1 - (child.waste_percentage ?? 0) / 100
    const actualQty = wasteFactor > 0 ? baseQty / wasteFactor : baseQty

    // De vuelta a la unidad del insumo antes de multiplicar por su precio:
    // `cost_per_unit` es por gramo para un insumo en gramos, no por kilo. Ver
    // la nota en `_costoDeRecetasDe`.
    totalCost += convertFromBaseUnit(actualQty, child.unit) * child.cost_per_unit
  }

  // totalCost es lo que cuesta la tanda entera; el costo por unidad sale de
  // dividirla por lo que rinde.
  const costoPorUnidad = totalCost / rendimientoEfectivo(parent?.yield_quantity)

  await supabase
    .from('ingredients')
    .update({
      cost_per_unit: Math.round(costoPorUnidad * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parentId)
}
