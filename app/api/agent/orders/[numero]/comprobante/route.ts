import { requireAgentSecret } from '@/lib/server/agent-auth'
import { agentError, agentInternalError } from '@/lib/server/agent-errors'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { devError } from '@/lib/server/logger'
import { diaDelLocal } from '@/lib/server/dia-del-local'

export const dynamic = 'force-dynamic'

/**
 * POST /api/agent/orders/{numero}/comprobante
 *
 * El cliente dice que transfirio. **No es un cobro.**
 *
 * Deja la marca y el momento, y nada mas: el `status` del pedido no se toca.
 * Esa distincion es todo el punto del endpoint. El estado gobierna la cocina y
 * la caja --`pagado` descuenta stock, cierra el arqueo, saca el pedido de
 * pendientes-- y una transferencia que alguien *dice* haber hecho no puede
 * disparar nada de eso. Quien verifica que la plata entro es una persona del
 * local, mirando el banco.
 *
 * Marcar dos veces no es un error: el cliente puede repetir el aviso, y la
 * respuesta es la misma. Se conserva el primer momento, que es cuando aviso.
 *
 * Solo para pedidos por transferencia: marcar uno en efectivo seria una senal
 * que nadie puede verificar, asi que es `400 invalid_request`.
 */
export async function POST(
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

    // Service role y no createAdminClient(): este handler no tiene sesion de
    // usuario, asi que ese cliente vale por `anon`, y `anon` no puede leer ni
    // escribir `orders`.
    const supabase = createServiceRoleClient()

    // El numero se reinicia cada dia, asi que sin acotar por fecha el pedido 7
    // de hoy podria resolverse contra el 7 de la semana pasada. Y el dia es el
    // del local, no el de UTC: ver `diaDelLocal`.
    const hoy = diaDelLocal()

    const { data: pedido, error: errorLectura } = await supabase
      .from('orders')
      .select('id, payment_method, status, transfer_claimed_at')
      .eq('order_number', numeroPedido)
      .eq('order_day', hoy)
      .maybeSingle()

    if (errorLectura) {
      devError('[agent/comprobante] no se pudo leer el pedido:', errorLectura)
      return agentInternalError()
    }

    if (!pedido) {
      // `not_found` y no `invalid_request`, igual que la consulta del pedido:
      // el numero esta bien formado, lo que no existe es el pedido.
      return agentError('not_found', 'No encontramos ese pedido de hoy.')
    }

    if (pedido.payment_method !== 'transfer') {
      return agentError(
        'invalid_request',
        'Ese pedido no es por transferencia.'
      )
    }

    // Ya marcado: se responde igual y se conserva el primer aviso.
    if (pedido.transfer_claimed_at) {
      return Response.json({
        order_number: numeroPedido,
        status: pedido.status,
        transfer_claimed_at: pedido.transfer_claimed_at,
      })
    }

    const marcadoEn = new Date().toISOString()

    const { error: errorEscritura } = await supabase
      .from('orders')
      .update({ transfer_claimed_at: marcadoEn })
      .eq('id', pedido.id)

    if (errorEscritura) {
      devError('[agent/comprobante] no se pudo marcar:', errorEscritura)
      return agentInternalError()
    }

    // Se devuelve el `status` sin cambios a proposito: es la forma de que el
    // otro lado compruebe que marcar no cobro nada.
    return Response.json({
      order_number: numeroPedido,
      status: pedido.status,
      transfer_claimed_at: marcadoEn,
    })
  } catch (e) {
    devError('[agent/comprobante] error inesperado:', e)
    return agentInternalError()
  }
}
