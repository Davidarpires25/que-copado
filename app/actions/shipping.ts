'use server'

import { getActiveDeliveryZones } from '@/app/actions/delivery-zones'
import { calculateShippingByZone, getShippingMessage } from '@/lib/services/shipping'
import type { ShippingResult } from '@/lib/types/database'

export interface CalculateShippingParams {
  lat: number
  lng: number
  subtotal: number
}

/**
 * Server action to calculate shipping cost based on customer location
 *
 * This runs on the server to ensure delivery zones data is fetched securely
 * and calculation logic cannot be tampered with by the client.
 */
export async function calculateShippingCost(
  params: CalculateShippingParams
): Promise<{ data: ShippingResult | null; error: string | null }> {
  try {
    const { lat, lng, subtotal } = params

    // Validate input
    if (typeof lat !== 'number' || typeof lng !== 'number' || typeof subtotal !== 'number') {
      return { data: null, error: 'Parámetros inválidos' }
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { data: null, error: 'Coordenadas inválidas' }
    }

    if (subtotal < 0) {
      return { data: null, error: 'Subtotal inválido' }
    }

    // Fetch active delivery zones
    const { data: zones, error: zonesError } = await getActiveDeliveryZones()

    if (zonesError) {
      return { data: null, error: 'Error al cargar zonas de delivery' }
    }

    if (!zones || zones.length === 0) {
      // No zones configured - return out of coverage
      return {
        data: {
          zone: null,
          shippingCost: 0,
          isFreeShipping: false,
          isOutOfCoverage: true,
        },
        error: null,
      }
    }

    // Calculate shipping using the service
    const result = calculateShippingByZone(lat, lng, subtotal, zones)

    return { data: result, error: null }
  } catch (error) {
    // Log error for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Error calculating shipping:', error)
    }
    return { data: null, error: 'Error al calcular el costo de envío' }
  }
}

/**
 * Get a user-friendly shipping message
 */
export async function getShippingInfo(
  params: CalculateShippingParams
): Promise<{ message: string; result: ShippingResult | null }> {
  const { data: result, error } = await calculateShippingCost(params)

  if (error || !result) {
    return {
      message: 'No se pudo calcular el envío',
      result: null,
    }
  }

  return {
    message: getShippingMessage(result),
    result,
  }
}
