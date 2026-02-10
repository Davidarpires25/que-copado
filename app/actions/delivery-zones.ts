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
    console.error('Error fetching zones for overlap validation:', error)
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
  const shippingCost = parseInt(formData.get('shipping_cost') as string, 10)
  const color = formData.get('color') as string
  const freeShippingThresholdStr = formData.get('free_shipping_threshold') as string
  const sortOrderStr = formData.get('sort_order') as string

  if (!name || !polygonStr || isNaN(shippingCost)) {
    return { error: 'Faltan campos requeridos' }
  }

  let polygon: GeoJSONPolygon
  try {
    polygon = JSON.parse(polygonStr)
  } catch {
    return { error: 'Formato de polígono inválido' }
  }

  // Validate polygon has at least 4 points (3 vertices + closing point)
  if (!polygon.coordinates?.[0] || polygon.coordinates[0].length < 4) {
    return { error: 'El polígono debe tener al menos 3 vértices' }
  }

  // Validate no overlap
  const overlapCheck = await validateNoOverlap(polygon)
  if (!overlapCheck.isValid) {
    return { error: `La zona se superpone con "${overlapCheck.overlappingZone}"` }
  }

  const freeShippingThreshold = freeShippingThresholdStr ? parseInt(freeShippingThresholdStr, 10) : null
  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0

  const { data: newZone, error } = await supabase.from('delivery_zones').insert({
    name,
    polygon,
    shipping_cost: shippingCost,
    color: color || '#FF6B00',
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

  // If polygon is being updated, validate no overlap
  if (data.polygon) {
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
