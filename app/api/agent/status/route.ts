import { requireAgentSecret } from '@/lib/server/agent-auth'
import { agentInternalError } from '@/lib/server/agent-errors'
import { getBusinessSettings } from '@/app/actions/business-settings'
import { checkBusinessStatus } from '@/lib/services/business-hours'
import { devError } from '@/lib/server/logger'

// El estado depende de la hora y de la pausa manual: cachearlo daria respuestas
// viejas justo cuando importan.
export const dynamic = 'force-dynamic'

/**
 * GET /api/agent/status
 *
 * Le dice al agente si puede abrir una conversacion de pedido.
 *
 * Es informativo, no una reserva: entre esta consulta y la confirmacion del
 * cliente pueden pasar minutos, y el local puede pausarse en el medio. La
 * autoridad sigue siendo la creacion del pedido, que vuelve a validar.
 */
export async function GET(request: Request) {
  const denied = requireAgentSecret(request)
  if (denied) return denied

  try {
    const { data: settings, error } = await getBusinessSettings()

    if (error || !settings) {
      devError('[agent/status] no se pudo leer business_settings:', error)
      return agentInternalError()
    }

    const status = checkBusinessStatus(settings)

    if (status.isPaused) {
      return Response.json({
        accepting_orders: false,
        reason: 'business_paused',
        message: status.message,
      })
    }

    if (!status.isOpen) {
      return Response.json({
        accepting_orders: false,
        reason: 'business_closed',
        message: status.message,
      })
    }

    return Response.json({
      accepting_orders: true,
      reason: null,
      message: null,
    })
  } catch (e) {
    devError('[agent/status] error inesperado:', e)
    return agentInternalError()
  }
}
