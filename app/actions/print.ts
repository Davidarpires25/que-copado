'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { SIN_ASIGNAR, etiquetaComensal } from '@/lib/constants/sale-tags'
import { devError } from '@/lib/server/logger'
import { sendsToKitchen, esPedidoRemoto } from '@/lib/types/database'
import { etiquetaDeMesa } from '@/lib/utils/table-label'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
}

/**
 * Fecha y hora del pedido, en hora Argentina.
 *
 * Antes esto era `new Date()` sin zona: como el server action corre en la nube
 * —que va en UTC— un ticket emitido a las 21:07 de Argentina salia impreso como
 * "11/09, 12:07 a. m.", con la fecha del dia siguiente. En el horario pico de
 * una hamburgueseria eso era casi todos los tickets.
 *
 * Importa mas de lo que parece porque el numero de pedido se reinicia cada dia
 * (ver 021_numero_de_pedido_por_dia): un ticket que dice "#15" con la fecha
 * corrida apunta a un pedido que al dia siguiente existe de verdad y es otro.
 *
 * Y se toma del pedido, no del reloj: reimprimir el ticket de ayer le estampaba
 * la fecha de hoy, con lo que la copia no se distinguia de un pedido nuevo.
 */
const AR_TZ = 'America/Argentina/Buenos_Aires'

function fechaDelPedido(createdAt: string | null | undefined) {
  const d = createdAt ? new Date(createdAt) : new Date()
  return {
    dateStr: d.toLocaleDateString('es-AR', {
      timeZone: AR_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    timeStr: d.toLocaleTimeString('es-AR', {
      timeZone: AR_TZ,
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

/**
 * Como se llama la mesa de un pedido, para la comanda y el ticket.
 *
 * El pedido guarda `table_number`, un numero suelto: el nombre vive en
 * `restaurant_tables`. Sin esta lectura, la comanda dice "Mesa 4" para una mesa
 * que el salon llama "Vereda 1", y el plato sale a buscar un lugar que no
 * existe.
 *
 * No se guarda el nombre en la orden a proposito: si la mesa se renombra, una
 * comanda abierta tiene que decir como se llama hoy, no como se llamaba cuando
 * se abrio la cuenta.
 *
 * Es una consulta por numero sobre una tabla de pocas filas, y la impresion no
 * esta en el camino critico del cobro.
 */
async function _etiquetaDeMesaDelPedido(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  tableNumber: number | null | undefined
): Promise<string> {
  if (tableNumber == null) return 'Mostrador'

  const { data } = await supabase
    .from('restaurant_tables')
    .select('number, label')
    .eq('number', tableNumber)
    .maybeSingle()

  return etiquetaDeMesa({ number: tableNumber, label: data?.label ?? null })
}

export async function printClientTicketAction(
  orderId: string,
  options: { cashReceived?: number; guestTag?: string; itemIds?: string[] } = {}
): Promise<{ error?: string }> {
  try {
    const supabase = await createAdminClient()

    const user = await getAuthUser(supabase)
    if (!user) return { error: 'No autorizado' }

    const [{ data: order, error }, { data: rows }] = await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      supabase
        .from('order_items')
        .select('id, product_name, quantity, product_price, notes, sale_tag')
        .eq('order_id', orderId)
        .neq('status', 'cancelado'),
    ])

    if (error || !order) return { error: 'Orden no encontrada' }

    let items = rows ?? []
    if (options.itemIds && options.itemIds.length > 0) {
      const idSet = new Set(options.itemIds)
      items = items.filter((i) => idSet.has(i.id))
    }
    if (options.guestTag === SIN_ASIGNAR) {
      // Los items compartidos, o los cargados antes de que existiera el primer
      // comensal. Filtrar por la clave literal no encontraria ninguno.
      items = items.filter((i) => !i.sale_tag)
    } else if (options.guestTag) {
      items = items.filter((i) => i.sale_tag === options.guestTag)
    }

    if (items.length === 0) {
      return { error: 'No hay ítems para imprimir en el ticket.' }
    }

    const mapped = items.map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
      price: i.product_price,
      notes: i.notes ?? null,
    }))

    const subtotal = mapped.reduce((s, i) => s + i.price * i.quantity, 0)
    const isRoundSnapshot = Boolean(options.itemIds && options.itemIds.length > 0)
    const isGuestScope = Boolean(options.guestTag)
    const total = isRoundSnapshot || isGuestScope ? subtotal : order.total
    const { dateStr, timeStr } = fechaDelPedido(order.created_at)

    // El medio de pago solo se imprime si el pedido se cobro.
    //
    // El pedido nace con `payment_method: 'cash'` --esta escrito asi a
    // proposito, con el comentario "default, will be set on payment"-- y este
    // ticket lo mandaba sin preguntar. El papel que se le lleva a la mesa para
    // que elija como pagar ya decia "Efectivo".
    //
    // `Parcial` se mantiene: una ronda de una mesa es un corte a proposito, y
    // esa palabra dice justo eso.
    const yaSeCobro = order.status === 'pagado'
    const paymentLabel = isRoundSnapshot
      ? 'Parcial'
      : yaSeCobro
        ? (PAYMENT_LABELS[order.payment_method] ?? order.payment_method)
        : null
    const cashReceived = isRoundSnapshot ? null : options.cashReceived ?? null
    const change =
      isRoundSnapshot || options.cashReceived === undefined || options.cashReceived === null
        ? null
        : options.cashReceived - total

    const { error: insertError } = await supabase.from('print_jobs').insert({
      type: 'client_ticket',
      data: {
        orderId,
        orderNumber: order.order_number ?? null,
        orderLabel:
          order.order_type === 'mesa' && order.table_number
            ? await _etiquetaDeMesaDelPedido(supabase, order.table_number)
            : 'Mostrador',
        dateStr,
        timeStr,
        items: mapped,
        total,
        subtotal,
        shippingCost: isRoundSnapshot ? 0 : order.shipping_cost ?? 0,
        paymentLabel,
        cashReceived,
        change,
        guestName: options.guestTag ? etiquetaComensal(options.guestTag) : null,
      },
    })

    if (insertError) {
      devError('printClientTicketAction insert:', insertError)
      return { error: 'Error al encolar el ticket de impresión.' }
    }

    return {}
  } catch (err) {
    devError('printClientTicketAction:', err)
    return { error: 'Error al imprimir. Verificá que la impresora esté encendida y configurada.' }
  }
}

export async function printKitchenTicketAction(
  orderId: string,
  options: { itemIds?: string[] } = {}
): Promise<{ error?: string }> {
  try {
    const supabase = await createAdminClient()

    const user = await getAuthUser(supabase)
    if (!user) return { error: 'No autorizado' }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) return { error: 'Orden no encontrada' }

    const esRemoto = esPedidoRemoto(order.order_source)

    // Determine which items to print and whether this is a new batch or a reprint
    let targetIds: string[] = []
    let newBatchId: string | null = null

    if (esRemoto) {
      // El pedido web no tiene filas en `order_items`: sus productos viven en la
      // columna JSON de la orden. Toda la maquinaria de lotes de impresion
      // —imprimir solo lo que todavia no salio, reimprimir el ultimo lote— se
      // apoya en esas filas, asi que no aplica. El pedido web llega entero y de
      // una sola vez, y volver a apretar el boton reimprime el mismo ticket.
      //
      // Sin esta rama, la funcion caia a la reimpresion, no encontraba lotes
      // previos y devolvia "No hay comandas previas para reimprimir".
      targetIds = []
    } else if (options.itemIds && options.itemIds.length > 0) {
      // Called from add-items-view with explicit new item IDs
      targetIds = options.itemIds
      newBatchId = crypto.randomUUID()
    } else {
      // Check for unprinted items (new round)
      const { data: unprintedRows } = await supabase
        .from('order_items')
        .select('id, products(product_type)')
        .eq('order_id', orderId)
        .is('kitchen_print_batch_id', null)
        .neq('status', 'cancelado')

      const unprintedKitchenRows = (unprintedRows ?? []).filter((row) => {
        const p = row.products as unknown as { product_type: string | null } | null
        return sendsToKitchen(p?.product_type ?? '')
      })

      if (unprintedKitchenRows.length > 0) {
        // New round: print only unprinted items
        targetIds = unprintedKitchenRows.map((r) => r.id)
        newBatchId = crypto.randomUUID()
      } else {
        // Resguardo: reprint last batch (printer failure recovery)
        const { data: printedRows } = await supabase
          .from('order_items')
          .select('id, kitchen_print_batch_id, products(product_type)')
          .eq('order_id', orderId)
          .not('kitchen_print_batch_id', 'is', null)
          .neq('status', 'cancelado')
          .order('added_at', { ascending: false })

        const lastKitchenRow = (printedRows ?? []).find((row) => {
          const p = row.products as unknown as { product_type: string | null } | null
          return sendsToKitchen(p?.product_type ?? '')
        })

        if (!lastKitchenRow?.kitchen_print_batch_id) {
          return { error: 'No hay comandas previas para reimprimir.' }
        }

        const { data: batchRows } = await supabase
          .from('order_items')
          .select('id, products(product_type)')
          .eq('order_id', orderId)
          .eq('kitchen_print_batch_id', lastKitchenRow.kitchen_print_batch_id)
          .neq('status', 'cancelado')

        targetIds = (batchRows ?? [])
          .filter((row) => {
            const p = row.products as unknown as { product_type: string | null } | null
            return sendsToKitchen(p?.product_type ?? '')
          })
          .map((r) => r.id)
        // newBatchId stays null — don't re-stamp on reprint
      }
    }

    let items: { name: string; quantity: number; notes: string | null }[]

    if (esRemoto) {
      const jsonItems =
        (order.items as unknown as
          { id?: string; name?: string; quantity?: number; notes?: string | null }[] | null) ?? []

      // El JSON no guarda el tipo de producto, asi que hay que preguntarle a
      // `products` cual de estos va a cocina y cual no: una bebida no lleva
      // comanda.
      const ids = jsonItems.map((i) => i.id).filter((id): id is string => !!id)
      const { data: prods } = ids.length
        ? await supabase.from('products').select('id, product_type').in('id', ids)
        : { data: [] as { id: string; product_type: string | null }[] }

      const tipoPorId = new Map((prods ?? []).map((pr) => [pr.id, pr.product_type]))

      items = jsonItems
        .filter((i) => sendsToKitchen(tipoPorId.get(i.id ?? '') ?? ''))
        .map((i) => ({
          name: i.name ?? 'Producto',
          quantity: i.quantity ?? 1,
          notes: i.notes ?? null,
        }))
    } else {
      if (targetIds.length === 0) {
        return { error: 'No hay ítems para enviar a cocina.' }
      }

      const { data: rows } = await supabase
        .from('order_items')
        .select('product_name, quantity, notes, products(product_type)')
        .in('id', targetIds)
        .neq('status', 'cancelado')

      items = (rows ?? [])
        .filter((i) => {
          const p = i.products as unknown as { product_type: string | null } | null
          return sendsToKitchen(p?.product_type ?? '')
        })
        .map((i) => ({
          name: i.product_name,
          quantity: i.quantity,
          notes: i.notes ?? null,
        }))
    }

    if (items.length === 0) {
      return { error: 'No hay ítems de cocina para imprimir.' }
    }

    const { dateStr, timeStr } = fechaDelPedido(order.created_at)

    const { error: insertError } = await supabase.from('print_jobs').insert({
      type: 'kitchen_ticket',
      data: {
        orderId,
        orderNumber: order.order_number ?? null,
        orderLabel:
          order.order_type === 'mesa' && order.table_number
            ? await _etiquetaDeMesaDelPedido(supabase, order.table_number)
            : esRemoto
              // Que la cocina sepa que sale a la calle, por donde entro y para
              // quien: un pedido de WhatsApp que dijera "Web" manda a buscarlo
              // al lugar equivocado si despues hay que confirmar algo.
              ? `${order.order_source === 'whatsapp' ? 'WhatsApp' : 'Web'}${order.customer_name ? ` · ${order.customer_name}` : ''}`
              : 'Mostrador',
        dateStr,
        timeStr,
        items,
      },
    })

    if (insertError) {
      devError('printKitchenTicketAction insert:', insertError)
      return { error: 'Error al encolar el ticket de cocina.' }
    }

    // Mark items as belonging to this batch (only for new rounds, not reprints)
    if (newBatchId) {
      await supabase
        .from('order_items')
        .update({ kitchen_print_batch_id: newBatchId })
        .in('id', targetIds)
    }

    return {}
  } catch (err) {
    devError('printKitchenTicketAction:', err)
    return { error: 'Error al imprimir cocina.' }
  }
}
