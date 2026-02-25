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
}) {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  if (!data.name?.trim()) return { data: null, error: 'El nombre es requerido' }
  if (!VALID_UNITS.includes(data.unit)) return { data: null, error: 'Unidad no valida' }
  if (isNaN(data.cost_per_unit) || data.cost_per_unit < 0) return { data: null, error: 'El costo debe ser >= 0' }

  const { data: ingredient, error } = await supabase
    .from('ingredients')
    .insert({
      name: data.name.trim(),
      unit: data.unit,
      cost_per_unit: data.cost_per_unit,
    })
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
    is_active?: boolean
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

  const costChanged = data.cost_per_unit !== undefined

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) updatePayload.name = data.name.trim()
  if (data.unit !== undefined) updatePayload.unit = data.unit
  if (data.cost_per_unit !== undefined) updatePayload.cost_per_unit = data.cost_per_unit
  if (data.is_active !== undefined) updatePayload.is_active = data.is_active

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

export async function deleteIngredient(id: string) {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const { error } = await supabase.from('ingredients').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return { data: null, error: 'Este ingrediente esta siendo usado en recetas. Elimina las recetas primero.' }
    }
    return { data: null, error: friendlyError(error) }
  }

  revalidateIngredients()
  return { data: true, error: null }
}
