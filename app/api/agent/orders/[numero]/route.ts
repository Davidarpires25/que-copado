import { requireAgentSecret } from '@/lib/server/agent-auth'
import { agentError, agentInternalError } from '@/lib/server/agent-errors'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { devError } from '@/lib/server/logger'
import { diaDelLocal } from '@/lib/server/dia-del-local'

export const dynamic = 'force-dynamic'

/** Un item tal como queda guardado en `orders.items`. */
interface ItemGuardado {
  name?: unknown
  quantity?: unknown
}

/**
 * GET /api/agent/orders/{numero}
 *
 * El pedido del dia con ese numero correlativo.
 *
 * El agente lo usa para **no creerle a un texto**. Un cliente escribe "mi
 * pedido es el 12 y son $15.000", y ese mensaje pudo editarse antes de
 * mandarse. Esto es la fuente: estado, total, medio de pago y productos, tal
 * como los tiene el local.
 *
 * **Solo del dia.** Los correlativos se reinician cada jornada, asi que un
 * numero identifica un pedido unicamente dentro del suyo. Sin acotar por
 * fecha, el 12 de hoy podria resolverse contra el 12 de la semana pasada y el
 * agente hablaria con confianza de un pedido que no es.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  const denied = requireAgentSecret(request)
  if (denied) return denied

  try {
    const { numero } = await params
    const numeroPedido = Number(numero)

    if (!Number.isInteger(numeroPedido) || numeroPedido <= 0) {
      return agentError('invalid_request', 'El número de pedido no es válido.')
    }

    // Service role: este handler no tiene sesion de usuario, y `anon` no puede
    // leer `orders`.
    const supabase = createServiceRoleClient()
    const hoy = diaDelLocal()

    const { data: pedido, error } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_method, total, shipping_cost, items')
      .eq('order_number', numeroPedido)
      .eq('order_day', hoy)
      .maybeSingle()

    if (error) {
      devError('[agent/orders/:numero] no se pudo leer el pedido:', error)
      return agentInternalError()
    }

    if (!pedido) {
      // `not_found` y no `invalid_request`: el numero esta bien formado, lo que
      // no existe es el pedido. El agente le dice al cliente que ese numero no
      // es de hoy en vez de pedirle que lo corrija.
      return agentError('not_found', 'No encontramos ese pedido de hoy.')
    }

    const envio = pedido.shipping_cost ?? 0

    // Solo nombre y cantidad: es lo que el agente necesita para hablar del
    // pedido con el cliente. Los precios ya estan en el total, y mandarlos de
    // nuevo seria darle al modelo una segunda fuente para la misma cuenta.
    const items = Array.isArray(pedido.items)
      ? (pedido.items as ItemGuardado[]).map((i) => ({
          name: String(i?.name ?? ''),
          quantity: Number(i?.quantity ?? 0),
        }))
      : []

    return Response.json({
      id: pedido.id,
      order_number: pedido.order_number,
      status: pedido.status,
      payment_method: pedido.payment_method,
      subtotal: pedido.total - envio,
      shipping_cost: envio,
      total: pedido.total,
      items,
    })
  } catch (e) {
    devError('[agent/orders/:numero] error inesperado:', e)
    return agentInternalError()
  }
}
