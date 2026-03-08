'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { revalidateIngredients } from '@/lib/server/revalidate'
import { friendlyError } from '@/lib/server/error-messages'
import { convertToBaseUnit } from '@/lib/server/unit-conversion'
import type { IngredientSubRecipeWithChild } from '@/lib/types/database'

/**
 * Fetches all sub-recipe items for a given parent ingredient.
 */
export async function getIngredientSubRecipes(
  ingredientId: string
): Promise<{ data: IngredientSubRecipeWithChild[] | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const { data, error } = await supabase
    .from('ingredient_sub_recipes')
    .select('*, ingredients:child_ingredient_id(id, name, unit, cost_per_unit)')
    .eq('parent_ingredient_id', ingredientId)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: friendlyError(error) }
  return { data: data as IngredientSubRecipeWithChild[], error: null }
}

/**
 * Sets (replaces) all sub-recipe items for a parent ingredient.
 * Deletes existing items and re-inserts. Then recalculates the parent cost.
 */
export async function setIngredientSubRecipes(
  parentId: string,
  items: { child_ingredient_id: string; quantity: number; unit: string }[]
): Promise<{ data: boolean | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!parentId) return { data: null, error: 'ID del ingrediente padre es requerido' }

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
  await recalculateParentCost(parentId)

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
 * cost_parent = sum( convertToBaseUnit(qty, unit) / (1 - waste_pct/100) * child.cost_per_unit )
 */
async function recalculateParentCost(parentId: string): Promise<void> {
  const supabase = await createAdminClient()

  const { data: subItems } = await supabase
    .from('ingredient_sub_recipes')
    .select('quantity, unit, child_ingredient_id, ingredients:child_ingredient_id(cost_per_unit, waste_percentage)')
    .eq('parent_ingredient_id', parentId)

  if (!subItems || subItems.length === 0) return

  let totalCost = 0
  for (const item of subItems) {
    const child = item.ingredients as unknown as { cost_per_unit: number; waste_percentage: number } | null
    if (!child) continue

    const baseQty = convertToBaseUnit(item.quantity, item.unit)
    const wasteFactor = 1 - (child.waste_percentage ?? 0) / 100
    const actualQty = wasteFactor > 0 ? baseQty / wasteFactor : baseQty
    totalCost += actualQty * child.cost_per_unit
  }

  await supabase
    .from('ingredients')
    .update({
      cost_per_unit: Math.round(totalCost * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parentId)
}
