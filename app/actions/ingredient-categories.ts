'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { revalidateIngredients } from '@/lib/server/revalidate'
import { friendlyError } from '@/lib/server/error-messages'
import { recalculateProductCost } from './recipes'
import type { IngredientCategory } from '@/lib/types/database'

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getIngredientCategories(): Promise<{
  data: IngredientCategory[] | null
  error: string | null
}> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const { data, error } = await supabase
    .from('ingredient_categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) return { data: null, error: friendlyError(error) }
  return { data, error: null }
}

export async function createIngredientCategory(name: string): Promise<{
  data: IngredientCategory | null
  error: string | null
}> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!name?.trim()) return { data: null, error: 'El nombre es requerido' }

  const { data, error } = await supabase
    .from('ingredient_categories')
    .insert({ name: name.trim() })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'Ya existe una categoria con ese nombre' }
    return { data: null, error: friendlyError(error) }
  }

  revalidateIngredients()
  return { data, error: null }
}

export async function updateIngredientCategory(
  id: string,
  name: string
): Promise<{ data: IngredientCategory | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!name?.trim()) return { data: null, error: 'El nombre es requerido' }

  const { data, error } = await supabase
    .from('ingredient_categories')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'Ya existe una categoria con ese nombre' }
    return { data: null, error: friendlyError(error) }
  }

  revalidateIngredients()
  return { data, error: null }
}

export async function deleteIngredientCategory(id: string): Promise<{
  data: boolean | null
  error: string | null
}> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  // First unset category_id on all ingredients that use this category
  const { error: unsetError } = await supabase
    .from('ingredients')
    .update({ category_id: null })
    .eq('category_id', id)

  if (unsetError) return { data: null, error: friendlyError(unsetError) }

  const { error } = await supabase
    .from('ingredient_categories')
    .delete()
    .eq('id', id)

  if (error) return { data: null, error: friendlyError(error) }

  revalidateIngredients()
  return { data: true, error: null }
}

// ---------------------------------------------------------------------------
// Bulk cost update by category
// ---------------------------------------------------------------------------

export async function bulkUpdateCostByCategory(
  categoryId: string,
  updateType: 'percentage' | 'fixed',
  value: number
): Promise<{ data: { updated: number } | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  // Validations
  if (updateType !== 'percentage' && updateType !== 'fixed') {
    return { data: null, error: 'Tipo de actualizacion no valido' }
  }
  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    return { data: null, error: 'El valor debe ser mayor a 0' }
  }

  // 1. Fetch active ingredients in this category
  const { data: ingredients, error: fetchError } = await supabase
    .from('ingredients')
    .select('id, cost_per_unit')
    .eq('category_id', categoryId)
    .eq('is_active', true)

  if (fetchError) return { data: null, error: friendlyError(fetchError) }
  if (!ingredients || ingredients.length === 0) {
    return { data: null, error: 'No hay ingredientes activos en esta categoria' }
  }

  // 2. Calculate new costs and update each ingredient
  const ingredientIds: string[] = []
  for (const ing of ingredients) {
    const newCost =
      updateType === 'percentage'
        ? Math.round(ing.cost_per_unit * (1 + value / 100) * 100) / 100
        : Math.round((ing.cost_per_unit + value) * 100) / 100

    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ cost_per_unit: newCost, updated_at: new Date().toISOString() })
      .eq('id', ing.id)

    if (updateError) {
      return { data: null, error: `Error actualizando ingrediente: ${friendlyError(updateError)}` }
    }
    ingredientIds.push(ing.id)
  }

  // 3. Collect ALL affected product IDs first (deduplicated)
  const affectedProductIds = new Set<string>()

  if (ingredientIds.length > 0) {
    // Find all recipes that use any of these ingredients
    const { data: recipeLinks } = await supabase
      .from('recipe_ingredients')
      .select('recipe_id')
      .in('ingredient_id', ingredientIds)

    if (recipeLinks && recipeLinks.length > 0) {
      const recipeIds = [...new Set(recipeLinks.map((l) => l.recipe_id))]

      // Find all products that use any of these recipes
      const { data: productLinks } = await supabase
        .from('product_recipes')
        .select('product_id')
        .in('recipe_id', recipeIds)

      if (productLinks) {
        for (const pl of productLinks) {
          affectedProductIds.add(pl.product_id)
        }
      }
    }
  }

  // 4. Recalculate each affected product ONCE
  for (const productId of affectedProductIds) {
    await recalculateProductCost(supabase, productId)
  }

  revalidateIngredients()
  return { data: { updated: ingredientIds.length }, error: null }
}
