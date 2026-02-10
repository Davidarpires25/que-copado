'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { DeliveryZone, GeoJSONPolygon } from '@/lib/types/database'
import booleanIntersects from '@turf/boolean-intersects'
import { polygon as turfPolygon } from '@turf/helpers'

// Get all delivery zones (admin)
export async function getDeliveryZones(): Promise<{ data: DeliveryZone[] | null; error: string | null }> {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'No autorizado' }
  }

  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as DeliveryZone[], error: null }
}

// Get active delivery zones (public)
export async function getActiveDeliveryZones(): Promise<{ data: DeliveryZone[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as DeliveryZone[], error: null }
}

// Validate that a polygon doesn't overlap with existing zones
async function validateNoOverlap(
  polygon: GeoJSONPolygon,
  excludeId?: string
): Promise<{ isValid: boolean; overlappingZone?: string }> {
  const supabase = await createAdminClient()

  let query = supabase
    .from('delivery_zones')
    .select('id, name, polygon')

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data: existingZones, error } = await query

  if (error) {
    // Error fetching zones - fail safely by allowing the operation
    // This prevents blocking zone creation if there's a temporary DB issue
    return { isValid: true }
  }

  if (!existingZones || existingZones.length === 0) {
    return { isValid: true }
  }

  const newPolygon = turfPolygon(polygon.coordinates)

  for (const zone of existingZones) {
    const existingPolygon = turfPolygon((zone.polygon as GeoJSONPolygon).coordinates)

    if (booleanIntersects(newPolygon, existingPolygon)) {
      return { isValid: false, overlappingZone: zone.name }
    }
  }

  return { isValid: true }
}

// Create a new delivery zone
export async function createDeliveryZone(formData: FormData) {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  const name = formData.get('name') as string
  const polygonStr = formData.get('polygon') as string
  const shippingCostStr = formData.get('shipping_cost') as string
  const color = formData.get('color') as string
  const freeShippingThresholdStr = formData.get('free_shipping_threshold') as string
  const sortOrderStr = formData.get('sort_order') as string

  // Validar campos requeridos
  if (!name?.trim()) {
    return { error: 'El nombre de la zona es requerido' }
  }

  if (name.trim().length > 100) {
    return { error: 'El nombre no puede exceder 100 caracteres' }
  }

  if (!polygonStr?.trim()) {
    return { error: 'El polígono es requerido' }
  }

  // Validar shipping cost
  const shippingCost = parseInt(shippingCostStr, 10)
  if (isNaN(shippingCost) || shippingCost < 0) {
    return { error: 'El costo de envío debe ser un número válido mayor o igual a 0' }
  }

  if (shippingCost > 100000) {
    return { error: 'El costo de envío no puede exceder $100.000' }
  }

  // Validar y parsear polígono
  let polygon: GeoJSONPolygon
  try {
    polygon = JSON.parse(polygonStr)
  } catch {
    return { error: 'Formato de polígono inválido' }
  }

  // Validar estructura del polígono
  if (polygon.type !== 'Polygon') {
    return { error: 'El tipo de polígono es inválido' }
  }

  if (!polygon.coordinates?.[0] || polygon.coordinates[0].length < 4) {
    return { error: 'El polígono debe tener al menos 3 vértices' }
  }

  // Validar que las coordenadas sean válidas
  for (const coord of polygon.coordinates[0]) {
    if (!Array.isArray(coord) || coord.length !== 2) {
      return { error: 'Formato de coordenadas inválido' }
    }
    const [lng, lat] = coord
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return { error: 'Las coordenadas deben ser números' }
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { error: 'Las coordenadas están fuera de rango' }
    }
  }

  // Validate no overlap
  const overlapCheck = await validateNoOverlap(polygon)
  if (!overlapCheck.isValid) {
    return { error: `La zona se superpone con "${overlapCheck.overlappingZone}"` }
  }

  // Validar free shipping threshold
  let freeShippingThreshold: number | null = null
  if (freeShippingThresholdStr?.trim()) {
    freeShippingThreshold = parseInt(freeShippingThresholdStr, 10)
    if (isNaN(freeShippingThreshold) || freeShippingThreshold < 0) {
      return { error: 'El umbral de envío gratis debe ser un número válido' }
    }
    if (freeShippingThreshold > 10000000) {
      return { error: 'El umbral de envío gratis no puede exceder $10.000.000' }
    }
  }

  // Validar sort order
  let sortOrder = 0
  if (sortOrderStr?.trim()) {
    sortOrder = parseInt(sortOrderStr, 10)
    if (isNaN(sortOrder) || sortOrder < 0) {
      return { error: 'El orden debe ser un número válido' }
    }
  }

  // Validar color (formato hexadecimal)
  let validColor = '#FF6B00'
  if (color?.trim()) {
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return { error: 'El formato del color debe ser hexadecimal (#RRGGBB)' }
    }
    validColor = color.toUpperCase()
  }

  const { data: newZone, error } = await supabase.from('delivery_zones').insert({
    name: name.trim(),
    polygon,
    shipping_cost: shippingCost,
    color: validColor,
    is_active: true,
    sort_order: sortOrder,
    free_shipping_threshold: freeShippingThreshold,
  }).select().single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/delivery-zones')
  revalidatePath('/checkout')
  return { success: true, zone: newZone as DeliveryZone }
}

// Update a delivery zone
export async function updateDeliveryZone(
  zoneId: string,
  data: {
    name?: string
    polygon?: GeoJSONPolygon
    shipping_cost?: number
    color?: string
    is_active?: boolean
    sort_order?: number
    free_shipping_threshold?: number | null
  }
) {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  // Validar zoneId
  if (!zoneId?.trim()) {
    return { error: 'ID de zona inválido' }
  }

  // Validar datos si se proporcionan
  if (data.name !== undefined) {
    if (!data.name.trim()) {
      return { error: 'El nombre de la zona no puede estar vacío' }
    }
    if (data.name.trim().length > 100) {
      return { error: 'El nombre no puede exceder 100 caracteres' }
    }
    data.name = data.name.trim()
  }

  if (data.shipping_cost !== undefined) {
    if (isNaN(data.shipping_cost) || data.shipping_cost < 0) {
      return { error: 'El costo de envío debe ser un número válido mayor o igual a 0' }
    }
    if (data.shipping_cost > 100000) {
      return { error: 'El costo de envío no puede exceder $100.000' }
    }
  }

  if (data.free_shipping_threshold !== undefined && data.free_shipping_threshold !== null) {
    if (isNaN(data.free_shipping_threshold) || data.free_shipping_threshold < 0) {
      return { error: 'El umbral de envío gratis debe ser un número válido' }
    }
    if (data.free_shipping_threshold > 10000000) {
      return { error: 'El umbral de envío gratis no puede exceder $10.000.000' }
    }
  }

  if (data.sort_order !== undefined) {
    if (isNaN(data.sort_order) || data.sort_order < 0) {
      return { error: 'El orden debe ser un número válido' }
    }
  }

  if (data.color !== undefined) {
    if (!/^#[0-9A-F]{6}$/i.test(data.color)) {
      return { error: 'El formato del color debe ser hexadecimal (#RRGGBB)' }
    }
    data.color = data.color.toUpperCase()
  }

  // If polygon is being updated, validate structure and no overlap
  if (data.polygon) {
    if (data.polygon.type !== 'Polygon') {
      return { error: 'El tipo de polígono es inválido' }
    }

    if (!data.polygon.coordinates?.[0] || data.polygon.coordinates[0].length < 4) {
      return { error: 'El polígono debe tener al menos 3 vértices' }
    }

    // Validar coordenadas
    for (const coord of data.polygon.coordinates[0]) {
      if (!Array.isArray(coord) || coord.length !== 2) {
        return { error: 'Formato de coordenadas inválido' }
      }
      const [lng, lat] = coord
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        return { error: 'Las coordenadas deben ser números' }
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { error: 'Las coordenadas están fuera de rango' }
      }
    }

    const overlapCheck = await validateNoOverlap(data.polygon, zoneId)
    if (!overlapCheck.isValid) {
      return { error: `La zona se superpone con "${overlapCheck.overlappingZone}"` }
    }
  }

  const { error } = await supabase
    .from('delivery_zones')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', zoneId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/delivery-zones')
  revalidatePath('/checkout')
  return { success: true }
}

// Delete a delivery zone
export async function deleteDeliveryZone(zoneId: string) {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  // Validar zoneId
  if (!zoneId?.trim()) {
    return { error: 'ID de zona inválido' }
  }

  const { error } = await supabase
    .from('delivery_zones')
    .delete()
    .eq('id', zoneId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/delivery-zones')
  revalidatePath('/checkout')
  return { success: true }
}

// Toggle zone active status
export async function toggleZoneActive(zoneId: string, isActive: boolean) {
  return updateDeliveryZone(zoneId, { is_active: isActive })
}

// Reorder zones
export async function reorderDeliveryZones(zoneIds: string[]) {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  // Validar que zoneIds sea un array válido
  if (!Array.isArray(zoneIds) || zoneIds.length === 0) {
    return { error: 'La lista de zonas es inválida' }
  }

  // Validar que todos los IDs sean strings válidos
  for (const zoneId of zoneIds) {
    if (!zoneId || typeof zoneId !== 'string' || !zoneId.trim()) {
      return { error: 'ID de zona inválido en la lista' }
    }
  }

  // Update each zone's sort_order
  for (let i = 0; i < zoneIds.length; i++) {
    const { error } = await supabase
      .from('delivery_zones')
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq('id', zoneIds[i])

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath('/admin/delivery-zones')
  return { success: true }
}
