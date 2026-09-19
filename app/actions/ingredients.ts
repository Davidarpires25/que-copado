'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { revalidateIngredients } from '@/lib/server/revalidate'
import { friendlyError } from '@/lib/server/error-messages'
import { recalculateProductsForIngredient } from './recipes'
import type { IngredientUnit } from '@/lib/types/database'

const VALID_UNITS: IngredientUnit[] = ['kg', 'g', 'litro', 'ml', 'unidad']

export async function createIngredient(data: {
  name: string
  unit: IngredientUnit
  cost_per_unit: number
  waste_percentage?: number
  category_id?: string | null
}) {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!data.name?.trim()) return { data: null, error: 'El nombre es requerido' }
  if (!VALID_UNITS.includes(data.unit)) return { data: null, error: 'Unidad no valida' }
  if (isNaN(data.cost_per_unit) || data.cost_per_unit < 0) return { data: null, error: 'El costo debe ser >= 0' }

  if (data.waste_percentage !== undefined && (data.waste_percentage < 0 || data.waste_percentage >= 100)) {
    return { data: null, error: 'El porcentaje de merma debe ser >= 0 y < 100' }
  }

  const insertPayload: Record<string, unknown> = {
    name: data.name.trim(),
    unit: data.unit,
    cost_per_unit: data.cost_per_unit,
  }
  if (data.waste_percentage !== undefined) insertPayload.waste_percentage = data.waste_percentage
  if (data.category_id !== undefined) {
    insertPayload.category_id = data.category_id || null
  }

  const { data: ingredient, error } = await supabase
    .from('ingredients')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'Ya existe un ingrediente con ese nombre' }
    return { data: null, error: friendlyError(error) }
  }

  revalidateIngredients()
  return { data: ingredient, error: null }
}

export async function updateIngredient(
  id: string,
  data: {
    name?: string
    unit?: IngredientUnit
    cost_per_unit?: number
    waste_percentage?: number
    is_active?: boolean
    category_id?: string | null
  }
) {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (data.name !== undefined && !data.name.trim()) return { data: null, error: 'El nombre no puede estar vacio' }
  if (data.unit !== undefined && !VALID_UNITS.includes(data.unit)) return { data: null, error: 'Unidad no valida' }
  if (data.cost_per_unit !== undefined && (isNaN(data.cost_per_unit) || data.cost_per_unit < 0)) {
    return { data: null, error: 'El costo debe ser >= 0' }
  }
  if (data.waste_percentage !== undefined && (data.waste_percentage < 0 || data.waste_percentage >= 100)) {
    return { data: null, error: 'El porcentaje de merma debe ser >= 0 y < 100' }
  }

  const costChanged = data.cost_per_unit !== undefined || data.waste_percentage !== undefined

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) updatePayload.name = data.name.trim()
  if (data.unit !== undefined) updatePayload.unit = data.unit
  if (data.cost_per_unit !== undefined) updatePayload.cost_per_unit = data.cost_per_unit
  if (data.waste_percentage !== undefined) updatePayload.waste_percentage = data.waste_percentage
  if (data.is_active !== undefined) updatePayload.is_active = data.is_active
  if (data.category_id !== undefined) updatePayload.category_id = data.category_id || null

  const { data: ingredient, error } = await supabase
    .from('ingredients')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'Ya existe un ingrediente con ese nombre' }
    return { data: null, error: friendlyError(error) }
  }

  // If cost changed, recalculate all products through recipes
  if (costChanged) {
    await recalculateProductsForIngredient(supabase, id)
  }

  revalidateIngredients()
  return { data: ingredient, error: null }
}

/**
 * Que pasa cuando se pide eliminar un insumo.
 *
 * `eliminado` es el borrado de verdad; `desactivado` es el insumo que ya tiene
 * historial y se esconde en vez de borrarse.
 */
export type ResultadoDeBorrado = 'eliminado' | 'desactivado'

/**
 * Elimina un insumo, o lo desactiva si tiene historial de stock.
 *
 * Antes era un borrado duro y nada mas, y fallaba de tres formas distintas sin
 * explicar ninguna. Las cuentas al momento de escribir esto: de 106 insumos,
 * **41** estan en alguna receta, **49** tienen movimientos de stock y solo
 * **16** se borran limpio.
 *
 * Los tres caminos:
 *
 * 1. **En uso en una receta** —`recipe_ingredients`, o como hijo de un insumo
 *    compuesto— no se toca. Borrarlo dejaria la receta incompleta en silencio,
 *    y desactivarlo tampoco sirve: el producto lo sigue necesitando. Se avisa
 *    donde esta usado para que se pueda ir a sacarlo.
 *
 * 2. **Con movimientos de stock** se desactiva. El borrado duro aca no fallaba
 *    por la receta sino por algo que no se adivina: la clave de
 *    `stock_movements` es `ON DELETE SET NULL`, y al dejar el movimiento sin
 *    insumo choca contra el CHECK que exige que apunte a un insumo **o** a un
 *    producto. Salia un `23514` que no le dice nada a nadie. Y aunque
 *    funcionara, no conviene: el historial es lo que permite reconstruir un
 *    faltante despues, como se hizo con el medallon y con la papa.
 *
 * 3. **Sin receta ni movimientos** —recien creado, cargado por error— se borra
 *    de verdad, que es lo que se espera de un boton que dice Eliminar.
 */
export async function deleteIngredient(id: string) {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  // Las tres preguntas juntas: son independientes entre si.
  const [enRecetas, comoHijo, conHistorial] = await Promise.all([
    supabase
      .from('recipe_ingredients')
      .select('recipes(name)')
      .eq('ingredient_id', id)
      .limit(4),
    supabase
      .from('ingredient_sub_recipes')
      .select('ingredients!ingredient_sub_recipes_parent_ingredient_id_fkey(name)')
      .eq('child_ingredient_id', id)
      .limit(4),
    supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('ingredient_id', id),
  ])

  const primerError = enRecetas.error || comoHijo.error || conHistorial.error
  if (primerError) return { data: null, error: friendlyError(primerError) }

  const usos = [
    ...(enRecetas.data ?? []).map((f) => nombreDeLaRelacion(f.recipes)),
    ...(comoHijo.data ?? []).map((f) => nombreDeLaRelacion(f.ingredients)),
  ].filter((n): n is string => !!n)

  if (usos.length > 0) {
    // Los nombres concretos ahorran el paseo por todas las recetas buscando
    // cual era. De a tres, que es lo que entra en un toast.
    const muestra = usos.slice(0, 3).join(', ')
    const resto = usos.length > 3 ? ' y otras mas' : ''
    return {
      data: null,
      error: `No se puede eliminar: lo usan ${muestra}${resto}. Sacalo de ahi primero.`,
    }
  }

  if ((conHistorial.count ?? 0) > 0) {
    const { error } = await supabase
      .from('ingredients')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { data: null, error: friendlyError(error) }

    revalidateIngredients()
    return { data: 'desactivado' as ResultadoDeBorrado, error: null }
  }

  const { error } = await supabase.from('ingredients').delete().eq('id', id)

  if (error) {
    // No deberia pasar —ya preguntamos— pero si aparece una referencia nueva
    // que no conocemos, mejor decir algo cierto que el codigo de Postgres.
    if (error.code === '23503') {
      return { data: null, error: 'No se puede eliminar: algo mas lo esta usando.' }
    }
    return { data: null, error: friendlyError(error) }
  }

  revalidateIngredients()
  return { data: 'eliminado' as ResultadoDeBorrado, error: null }
}

/**
 * El nombre de una relacion anidada de PostgREST.
 *
 * Viene como objeto o como arreglo de uno segun como infiera la cardinalidad,
 * y `null` cuando RLS no deja leerla. Los tres casos se resuelven igual.
 */
function nombreDeLaRelacion(relacion: unknown): string | null {
  const fila = Array.isArray(relacion) ? relacion[0] : relacion
  const nombre = (fila as { name?: unknown } | null)?.name
  return typeof nombre === 'string' ? nombre : null
}
