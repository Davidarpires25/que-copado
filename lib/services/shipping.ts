import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import distance from '@turf/distance'
import turfArea from '@turf/area'
import { point, polygon as turfPolygon } from '@turf/helpers'
import type { DeliveryZone, ShippingResult } from '@/lib/types/database'

/**
 * Returns the area in m² for any zone type.
 * Circle: π·r²   Polygon: @turf/area
 */
function zoneAreaM2(zone: DeliveryZone): number {
  if (zone.zone_type === 'circle' && zone.radius_meters) {
    return Math.PI * zone.radius_meters ** 2
  }
  if (zone.polygon) {
    return turfArea(turfPolygon(zone.polygon.coordinates))
  }
  return Infinity
}

/**
 * Check if a point is inside a zone (supports polygon and circle).
 */
function pointInZone(customerPoint: ReturnType<typeof point>, zone: DeliveryZone): boolean {
  if (zone.zone_type === 'circle') {
    if (!zone.center || !zone.radius_meters) return false
    const centerPoint = point([zone.center.lng, zone.center.lat])
    const distMeters = distance(customerPoint, centerPoint, { units: 'kilometers' }) * 1000
    return distMeters <= zone.radius_meters
  }
  if (!zone.polygon) return false
  return booleanPointInPolygon(customerPoint, {
    type: 'Polygon',
    coordinates: zone.polygon.coordinates,
  })
}

/**
 * Calculate shipping cost based on delivery zones.
 *
 * Among all zones that contain the customer location, the SMALLEST zone wins
 * (most specific coverage takes priority, regardless of sort_order).
 * sort_order is used only as a tiebreaker when two zones have identical area.
 */
export function calculateShippingByZone(
  lat: number,
  lng: number,
  subtotal: number,
  zones: DeliveryZone[]
): ShippingResult {
  if (!zones || zones.length === 0) {
    return { zone: null, shippingCost: 0, isFreeShipping: false, isOutOfCoverage: true }
  }

  const customerPoint = point([lng, lat])

  // Collect all zones that contain the customer
  const matchingZones: { zone: DeliveryZone; area: number }[] = []

  for (const zone of zones) {
    if (!zone.is_active) continue
    try {
      if (pointInZone(customerPoint, zone)) {
        matchingZones.push({ zone, area: zoneAreaM2(zone) })
      }
    } catch {
      continue
    }
  }

  if (matchingZones.length === 0) {
    return { zone: null, shippingCost: 0, isFreeShipping: false, isOutOfCoverage: true }
  }

  // Pick the smallest zone (tiebreak: lowest sort_order)
  matchingZones.sort((a, b) => a.area - b.area || a.zone.sort_order - b.zone.sort_order)
  const { zone } = matchingZones[0]

  const isFreeShipping =
    zone.free_shipping_threshold !== null && subtotal >= zone.free_shipping_threshold

  return {
    zone,
    shippingCost: isFreeShipping ? 0 : zone.shipping_cost,
    isFreeShipping,
    isOutOfCoverage: false,
  }
}

/**
 * Get a user-friendly message for the shipping result
 */
export function getShippingMessage(result: ShippingResult): string {
  if (result.isOutOfCoverage) {
    return 'Tu ubicación está fuera de nuestra zona de cobertura'
  }
  if (result.isFreeShipping) {
    return `Envío gratis en zona ${result.zone?.name}`
  }
  return `Envío a ${result.zone?.name}`
}
