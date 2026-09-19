'use server'

import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { revalidateRecipes } from '@/lib/server/revalidate'
import { friendlyError } from '@/lib/server/error-messages'
import { convertToBaseUnit, convertFromBaseUnit } from '@/lib/server/unit-conversion'
import { devError } from '@/lib/server/logger'

interface RecipeIngredientItem {
  ingredient_id: string
  quantity: number
  unit?: string
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------


/**
 * Un insumo que entra a una receta se empieza a contar.
 *
 * Estar en una receta significa que cada venta lo consume. Si ademas tiene el
 * seguimiento apagado, el descuento lo saltea en silencio: no falla, no avisa,
 * simplemente no lo cuenta.
 *
 * Paso de verdad. La papa estuvo en diez recetas con el seguimiento apagado:
 * trece ventas se comieron 4,6 kg y el sistema siguio diciendo 20. Lo mismo el
 * pote de aderezo, en nueve recetas, con ocho consumidos y cero descontados.
 * Ninguno de los dos fue una decision de no contarlos: fue un olvido.
 *
 * Solo los que **entran** a la receta, no todos los de la receta en cada
 * guardado. Si alguien apago a proposito el seguimiento de algo que no quiere
 * contar --un pellizco de oregano, un palillo-- volver a prenderselo cada vez
 * que se edita la receta seria pelearle. Ya se aprendio hoy con el barrido que
 * apagaba lo que una persona habia prendido.
 */
async function _seguirLosNuevos(
  supabase: SupabaseClient,
  ingredientIds: string[]
): Promise<void> {
  if (ingredientIds.length === 0) return

  const { error } = await supabase
    .from('ingredients')
    .update({ stock_tracking_enabled: true, updated_at: new Date().toISOString() })
    .in('id', [...new Set(ingredientIds)])
    .eq('stock_tracking_enabled', false)

  // Best effort: la receta ya se guardo y no tiene por que fallar si esto no
  // sale. Lo peor que pasa es quedar como estaba antes de este cambio.
  if (error) devError('No se pudo activar el seguimiento de los insumos nuevos:', error)
}

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

  // Receta nueva: todos sus insumos son nuevos.
  await _seguirLosNuevos(supabase, data.ingredients.map((i) => i.ingredient_id))

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
    // Cuales ya estaban, antes de borrarlos. El guardado reescribe la lista
    // entera, asi que sin esta lectura no hay forma de distinguir un insumo
    // que se acaba de agregar de uno que ya estaba.
    const { data: yaEstaban } = await supabase
      .from('recipe_ingredients')
      .select('ingredient_id')
      .eq('recipe_id', id)

    const previos = new Set((yaEstaban ?? []).map((r) => r.ingredient_id))

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

    await _seguirLosNuevos(
      supabase,
      data.ingredients.map((i) => i.ingredient_id).filter((id) => !previos.has(id))
    )

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

  // Un combo no cuesta lo que sus recetas: cuesta eso mas sus componentes.
  //
  // Sin esta bifurcacion, guardar las recetas de un combo le pisaba el costo
  // con solo la parte de las recetas. Y si el combo no tenia recetas propias
  // --el caso normal al crearlo-- `_costoDeRecetasDe` devuelve null y esta
  // funcion le ponia el costo en null, borrando lo que sus componentes ya
  // habian calculado. Por eso un combo recien creado aparecia sin costo.
  if (product.product_type === 'combo') {
    await recalcularCostoDeCombo(supabase, productId)
    return
  }

  // Una sola cuenta del costo de las recetas, compartida con la del combo.
  // Estaban escritas dos veces, con la misma conversion de unidades y la misma
  // merma; el error de unidades que aparecio hoy habia que arreglarlo en las
  // dos, y esa es la forma en que estas copias terminan diciendo cosas
  // distintas.
  const totalCost = await _costoDeRecetasDe(supabase, productId)

  if (totalCost === null) {
    // Un elaborado sin recetas no tiene costo que calcular.
    await supabase.from('products').update({ cost: null }).eq('id', productId)
    return
  }

  await supabase
    .from('products')
    .update({ cost: Math.round(totalCost * 100) / 100 })
    .eq('id', productId)

  // Si este producto forma parte de algun combo, el costo del combo cambio con
  // el. Sin esto, una compra que sube el precio de la carne actualiza la
  // hamburguesa y deja la promo mintiendo sobre su margen.
  await recalcularCombosQueUsan(supabase, productId)
}

/**
 * El costo de un combo es la suma de lo que cuestan sus componentes.
 *
 * Se recalcula cuando cambia el costo de cualquiera de ellos, que es la unica
 * forma de que el margen de la promocion sea un dato y no una estimacion vieja.
 */
export async function recalcularCostoDeCombo(supabase: SupabaseClient, comboId: string) {
  const { data: componentes } = await supabase
    .from('product_components')
    .select('quantity, products:component_id (cost)')
    .eq('parent_id', comboId)

  // El costo de sus componentes: productos terminados, con su costo ya hecho.
  let total = 0
  for (const c of componentes ?? []) {
    const prod = c.products as unknown as { cost: number | null } | null
    total += Number(prod?.cost ?? 0) * Number(c.quantity ?? 1)
  }

  // Mas el de sus recetas propias: el envase y la preparacion que solo existe
  // dentro del combo. Sin esto, la caja y los palillos salen gratis y el margen
  // de la promo miente para arriba.
  total += (await _costoDeRecetasDe(supabase, comboId)) ?? 0

  const tieneAlgo = (componentes?.length ?? 0) > 0 || total > 0

  await supabase
    .from('products')
    .update({ cost: tieneAlgo ? Math.round(total * 100) / 100 : null })
    .eq('id', comboId)
}

/**
 * Lo que cuestan los ingredientes de las recetas de un producto.
 *
 * `null` cuando el producto no tiene recetas, que es distinto de costar cero:
 * un elaborado sin receta no tiene costo calculable y su `cost` se limpia, y un
 * combo sin recetas propias igual puede costar por sus componentes.
 */
async function _costoDeRecetasDe(supabase: SupabaseClient, productId: string): Promise<number | null> {
  const { data: productRecipes } = await supabase
    .from('product_recipes')
    .select(`
      quantity,
      recipes (
        recipe_ingredients (
          quantity,
          unit,
          ingredients ( unit, cost_per_unit, waste_percentage )
        )
      )
    `)
    .eq('product_id', productId)

  if (!productRecipes?.length) return null

  let total = 0
  for (const pr of productRecipes) {
    const recipe = pr.recipes as unknown as {
      recipe_ingredients: Array<{
        quantity: number
        unit: string | null
        ingredients: { unit: string; cost_per_unit: number; waste_percentage: number } | null
      }>
    } | null
    if (!recipe?.recipe_ingredients) continue

    let costoReceta = 0
    for (const ri of recipe.recipe_ingredients) {
      if (!ri.ingredients) continue
      const unidad = ri.unit ?? ri.ingredients.unit
      const enBase = convertToBaseUnit(ri.quantity, unidad)
      const merma = ri.ingredients.waste_percentage ?? 0
      const factor = 1 - merma / 100
      const cantidadReal = factor > 0 ? enBase / factor : enBase

      // El costo se cobra por unidad del insumo, no por unidad base.
      //
      // `cost_per_unit` es el precio de UNA unidad de la unidad del insumo:
      // por gramo para el oregano, por kilo para la muzzarella. La cantidad se
      // convertia a unidad base para poder comparar entre recetas, y despues se
      // multiplicaba por ese precio sin volver: 30 g de morron entraban a la
      // cuenta como 0,03 y costaban mil veces menos de lo que cuestan.
      //
      // Solo afectaba a los insumos cuya propia unidad no es la base de su
      // familia --gramos y mililitros--, que son dos de cuarenta y cinco. Por
      // eso el numero final parecia razonable.
      const enUnidadDelInsumo = convertFromBaseUnit(cantidadReal, ri.ingredients.unit)
      costoReceta += enUnidadDelInsumo * ri.ingredients.cost_per_unit
    }
    total += costoReceta * (pr.quantity ?? 1)
  }

  return total
}

/** Actualiza el costo de los combos que incluyen un producto dado. */
async function recalcularCombosQueUsan(supabase: SupabaseClient, productId: string) {
  const { data: enCombos } = await supabase
    .from('product_components')
    .select('parent_id')
    .eq('component_id', productId)

  if (!enCombos || enCombos.length === 0) return

  for (const id of [...new Set(enCombos.map((c) => c.parent_id))]) {
    await recalcularCostoDeCombo(supabase, id)
  }
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
