import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'
import type { DeliveryZone, ShippingResult } from '@/lib/types/database'

/**
 * Calculate shipping cost based on delivery zones
 *
 * @param lat - Customer latitude
 * @param lng - Customer longitude
 * @param subtotal - Order subtotal in ARS
 * @param zones - Active delivery zones sorted by sort_order
 * @returns ShippingResult with zone info, cost, and coverage status
 */
export function calculateShippingByZone(
  lat: number,
  lng: number,
  subtotal: number,
  zones: DeliveryZone[]
): ShippingResult {
  // If no zones configured, return out of coverage
  if (!zones || zones.length === 0) {
    return {
      zone: null,
      shippingCost: 0,
      isFreeShipping: false,
      isOutOfCoverage: true,
    }
  }

  // Create GeoJSON point from customer coordinates
  const customerPoint = point([lng, lat])

  // Find the zone that contains the customer location
  for (const zone of zones) {
    if (!zone.is_active) continue

    try {
      // Check if point is inside the polygon
      const isInside = booleanPointInPolygon(customerPoint, {
        type: 'Polygon',
        coordinates: zone.polygon.coordinates,
      })

      if (isInside) {
        // Check if order qualifies for free shipping in this zone
        const isFreeShipping = zone.free_shipping_threshold !== null &&
          subtotal >= zone.free_shipping_threshold

        return {
          zone,
          shippingCost: isFreeShipping ? 0 : zone.shipping_cost,
          isFreeShipping,
          isOutOfCoverage: false,
        }
      }
    } catch (error) {
      console.error(`Error checking zone ${zone.name}:`, error)
      continue
    }
  }

  // Customer is outside all delivery zones
  return {
    zone: null,
    shippingCost: 0,
    isFreeShipping: false,
    isOutOfCoverage: true,
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
