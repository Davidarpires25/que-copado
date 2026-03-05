'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/server/auth'
import { revalidateDeliveryZones } from '@/lib/server/revalidate'
import { friendlyError } from '@/lib/server/error-messages'
import type { DeliveryZone, GeoJSONPolygon, ZoneCenter } from '@/lib/types/database'
// Note: overlap validation intentionally removed — overlapping zones are supported
// (smallest zone wins, so nested zones with different pricing work by design)

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  return { supabase, user }
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validatePolygon(polygon: GeoJSONPolygon): string | null {
  if (polygon.type !== 'Polygon') return 'El tipo de polígono es inválido'
  if (!polygon.coordinates?.[0] || polygon.coordinates[0].length < 4)
    return 'El polígono debe tener al menos 3 vértices'
  for (const coord of polygon.coordinates[0]) {
    if (!Array.isArray(coord) || coord.length !== 2) return 'Formato de coordenadas inválido'
    const [lng, lat] = coord
    if (typeof lng !== 'number' || typeof lat !== 'number') return 'Las coordenadas deben ser números'
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return 'Las coordenadas están fuera de rango'
  }
  return null
}

function validateColor(color: string): string | null {
  if (!/^#[0-9A-F]{6}$/i.test(color)) return 'El formato del color debe ser hexadecimal (#RRGGBB)'
  return null
}

function validateCost(value: string): { cost: number; error: string | null } {
  const cost = parseInt(value, 10)
  if (isNaN(cost) || cost < 0) return { cost: 0, error: 'El costo de envío debe ser un número válido mayor o igual a 0' }
  if (cost > 100000) return { cost: 0, error: 'El costo de envío no puede exceder $100.000' }
  return { cost, error: null }
}

// ─── Public actions ───────────────────────────────────────────────────────────

export async function getDeliveryZones(): Promise<{ data: DeliveryZone[] | null; error: string | null }> {
  const { supabase, user } = await requireAdmin()
  if (!user) return { data: null, error: 'No autorizado' }

  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return { data: null, error: friendlyError(error) }
  return { data: data as DeliveryZone[], error: null }
}

export async function getActiveDeliveryZones(): Promise<{ data: DeliveryZone[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) return { data: null, error: friendlyError(error) }
  return { data: data as DeliveryZone[], error: null }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createDeliveryZone(formData: FormData) {
  const { supabase, user } = await requireAdmin()
  if (!user) return { error: 'No autorizado' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'El nombre de la zona es requerido' }
  if (name.length > 100) return { error: 'El nombre no puede exceder 100 caracteres' }

  const zoneType = (formData.get('zone_type') as string) || 'polygon'
  if (!['polygon', 'circle'].includes(zoneType)) return { error: 'Tipo de zona inválido' }

  const { cost, error: costError } = validateCost(formData.get('shipping_cost') as string)
  if (costError) return { error: costError }

  const color = (formData.get('color') as string) || '#FF6B00'
  if (validateColor(color)) return { error: validateColor(color)! }

  const freeThresholdStr = formData.get('free_shipping_threshold') as string
  let freeShippingThreshold: number | null = null
  if (freeThresholdStr?.trim()) {
    freeShippingThreshold = parseInt(freeThresholdStr, 10)
    if (isNaN(freeShippingThreshold) || freeShippingThreshold < 0)
      return { error: 'El umbral de envío gratis debe ser un número válido' }
    if (freeShippingThreshold > 10000000)
      return { error: 'El umbral de envío gratis no puede exceder $10.000.000' }
  }

  const sortOrder = parseInt((formData.get('sort_order') as string) || '0', 10)

  // ── Polygon zone ──────────────────────────────────────────────────────────
  if (zoneType === 'polygon') {
    const polygonStr = formData.get('polygon') as string
    if (!polygonStr?.trim()) return { error: 'El polígono es requerido' }

    let polygon: GeoJSONPolygon
    try {
      polygon = JSON.parse(polygonStr)
    } catch {
      return { error: 'Formato de polígono inválido' }
    }

    const polyError = validatePolygon(polygon)
    if (polyError) return { error: polyError }

    const { data: newZone, error } = await supabase
      .from('delivery_zones')
      .insert({
        name,
        zone_type: 'polygon',
        polygon,
        center: null,
        radius_meters: null,
        shipping_cost: cost,
        color: color.toUpperCase(),
        is_active: true,
        sort_order: sortOrder,
        free_shipping_threshold: freeShippingThreshold,
      })
      .select()
      .single()

    if (error) return { error: friendlyError(error) }
    revalidateDeliveryZones()
    return { success: true, zone: newZone as DeliveryZone }
  }

  // ── Circle zone ───────────────────────────────────────────────────────────
  const centerStr = formData.get('center') as string
  const radiusStr = formData.get('radius_meters') as string

  if (!centerStr?.trim()) return { error: 'El centro del radio es requerido' }
  if (!radiusStr?.trim()) return { error: 'El radio es requerido' }

  let center: ZoneCenter
  try {
    center = JSON.parse(centerStr)
    if (typeof center.lat !== 'number' || typeof center.lng !== 'number')
      throw new Error('invalid')
  } catch {
    return { error: 'Formato del centro inválido' }
  }

  const radiusMeters = parseInt(radiusStr, 10)
  if (isNaN(radiusMeters) || radiusMeters <= 0) return { error: 'El radio debe ser mayor a 0 metros' }
  if (radiusMeters > 100000) return { error: 'El radio no puede exceder 100 km' }

  const { data: newZone, error } = await supabase
    .from('delivery_zones')
    .insert({
      name,
      zone_type: 'circle',
      polygon: null,
      center,
      radius_meters: radiusMeters,
      shipping_cost: cost,
      color: color.toUpperCase(),
      is_active: true,
      sort_order: sortOrder,
      free_shipping_threshold: freeShippingThreshold,
    })
    .select()
    .single()

  if (error) return { error: friendlyError(error) }
  revalidateDeliveryZones()
  return { success: true, zone: newZone as DeliveryZone }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateDeliveryZone(
  zoneId: string,
  data: {
    name?: string
    polygon?: GeoJSONPolygon | null
    center?: ZoneCenter | null
    radius_meters?: number | null
    zone_type?: string
    shipping_cost?: number
    color?: string
    is_active?: boolean
    sort_order?: number
    free_shipping_threshold?: number | null
  }
) {
  const { supabase, user } = await requireAdmin()
  if (!user) return { error: 'No autorizado' }
  if (!zoneId?.trim()) return { error: 'ID de zona inválido' }

  if (data.name !== undefined) {
    data.name = data.name.trim()
    if (!data.name) return { error: 'El nombre de la zona no puede estar vacío' }
    if (data.name.length > 100) return { error: 'El nombre no puede exceder 100 caracteres' }
  }

  if (data.shipping_cost !== undefined) {
    if (isNaN(data.shipping_cost) || data.shipping_cost < 0)
      return { error: 'El costo de envío debe ser un número válido mayor o igual a 0' }
    if (data.shipping_cost > 100000) return { error: 'El costo de envío no puede exceder $100.000' }
  }

  if (data.free_shipping_threshold !== undefined && data.free_shipping_threshold !== null) {
    if (isNaN(data.free_shipping_threshold) || data.free_shipping_threshold < 0)
      return { error: 'El umbral de envío gratis debe ser un número válido' }
    if (data.free_shipping_threshold > 10000000)
      return { error: 'El umbral de envío gratis no puede exceder $10.000.000' }
  }

  if (data.color !== undefined) {
    const colorError = validateColor(data.color)
    if (colorError) return { error: colorError }
    data.color = data.color.toUpperCase()
  }

  if (data.polygon) {
    const polyError = validatePolygon(data.polygon)
    if (polyError) return { error: polyError }
  }

  if (data.center !== undefined && data.center !== null && data.radius_meters) {
    if (data.radius_meters <= 0) return { error: 'El radio debe ser mayor a 0 metros' }
    if (data.radius_meters > 100000) return { error: 'El radio no puede exceder 100 km' }
  }

  const { error } = await supabase
    .from('delivery_zones')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', zoneId)

  if (error) return { error: friendlyError(error) }

  revalidateDeliveryZones()
  return { success: true }
}

// ─── Delete / Toggle / Reorder ────────────────────────────────────────────────

export async function deleteDeliveryZone(zoneId: string) {
  const { supabase, user } = await requireAdmin()
  if (!user) return { error: 'No autorizado' }
  if (!zoneId?.trim()) return { error: 'ID de zona inválido' }

  const { error } = await supabase.from('delivery_zones').delete().eq('id', zoneId)
  if (error) return { error: friendlyError(error) }

  revalidateDeliveryZones()
  return { success: true }
}

export async function toggleZoneActive(zoneId: string, isActive: boolean) {
  return updateDeliveryZone(zoneId, { is_active: isActive })
}

export async function reorderDeliveryZones(zoneIds: string[]) {
  const { supabase, user } = await requireAdmin()
  if (!user) return { error: 'No autorizado' }
  if (!Array.isArray(zoneIds) || zoneIds.length === 0) return { error: 'La lista de zonas es inválida' }

  for (let i = 0; i < zoneIds.length; i++) {
    const { error } = await supabase
      .from('delivery_zones')
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq('id', zoneIds[i])
    if (error) return { error: friendlyError(error) }
  }

  revalidateDeliveryZones()
  return { success: true }
}
