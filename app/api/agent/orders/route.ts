import { createHash } from 'node:crypto'
import { requireAgentSecret } from '@/lib/server/agent-auth'
import { agentError, agentInternalError } from '@/lib/server/agent-errors'
import { createOrder, validateCartStock } from '@/app/actions/orders'
import { calculateShippingCost } from '@/app/actions/shipping'
import { createAdminClient, createServiceRoleClient } from '@/lib/supabase/admin'
import { esTelefonoValido } from '@/lib/utils/phone'
import { devError } from '@/lib/server/logger'
import type { PaymentMethod } from '@/lib/types/database'
import type { OrderItem } from '@/lib/types/orders'

export const dynamic = 'force-dynamic'

/**
 * El checkout web representa el retiro escribiendo esta cadena en
 * `customer_address` (ver docs/DELIVERY_TYPE.md). La convencion vive aca y no
 * del lado del agente: si algun dia deja de ser un string magico, cambia en un
 * solo lugar.
 */
const DIRECCION_RETIRO = 'Retiro en local'

/** Los mismos que ofrece el checkout publico. `card` es solo presencial. */
const METODOS_PAGO: PaymentMethod[] = ['cash', 'transfer', 'mercadopago']

interface CuerpoPedido {
  delivery_type?: unknown
  customer?: {
    name?: unknown
    phone?: unknown
    address?: unknown
    coordinates?: { lat?: unknown; lng?: unknown } | null
  }
  items?: unknown
  payment_method?: unknown
  notes?: unknown
}

interface ItemPedido {
  product_id: string
  quantity: number
  notes: string | null
}

const esTextoConContenido = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0

const esNumeroFinito = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

/**
 * POST /api/agent/orders
 *
 * Crea el pedido reutilizando `createOrder()`, la misma funcion que usa el
 * checkout web. Este handler no valida stock ni recalcula precios por su
 * cuenta: solo traduce la forma del contrato a la que espera esa accion, y
 * traduce sus rechazos a codigos que el agente pueda leer.
 */
export async function POST(request: Request) {
  const denied = requireAgentSecret(request)
  if (denied) return denied

  try {
    const crudo = await request.text()

    let body: CuerpoPedido
    try {
      body = JSON.parse(crudo)
    } catch {
      return agentError('invalid_request', 'El cuerpo no es JSON válido.')
    }

    // ── Validacion de forma ────────────────────────────────────────────────

    const campos: string[] = []

    const deliveryType = body.delivery_type
    if (deliveryType !== 'delivery' && deliveryType !== 'pickup') {
      campos.push('delivery_type')
    }

    const cliente = body.customer ?? {}
    if (!esTextoConContenido(cliente.name)) campos.push('customer.name')
    if (!esTextoConContenido(cliente.phone) || !esTelefonoValido(cliente.phone as string)) {
      campos.push('customer.phone')
    }

    const metodoPago = body.payment_method
    if (!METODOS_PAGO.includes(metodoPago as PaymentMethod)) {
      campos.push('payment_method')
    }

    const items: ItemPedido[] = []
    if (!Array.isArray(body.items) || body.items.length === 0) {
      campos.push('items')
    } else {
      for (const [i, it] of body.items.entries()) {
        const item = it as Record<string, unknown>
        if (!esTextoConContenido(item?.product_id)) {
          campos.push(`items[${i}].product_id`)
          continue
        }
        if (!Number.isInteger(item?.quantity) || (item.quantity as number) < 1) {
          campos.push(`items[${i}].quantity`)
          continue
        }
        items.push({
          product_id: item.product_id as string,
          quantity: item.quantity as number,
          notes: esTextoConContenido(item?.notes) ? (item.notes as string).trim() : null,
        })
      }
    }

    // Delivery sin ubicacion no se puede cotizar ni entregar. Para retiro, en
    // cambio, la direccion sobra.
    let coords: { lat: number; lng: number } | null = null
    if (deliveryType === 'delivery') {
      if (!esTextoConContenido(cliente.address)) campos.push('customer.address')

      const c = cliente.coordinates
      if (!c || !esNumeroFinito(c.lat) || !esNumeroFinito(c.lng)) {
        campos.push('customer.coordinates')
      } else {
        coords = { lat: c.lat as number, lng: c.lng as number }
      }
    }

    if (campos.length > 0) {
      return agentError('invalid_request', 'Faltan datos o son inválidos.', { fields: campos })
    }

    // ── Idempotencia ───────────────────────────────────────────────────────

    const idempotencyKey = request.headers.get('idempotency-key')
    const bodyHash = createHash('sha256').update(crudo).digest('hex')

    if (idempotencyKey) {
      const yaExiste = await buscarPedidoPorClave(idempotencyKey)

      if (yaExiste) {
        if (yaExiste.idempotency_body_hash !== bodyHash) {
          return agentError(
            'invalid_request',
            'Esa clave de idempotencia ya se usó con un pedido distinto.',
            undefined,
            409
          )
        }
        // Reintento legitimo: se describe el pedido que ya existe.
        return Response.json(respuestaPedido(yaExiste), { status: 200 })
      }
    }

    // ── Productos reales ───────────────────────────────────────────────────
    //
    // Hacen falta antes de seguir por dos motivos.
    //
    // Uno: `createOrder` recalcula el total con los precios de la base, pero
    // guarda el array `items` TAL CUAL se lo pasan. Ese JSON es lo que ve la
    // comanda de cocina y el ticket impreso, asi que mandarlo sin nombre o con
    // precio cero produce un pedido correcto en plata e ilegible en cocina.
    //
    // Dos: el agente manda solo ids. Para decirle que producto se agoto hay que
    // poder nombrarlo.

    const supabaseLectura = await createAdminClient()
    const { data: productos, error: errorProductos } = await supabaseLectura
      .from('products')
      .select('id, name, price')
      .in('id', items.map((i) => i.product_id))

    if (errorProductos) {
      devError('[agent/orders] no se pudieron leer los productos:', errorProductos)
      return agentInternalError()
    }

    const porId = new Map((productos ?? []).map((p) => [p.id, p]))
    const inexistentes = items.filter((i) => !porId.has(i.product_id))

    if (inexistentes.length > 0) {
      return agentError(
        'item_unavailable',
        'Algunos productos del pedido ya no existen.',
        { items: inexistentes.map((i) => ({ product_id: i.product_id, name: null })) }
      )
    }

    // ── Stock, con detalle legible por maquina ─────────────────────────────
    //
    // `createOrder` valida stock igual, pero devuelve una cadena en espaniol.
    // Se consulta antes para poder decirle al agente QUE producto y CUANTO hay,
    // que es lo que necesita para rehacer la oferta.

    const { issues, error: errorStock } = await validateCartStock(
      items.map((i) => ({
        id: i.product_id,
        name: porId.get(i.product_id)!.name,
        quantity: i.quantity,
      }))
    )

    if (errorStock) {
      devError('[agent/orders] fallo la validacion de stock:', errorStock)
      return agentInternalError()
    }

    if (issues.length > 0) {
      const noDisponibles = issues.filter((i) => i.issue !== 'insufficient_stock')
      const detalle = {
        items: issues.map((i) => ({
          product_id: i.productId,
          name: i.productName,
          requested: i.requested,
          available: i.available,
        })),
      }

      if (noDisponibles.length > 0) {
        return agentError(
          'item_unavailable',
          'Algunos productos del pedido ya no están disponibles.',
          detalle
        )
      }

      return agentError(
        'insufficient_stock',
        'No hay stock suficiente para las cantidades pedidas.',
        detalle
      )
    }

    // ── Envio ──────────────────────────────────────────────────────────────

    let shippingCost = 0
    let zoneId: string | null = null

    if (deliveryType === 'delivery' && coords) {
      // El subtotal todavia no se conoce —lo calcula el servidor con los precios
      // vigentes— y el umbral de envio gratis depende de el. Se cotiza con cero
      // para obtener la zona; `createOrder` recalcula el costo real contra esa
      // zona antes de guardar.
      const { data: envio, error: errorEnvio } = await calculateShippingCost({
        lat: coords.lat,
        lng: coords.lng,
        subtotal: 0,
      })

      if (errorEnvio || !envio) {
        devError('[agent/orders] fallo el calculo de envio:', errorEnvio)
        return agentInternalError()
      }

      if (envio.isOutOfCoverage) {
        return agentError(
          'out_of_coverage',
          'Esa dirección queda fuera de la zona de reparto.'
        )
      }

      shippingCost = envio.shippingCost
      zoneId = envio.zone?.id ?? null
    }

    // ── Creacion ───────────────────────────────────────────────────────────

    const telefono = (cliente.phone as string).trim()

    const orderItems: OrderItem[] = items.map((i) => {
      const producto = porId.get(i.product_id)!
      return {
        id: i.product_id,
        name: producto.name,
        price: producto.price,
        quantity: i.quantity,
        notes: i.notes,
      }
    })

    const { data: order, error: errorPedido } = await createOrder(
      {
        customer_name: (cliente.name as string).trim(),
        customer_phone: telefono,
        customer_address:
          deliveryType === 'pickup' ? DIRECCION_RETIRO : (cliente.address as string).trim(),
        customer_coordinates: deliveryType === 'pickup' ? null : coords,
        items: orderItems,
        total: 0, // lo recalcula el servidor
        shipping_cost: shippingCost,
        delivery_zone_id: zoneId,
        notes: esTextoConContenido(body.notes) ? (body.notes as string).trim() : null,
        payment_method: metodoPago as PaymentMethod,
      },
      {
        source: 'whatsapp',
        // Por telefono y no por IP: todos los pedidos del agente salen del mismo
        // servidor, asi que una clave por IP cortaria el canal para todos los
        // clientes al undecimo pedido de la hora.
        rateLimitKey: `order:wa:${telefono}`,
      }
    )

    if (errorPedido || !order) {
      return traducirRechazo(errorPedido)
    }

    if (idempotencyKey) {
      await marcarIdempotencia(order.id, idempotencyKey, bodyHash)
    }

    return Response.json(
      {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        subtotal: order.total - (order.shipping_cost ?? 0),
        shipping_cost: order.shipping_cost,
        total: order.total,
        delivery_zone: zoneId ? { id: zoneId } : null,
      },
      { status: 201 }
    )
  } catch (e) {
    devError('[agent/orders] error inesperado:', e)
    return agentInternalError()
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface PedidoGuardado {
  id: string
  order_number: number | null
  status: string
  total: number
  shipping_cost: number
  delivery_zone_id: string | null
  idempotency_body_hash: string | null
}

async function buscarPedidoPorClave(clave: string): Promise<PedidoGuardado | null> {
  // Service role y no createAdminClient(): este handler no tiene sesion de
  // usuario, asi que ese cliente vale por `anon`, y `anon` no tiene SELECT sobre
  // `orders`. La busqueda volvia vacia siempre y la idempotencia no existia.
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('orders')
    .select('id, order_number, status, total, shipping_cost, delivery_zone_id, idempotency_body_hash')
    .eq('idempotency_key', clave)
    .maybeSingle()

  return (data as PedidoGuardado | null) ?? null
}

/**
 * La clave se escribe DESPUES de crear el pedido, no como parte del INSERT.
 *
 * `createOrder` no la conoce y no tiene por que: es una preocupacion de este
 * canal. La ventana entre ambas escrituras es de milisegundos; el precio de
 * cerrarla seria meter un concepto del agente dentro de la accion compartida.
 *
 * Va con service role por lo mismo que la busqueda: sin sesion de usuario, el
 * UPDATE sobre `orders` lo bloquea la policy —que pide `puede_operar()`— y
 * PostgREST no lo reporta como error, devuelve cero filas y listo. La clave no
 * se guardaba nunca y un reintento del agente creaba un pedido duplicado. Por
 * eso ahora tambien se cuenta lo que se escribio: un cero aca es la falla.
 */
async function marcarIdempotencia(orderId: string, clave: string, hash: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error, count } = await supabase
    .from('orders')
    .update({ idempotency_key: clave, idempotency_body_hash: hash }, { count: 'exact' })
    .eq('id', orderId)

  if (error || count === 0) {
    // El pedido ya existe y es valido; no se le puede fallar al cliente por
    // esto. Se registra para poder detectarlo si empieza a pasar seguido.
    devError('[agent/orders] no se pudo guardar la clave de idempotencia:', error ?? `0 filas para ${orderId}`)
  }
}

/**
 * Traduce el rechazo de `createOrder` —una cadena pensada para una persona— al
 * codigo sobre el que el agente ramifica.
 *
 * El stock ya se filtro antes con `validateCartStock`, asi que lo que llega
 * aca es sobre todo horario, pausa y limite. El calce por texto es fragil a
 * proposito acotado: cualquier caso que no reconozca cae en un codigo generico
 * en vez de inventar uno.
 */
function traducirRechazo(mensaje: string | null): Response {
  const texto = (mensaje ?? '').toLowerCase()

  if (texto.includes('pausad')) {
    return agentError('business_paused', mensaje ?? 'Los pedidos están pausados.')
  }
  if (texto.includes('no estamos recibiendo pedidos')) {
    return agentError('business_closed', mensaje ?? 'El local está cerrado.')
  }
  if (texto.includes('demasiados pedidos')) {
    return agentError('rate_limited', mensaje ?? 'Demasiados pedidos. Esperá unos minutos.')
  }
  if (texto.includes('teléfono')) {
    return agentError('invalid_request', mensaje ?? 'El teléfono no es válido.', {
      fields: ['customer.phone'],
    })
  }
  // Se agoto entre la validacion y la creacion: la ventana de carrera conocida.
  if (texto.includes('agotó') || texto.includes('solo quedan') || texto.includes('disponible')) {
    return agentError('item_unavailable', mensaje ?? 'Un producto dejó de estar disponible.')
  }

  devError('[agent/orders] rechazo no reconocido de createOrder:', mensaje)
  return agentInternalError()
}

function respuestaPedido(p: PedidoGuardado) {
  return {
    id: p.id,
    order_number: p.order_number,
    status: p.status,
    subtotal: p.total - (p.shipping_cost ?? 0),
    shipping_cost: p.shipping_cost,
    total: p.total,
    delivery_zone: p.delivery_zone_id ? { id: p.delivery_zone_id } : null,
  }
}
