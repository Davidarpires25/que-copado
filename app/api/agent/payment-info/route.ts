import { requireAgentSecret } from '@/lib/server/agent-auth'
import { agentInternalError } from '@/lib/server/agent-errors'
import { getBusinessSettings } from '@/app/actions/business-settings'
import { devError } from '@/lib/server/logger'

// El local puede cargar o corregir su alias en cualquier momento desde el
// panel, y el agente tiene que leer lo que hay ahora, no lo de hace una hora.
export const dynamic = 'force-dynamic'

/**
 * GET /api/agent/payment-info
 *
 * Los datos para que un cliente transfiera: alias, CBU y titular.
 *
 * Existe porque hoy alguien elige transferencia por WhatsApp, el agente le
 * toma el pedido y se queda sin nada que darle. Los datos estaban en la base
 * --el local los cargo-- pero no habia por donde leerlos.
 *
 * **Que el local no los haya configurado no es un error.** Devuelve 200 con
 * `transferencia: null`, y el agente distingue ese caso: pasa la conversacion
 * a una persona en vez de inventar un alias. Un 404 o un 500 lo obligarian a
 * adivinar si el problema es suyo o del local.
 *
 * **Los tres campos o ninguno.** Si falta el titular tambien devuelve `null`,
 * aunque haya alias y CBU: el cliente carga el alias en su banco y sin el
 * nombre no sabe si le esta transfiriendo al local o a un desconocido. La
 * garantia vive aca y no en cada consumidor, asi que cualquiera que lea este
 * endpoint recibe datos usables o nada.
 *
 * Solo lectura. Editarlos es del panel, no del contrato.
 */
export async function GET(request: Request) {
  const denied = requireAgentSecret(request)
  if (denied) return denied

  try {
    const { data: settings, error } = await getBusinessSettings()

    if (error || !settings) {
      devError('[agent/payment-info] no se pudo leer business_settings:', error)
      return agentInternalError()
    }

    const alias = (settings.transfer_alias ?? '').trim()
    const cbu = (settings.transfer_cbu ?? '').trim()
    const titular = (settings.transfer_titular ?? '').trim()

    if (!alias || !cbu || !titular) {
      return Response.json({ transferencia: null })
    }

    return Response.json({ transferencia: { alias, cbu, titular } })
  } catch (e) {
    devError('[agent/payment-info] error inesperado:', e)
    return agentInternalError()
  }
}
