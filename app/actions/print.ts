'use server'

import { createAdminClient } from '@/lib/supabase/admin'

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

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) return { error: 'Orden no encontrada' }

    const { data: rows } = await supabase
      .from('order_items')
      .select('product_name, quantity, product_price, notes, sale_tag')
      .eq('order_id', orderId)
      .neq('status', 'cancelado')

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
      console.error('printClientTicketAction insert:', insertError)
      return { error: 'Error al encolar el ticket de impresión.' }
    }

    return {}
  } catch (err) {
    console.error('printClientTicketAction:', err)
    return { error: 'Error al imprimir. Verificá que la impresora esté encendida y configurada.' }
  }
}

export async function printKitchenTicketAction(orderId: string): Promise<{ error?: string }> {
  try {
    const supabase = await createAdminClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) return { error: 'Orden no encontrada' }

    const { data: rows } = await supabase
      .from('order_items')
      .select('product_name, quantity, notes, products(product_type)')
      .eq('order_id', orderId)
      .neq('status', 'cancelado')

    const items = (rows ?? [])
      .filter((i) => {
        const p = i.products as unknown as { product_type: string | null } | null
        return p?.product_type === 'elaborado'
      })
      .map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        notes: i.notes ?? null,
      }))

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
      console.error('printKitchenTicketAction insert:', insertError)
      return { error: 'Error al encolar el ticket de cocina.' }
    }

    return {}
  } catch (err) {
    console.error('printKitchenTicketAction:', err)
    return { error: 'Error al imprimir cocina.' }
  }
}
