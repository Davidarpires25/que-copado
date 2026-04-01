'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import { sendsToKitchen } from '@/lib/types/database'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
}

function now() {
  const d = new Date()
  return {
    dateStr: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    timeStr: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  }
}

export async function printClientTicketAction(
  orderId: string,
  options: { cashReceived?: number; guestTag?: string } = {}
): Promise<{ error?: string }> {
  try {
    const supabase = await createAdminClient()

    const user = await getAuthUser(supabase)
    if (!user) return { error: 'No autorizado' }

    const [{ data: order, error }, { data: rows }] = await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      supabase
        .from('order_items')
        .select('product_name, quantity, product_price, notes, sale_tag')
        .eq('order_id', orderId)
        .neq('status', 'cancelado'),
    ])

    if (error || !order) return { error: 'Orden no encontrada' }

    let items = rows ?? []
    if (options.guestTag) {
      items = items.filter((i) => i.sale_tag === options.guestTag)
    }

    const mapped = items.map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
      price: i.product_price,
      notes: i.notes ?? null,
    }))

    const subtotal = mapped.reduce((s, i) => s + i.price * i.quantity, 0)
    const total = options.guestTag ? subtotal : order.total
    const { dateStr, timeStr } = now()

    const { error: insertError } = await supabase.from('print_jobs').insert({
      type: 'client_ticket',
      data: {
        orderId,
        orderLabel:
          order.order_type === 'mesa' && order.table_number
            ? `Mesa ${order.table_number}`
            : 'Mostrador',
        dateStr,
        timeStr,
        items: mapped,
        total,
        subtotal,
        shippingCost: order.shipping_cost ?? 0,
        paymentLabel: PAYMENT_LABELS[order.payment_method] ?? order.payment_method,
        cashReceived: options.cashReceived ?? null,
        change: options.cashReceived ? options.cashReceived - total : null,
        guestName: options.guestTag ?? null,
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

    // Determine which items to print and whether this is a new batch or a reprint
    let targetIds: string[]
    let newBatchId: string | null = null

    if (options.itemIds && options.itemIds.length > 0) {
      // Called from add-items-view with explicit new item IDs
      targetIds = options.itemIds
      newBatchId = crypto.randomUUID()
    } else {
      // Check for unprinted items (new round)
      const { data: unprintedRows } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', orderId)
        .is('kitchen_print_batch_id', null)
        .neq('status', 'cancelado')

      if (unprintedRows && unprintedRows.length > 0) {
        // New round: print only unprinted items
        targetIds = unprintedRows.map((r) => r.id)
        newBatchId = crypto.randomUUID()
      } else {
        // Resguardo: reprint last batch (printer failure recovery)
        const { data: lastItem } = await supabase
          .from('order_items')
          .select('kitchen_print_batch_id')
          .eq('order_id', orderId)
          .not('kitchen_print_batch_id', 'is', null)
          .order('added_at', { ascending: false })
          .limit(1)
          .single()

        if (!lastItem?.kitchen_print_batch_id) {
          return { error: 'No hay comandas previas para reimprimir.' }
        }

        const { data: batchRows } = await supabase
          .from('order_items')
          .select('id')
          .eq('order_id', orderId)
          .eq('kitchen_print_batch_id', lastItem.kitchen_print_batch_id)
          .neq('status', 'cancelado')

        targetIds = (batchRows ?? []).map((r) => r.id)
        // newBatchId stays null — don't re-stamp on reprint
      }
    }

    if (targetIds.length === 0) {
      return { error: 'No hay ítems para enviar a cocina.' }
    }

    const { data: rows } = await supabase
      .from('order_items')
      .select('product_name, quantity, notes, products(product_type)')
      .in('id', targetIds)
      .neq('status', 'cancelado')

    const items = (rows ?? [])
      .filter((i) => {
        const p = i.products as unknown as { product_type: string | null } | null
        return sendsToKitchen(p?.product_type ?? '')
      })
      .map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        notes: i.notes ?? null,
      }))

    if (items.length === 0) {
      return { error: 'No hay ítems de cocina para imprimir.' }
    }

    const { dateStr, timeStr } = now()

    const { error: insertError } = await supabase.from('print_jobs').insert({
      type: 'kitchen_ticket',
      data: {
        orderId,
        orderLabel:
          order.order_type === 'mesa' && order.table_number
            ? `Mesa ${order.table_number}`
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
