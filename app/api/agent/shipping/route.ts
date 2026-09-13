import { requireAgentSecret } from '@/lib/server/agent-auth'
import { agentError, agentInternalError } from '@/lib/server/agent-errors'
import { calculateShippingCost } from '@/app/actions/shipping'
import { devError } from '@/lib/server/logger'

export const dynamic = 'force-dynamic'

interface ShippingRequest {
  lat?: unknown
  lng?: unknown
  subtotal?: unknown
}

const esNumeroFinito = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

/**
 * POST /api/agent/shipping
 *
 * Delega en el mismo calculo que usa el checkout web. El agente no puede
 * replicarlo: las zonas son poligonos y el point-in-polygon corre con Turf.js
 * del lado del POS.
 */
export async function POST(request: Request) {
  const denied = requireAgentSecret(request)
  if (denied) return denied

  try {
    let body: ShippingRequest
    try {
      body = await request.json()
    } catch {
      return agentError('invalid_request', 'El cuerpo no es JSON válido.')
    }

    const { lat, lng, subtotal } = body
    const faltantes: string[] = []

    if (!esNumeroFinito(lat) || lat < -90 || lat > 90) faltantes.push('lat')
    if (!esNumeroFinito(lng) || lng < -180 || lng > 180) faltantes.push('lng')
    if (!esNumeroFinito(subtotal) || subtotal < 0) faltantes.push('subtotal')

    if (faltantes.length > 0) {
      return agentError(
        'invalid_request',
        'Coordenadas o subtotal inválidos.',
        { fields: faltantes }
      )
    }

    const { data: result, error } = await calculateShippingCost({
      lat: lat as number,
      lng: lng as number,
      subtotal: subtotal as number,
    })

    if (error || !result) {
      devError('[agent/shipping] fallo el calculo:', error)
      return agentInternalError()
    }

    if (result.isOutOfCoverage) {
      return agentError(
        'out_of_coverage',
        'Esa dirección queda fuera de la zona de reparto.'
      )
    }

    return Response.json({
      shipping_cost: result.shippingCost,
      is_free_shipping: result.isFreeShipping,
      delivery_zone: result.zone
        ? { id: result.zone.id, name: result.zone.name }
        : null,
    })
  } catch (e) {
    devError('[agent/shipping] error inesperado:', e)
    return agentInternalError()
  }
}
