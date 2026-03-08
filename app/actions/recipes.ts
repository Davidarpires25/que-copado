'use server'

import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { revalidateRecipes } from '@/lib/server/revalidate'
import { friendlyError } from '@/lib/server/error-messages'
import { convertToBaseUnit } from '@/lib/server/unit-conversion'

interface RecipeIngredientItem {
  ingredient_id: string
  quantity: number
  unit?: string
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createRecipe(data: {
  name: string
  description?: string
  ingredients: RecipeIngredientItem[]
}) {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!data.name?.trim()) return { data: null, error: 'El nombre es requerido' }
  if (!data.ingredients.length) return { data: null, error: 'La receta debe tener al menos un ingrediente' }

  for (const item of data.ingredients) {
    if (!item.ingredient_id) return { data: null, error: 'Ingrediente invalido' }
    if (!item.quantity || item.quantity <= 0) return { data: null, error: 'Cantidad debe ser mayor a 0' }
  }

  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({
      name: data.name.trim(),
      description: data.description?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'Ya existe una receta con ese nombre' }
    return { data: null, error: friendlyError(error) }
  }

  // Insert recipe ingredients
  const { error: itemsError } = await supabase
    .from('recipe_ingredients')
    .insert(
      data.ingredients.map((item) => ({
        recipe_id: recipe.id,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
        unit: item.unit || null,
      }))
    )

  if (itemsError) {
    // Rollback: delete the recipe
    await supabase.from('recipes').delete().eq('id', recipe.id)
    return { data: null, error: 'Error al guardar ingredientes: ' + itemsError.message }
  }

  revalidateRecipes()
  return { data: recipe, error: null }
}

export async function updateRecipe(
  id: string,
  data: {
    name?: string
    description?: string | null
    is_active?: boolean
    ingredients?: RecipeIngredientItem[]
  }
) {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (data.name !== undefined && !data.name.trim()) return { data: null, error: 'El nombre no puede estar vacio' }
  if (data.ingredients !== undefined && data.ingredients.length === 0) {
    return { data: null, error: 'La receta debe tener al menos un ingrediente' }
  }

  if (data.ingredients) {
    for (const item of data.ingredients) {
      if (!item.ingredient_id) return { data: null, error: 'Ingrediente invalido' }
      if (!item.quantity || item.quantity <= 0) return { data: null, error: 'Cantidad debe ser mayor a 0' }
    }
  }

  // Update recipe metadata
  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) updatePayload.name = data.name.trim()
  if (data.description !== undefined) updatePayload.description = data.description?.trim() || null
  if (data.is_active !== undefined) updatePayload.is_active = data.is_active

  const { data: recipe, error } = await supabase
    .from('recipes')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'Ya existe una receta con ese nombre' }
    return { data: null, error: friendlyError(error) }
  }

  // Update ingredients if provided
  if (data.ingredients) {
    // Delete existing and re-insert
    const { error: deleteError } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', id)

    if (deleteError) return { data: null, error: deleteError.message }

    const { error: insertError } = await supabase
      .from('recipe_ingredients')
      .insert(
        data.ingredients.map((item) => ({
          recipe_id: id,
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
          unit: item.unit || null,
        }))
      )

    if (insertError) return { data: null, error: 'Error al guardar ingredientes: ' + insertError.message }

    // Recalculate all products that use this recipe
    await recalculateProductsForRecipe(supabase, id)
  }

  revalidateRecipes()
  return { data: recipe, error: null }
}

export async function deleteRecipe(id: string) {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const { error } = await supabase.from('recipes').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return { data: null, error: 'Esta receta esta siendo usada en productos. Elimina los productos primero.' }
    }
    return { data: null, error: friendlyError(error) }
  }

  revalidateRecipes()
  return { data: true, error: null }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getRecipeWithIngredients(recipeId: string) {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const { data, error } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*, ingredients(id, name, unit, cost_per_unit, waste_percentage))')
    .eq('id', recipeId)
    .single()

  if (error) return { data: null, error: friendlyError(error) }
  return { data, error: null }
}

// ---------------------------------------------------------------------------
// Product-Recipe linking
// ---------------------------------------------------------------------------

interface ProductRecipeItem {
  recipe_id: string
  quantity: number
}

export async function setProductRecipes(productId: string, items: ProductRecipeItem[]) {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!productId) return { data: null, error: 'Product ID requerido' }

  for (const item of items) {
    if (!item.recipe_id) return { data: null, error: 'Receta invalida' }
    if (!item.quantity || item.quantity <= 0) return { data: null, error: 'Cantidad debe ser mayor a 0' }
  }

  // Delete existing product-recipe links
  const { error: deleteError } = await supabase
    .from('product_recipes')
    .delete()
    .eq('product_id', productId)

  if (deleteError) return { data: null, error: deleteError.message }

  // Insert new links
  if (items.length > 0) {
    const { error: insertError } = await supabase
      .from('product_recipes')
      .insert(
        items.map((item) => ({
          product_id: productId,
          recipe_id: item.recipe_id,
          quantity: item.quantity,
        }))
      )

    if (insertError) return { data: null, error: insertError.message }
  }

  // Recalculate product cost
  await recalculateProductCost(supabase, productId)

  revalidateRecipes()
  return { data: true, error: null }
}

export async function getProductRecipes(productId: string) {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const { data, error } = await supabase
    .from('product_recipes')
    .select('*, recipes(*, recipe_ingredients(*, ingredients(*)))')
    .eq('product_id', productId)

  if (error) return { data: null, error: friendlyError(error) }
  return { data, error: null }
}

// ---------------------------------------------------------------------------
// Cost calculation helpers
// ---------------------------------------------------------------------------

/** Recalculate a product's cost from its recipes, applying unit conversion and waste */
export async function recalculateProductCost(supabase: SupabaseClient, productId: string) {
  // Check product type first
  const { data: product } = await supabase
    .from('products')
    .select('product_type')
    .eq('id', productId)
    .single()

  if (!product || product.product_type === 'reventa') return

  const { data: productRecipes } = await supabase
    .from('product_recipes')
    .select('quantity, recipes(recipe_ingredients(quantity, unit, ingredients(unit, cost_per_unit, waste_percentage)))')
    .eq('product_id', productId)

  if (!productRecipes || productRecipes.length === 0) {
    // Elaborado product with no recipes - clear cost
    await supabase.from('products').update({ cost: null }).eq('id', productId)
    return
  }

  let totalCost = 0
  for (const pr of productRecipes) {
    const recipe = pr.recipes as unknown as {
      recipe_ingredients: Array<{
        quantity: number
        unit: string | null
        ingredients: { unit: string; cost_per_unit: number; waste_percentage: number }
      }>
    }
    if (recipe?.recipe_ingredients) {
      let recipeCost = 0
      for (const ri of recipe.recipe_ingredients) {
        // 1. Convert quantity to base unit
        const effectiveUnit = ri.unit ?? ri.ingredients.unit
        const qtyBase = convertToBaseUnit(ri.quantity, effectiveUnit)
        // 2. Apply waste percentage
        const wastePct = ri.ingredients.waste_percentage ?? 0
        const wasteFactor = 1 - wastePct / 100
        const actualQty = wasteFactor > 0 ? qtyBase / wasteFactor : qtyBase
        // 3. Calculate subtotal
        recipeCost += actualQty * ri.ingredients.cost_per_unit
      }
      totalCost += recipeCost * pr.quantity
    }
  }

  await supabase
    .from('products')
    .update({ cost: Math.round(totalCost * 100) / 100 })
    .eq('id', productId)
}

/** Recalculate all products that use a given recipe */
async function recalculateProductsForRecipe(supabase: SupabaseClient, recipeId: string) {
  const { data: links } = await supabase
    .from('product_recipes')
    .select('product_id')
    .eq('recipe_id', recipeId)

  if (!links || links.length === 0) return

  const productIds = [...new Set(links.map((l) => l.product_id))]
  for (const pid of productIds) {
    await recalculateProductCost(supabase, pid)
  }
}

/** Recalculate all products that use a given ingredient (through recipes) */
export async function recalculateProductsForIngredient(supabase: SupabaseClient, ingredientId: string) {
  // Find all recipes that use this ingredient
  const { data: recipeLinks } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id')
    .eq('ingredient_id', ingredientId)

  if (!recipeLinks || recipeLinks.length === 0) return

  const recipeIds = [...new Set(recipeLinks.map((l) => l.recipe_id))]

  // For each recipe, recalculate all products that use it
  for (const recipeId of recipeIds) {
    await recalculateProductsForRecipe(supabase, recipeId)
  }
}
