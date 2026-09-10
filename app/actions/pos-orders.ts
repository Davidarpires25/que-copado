'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import { revalidateCaja, revalidateOrders, revalidateStock } from '@/lib/server/revalidate'
import { deductStockForOrder, restoreStockForOrder } from '@/lib/server/stock-deduction'
import { getSalesField } from '@/lib/server/cash-register-utils'
import type { Order, PaymentMethod } from '@/lib/types/database'
import type { CreatePosOrderData, CreateMostadorOrderData, PaymentSplit } from '@/lib/types/cash-register'
import { sendToKitchen } from './comandas'

/**
 * Crear una orden POS (venta en local)
 */
export async function createPosOrder(
  data: CreatePosOrderData
): Promise<{ data: Order | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    // Verify session is open
    const { data: session } = await supabase
      .from('cash_register_sessions')
      .select('id, status')
      .eq('id', data.session_id)
      .eq('status', 'open')
      .single()

    if (!session) {
      return { data: null, error: 'La caja no esta abierta' }
    }

    // Insert POS order — status 'pagado' (immediate payment)
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        items: data.items as unknown as Record<string, unknown>[],
        total: data.total,
        payment_method: data.payment_method,
        order_source: 'pos',
        order_type: data.order_type,
        table_number: data.table_number || null,
        notes: data.notes || null,
        cash_register_session_id: data.session_id,
        status: 'pagado',
        shipping_cost: 0,
        customer_phone: null,
        customer_name: null,
        customer_address: null,
      })
      .select()
      .single()

    if (error) {
      devError('Error creating POS order:', error)
      return { data: null, error: 'Error al registrar venta' }
    }

    // Update session totals
    const salesField = getSalesField(data.payment_method)

    const { data: currentSession, error: sessionFetchError } = await supabase
      .from('cash_register_sessions')
      .select('total_sales, total_orders, total_cash_sales, total_card_sales, total_transfer_sales')
      .eq('id', data.session_id)
      .single()

    if (sessionFetchError || !currentSession) {
      devError(`CRITICAL: session ${data.session_id} not found — totals NOT updated for POS order ${order.id} (${data.total}):`, sessionFetchError)
    } else {
      const s = currentSession as Record<string, number>
      const { error: updateErr } = await supabase
        .from('cash_register_sessions')
        .update({
          total_sales: (s.total_sales || 0) + data.total,
          total_orders: (s.total_orders || 0) + 1,
          [salesField]: (s[salesField] || 0) + data.total,
        })
        .eq('id', data.session_id)
      if (updateErr) devError(`CRITICAL: session totals update failed for POS order ${order.id}:`, updateErr)
    }

    // Best-effort stock deduction — errors do NOT block the sale
    try {
      await deductStockForOrder(supabase, data.items, order.id, user.id)
    } catch (stockError) {
      devError('Error deducting stock for POS order:', stockError)
    }

    revalidateCaja()
    revalidateOrders()
    revalidateStock()

    return { data: order as Order, error: null }
  } catch (error) {
    devError('Error in createPosOrder:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Cancelar una orden POS y revertir totales
 */
export async function cancelPosOrder(
  orderId: string
): Promise<{ data: Order | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    // Get the order first
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('order_source', 'pos')
      .single()

    if (fetchError || !existingOrder) {
      return { data: null, error: 'Orden no encontrada' }
    }

    const orderData = existingOrder as Order

    if (orderData.status === 'cancelado') {
      return { data: null, error: 'La orden ya esta cancelada' }
    }

    // Cancel the order
    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: 'cancelado' })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      devError('Error cancelling POS order:', error)
      return { data: null, error: 'Error al cancelar venta' }
    }

    // Revert session totals if session exists
    if (orderData.cash_register_session_id) {
      const salesField = getSalesField(orderData.payment_method)

      const { data: currentSession, error: sessionFetchError } = await supabase
        .from('cash_register_sessions')
        .select('total_sales, total_orders, total_cash_sales, total_card_sales, total_transfer_sales')
        .eq('id', orderData.cash_register_session_id)
        .single()

      if (sessionFetchError || !currentSession) {
        devError(`CRITICAL: session ${orderData.cash_register_session_id} not found — totals NOT reverted for cancelled order ${orderId}:`, sessionFetchError)
      } else {
        const s = currentSession as Record<string, number>
        const { error: updateErr } = await supabase
          .from('cash_register_sessions')
          .update({
            total_sales: Math.max(0, (s.total_sales || 0) - orderData.total),
            total_orders: Math.max(0, (s.total_orders || 0) - 1),
            [salesField]: Math.max(0, (s[salesField] || 0) - orderData.total),
          })
          .eq('id', orderData.cash_register_session_id)
        if (updateErr) devError(`CRITICAL: session totals revert failed for cancelled order ${orderId}:`, updateErr)
      }
    }

    // Best-effort stock restoration — errors do NOT block the cancellation
    try {
      await restoreStockForOrder(supabase, orderId, user.id)
    } catch (stockError) {
      devError('Error restoring stock for cancelled POS order:', stockError)
    }

    revalidateCaja()
    revalidateOrders()
    revalidateStock()

    return { data: order as Order, error: null }
  } catch (error) {
    devError('Error in cancelPosOrder:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Crea orden mostrador con status 'abierto' y envía a cocina.
 * NO actualiza session totals (se hace al cobrar).
 */
export async function createMostadorOrder(
  data: CreateMostadorOrderData
): Promise<{ data: Order | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const { data: session } = await supabase
      .from('cash_register_sessions')
      .select('id, status')
      .eq('id', data.session_id)
      .eq('status', 'open')
      .single()

    if (!session) {
      return { data: null, error: 'La caja no esta abierta' }
    }

    const now = new Date().toISOString()

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        items: data.items as unknown as Record<string, unknown>[],
        total: data.total,
        payment_method: 'cash', // default, se establece al cobrar
        order_source: 'pos',
        order_type: 'mostrador',
        table_number: null,
        notes: data.notes || null,
        cash_register_session_id: data.session_id,
        status: 'abierto',
        shipping_cost: data.shipping_cost ?? 0,
        delivery_zone_id: data.delivery_zone_id ?? null,
        customer_phone: null,
        customer_name: null,
        customer_address: null,
        opened_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error || !order) {
      devError('Error creating mostrador order:', error)
      return { data: null, error: 'Error al crear el pedido' }
    }

    // Insert order_items for kitchen tracking
    const orderItemsToInsert = data.items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      product_price: item.price,
      quantity: item.quantity,
      notes: item.notes || null,
      status: 'pendiente',
      added_by: user.id,
      metadata: item.metadata ?? null,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert)
    if (itemsError) {
      devError('Error inserting order_items for mostrador order:', itemsError)
      // Rollback: delete the orphaned order
      await supabase.from('orders').delete().eq('id', order.id)
      return { data: null, error: 'Error al registrar los productos del pedido' }
    }

    // Send to kitchen (fire and forget - errors don't block the order)
    try {
      await sendToKitchen(order.id)
    } catch (kitchenError) {
      devError('Error sending order to kitchen:', kitchenError)
    }

    revalidateCaja()
    revalidateOrders()

    return { data: order as Order, error: null }
  } catch (error) {
    devError('Error in createMostadorOrder:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Completa el pago de una orden mostrador pendiente (abierto -> pagado).
 * Soporta pago único (paymentMethod) o pago híbrido (splits).
 * Cuando se pasan splits, se registran en payment_splits y los totales de sesión
 * se acumulan por método individualmente.
 */
export async function completeMostadorPayment(
  orderId: string,
  paymentMethod: PaymentMethod,
  sessionId: string,
  splits?: PaymentSplit[]
): Promise<{ data: Order | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    // Todo el cobro en una sola transaccion, igual que el de mesa. Eran ocho
    // viajes a la base —~1,1 segundos con los ~160ms fijos de cada uno— y las
    // fallas a mitad de camino dejaban el pedido pagado con los totales del
    // turno sin sumar.
    //
    // La funcion contempla los dos origenes: el de mostrador recalcula su total
    // desde order_items mas el envio, y el de la web conserva el total que fijo
    // el checkout —sus productos viven en la columna JSON, recalcular lo
    // pondria en cero— y ademas entra al turno de quien lo cobra.
    const { data, error } = await supabase.rpc('cobrar_pedido_de_mostrador', {
      p_order_id: orderId,
      p_session_id: sessionId,
      p_payment_method: paymentMethod,
      p_splits: splits ?? null,
    })

    if (error) {
      devError('Error completing mostrador payment:', error)
      // P0001 es un RAISE nuestro: el texto esta escrito para quien cobra.
      return {
        data: null,
        error: error.code === 'P0001' ? error.message : 'Error al procesar pago',
      }
    }

    const resultado = data as {
      order: Order
      items: { product_id: string; quantity: number }[]
    }

    // Fuera de la transaccion a proposito: el stock es best-effort y no tiene
    // por que poder tumbar un cobro ya confirmado.
    if (resultado.items?.length) {
      deductStockForOrder(supabase, resultado.items, orderId, user.id).catch((stockError) => {
        devError('Error deducting stock for payment (async):', stockError)
      })
    }

    revalidateCaja()
    revalidateOrders()
    revalidateStock()

    return { data: resultado.order, error: null }
  } catch (error) {
    devError('Error in completeMostadorPayment:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Pedidos que esperan cobro, de los dos origenes.
 *
 * Antes esto miraba solo el mostrador, filtrando por `order_type = 'mostrador'`
 * y por sesion de caja. Los pedidos que entran por la web no tienen ninguna de
 * las dos cosas —el CHECK de `order_type` solo admite mostrador o mesa, y la
 * sesion se les asigna recien al cobrarlos—, asi que la caja no los veia nunca.
 * Quedaban en 'recibido' para siempre: nadie los atendia, nadie los cobraba, y
 * aun asi contaban como ingreso en analytics.
 *
 * El de mostrador se acota a la sesion actual porque nace dentro de ella. El de
 * la web no: entro cuando entro, y sigue esperando aunque hayan cerrado la caja
 * en el medio. Por eso se listan todos los 'recibido', del mas viejo al mas
 * nuevo, que es el orden en que hay que atenderlos.
 */
export async function getPendingOrders(
  sessionId: string
): Promise<{ data: Order[] | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const [mostrador, web] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('cash_register_session_id', sessionId)
        .eq('order_type', 'mostrador')
        .eq('status', 'abierto'),
      supabase
        .from('orders')
        .select('*')
        .eq('order_source', 'web')
        .eq('status', 'recibido'),
    ])

    if (mostrador.error || web.error) {
      devError('Error fetching pending orders:', mostrador.error ?? web.error)
      return { data: null, error: 'Error al obtener pedidos pendientes' }
    }

    const todos = [...(mostrador.data ?? []), ...(web.data ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    return { data: todos as Order[], error: null }
  } catch (error) {
    devError('Error in getPendingOrders:', error)
    return { data: null, error: 'Error inesperado' }
  }
}


/**
 * Cancela una orden mostrador pendiente (abierto -> cancelado).
 * Restaura el stock descontado.
 */
export async function cancelMostadorOrder(
  orderId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { error: 'No autenticado' }

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('order_type', 'mostrador')
      .eq('status', 'abierto')
      .single()

    if (!order) return { error: 'Orden no encontrada o ya procesada' }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) {
      devError('Error cancelling mostrador order:', error)
      return { error: 'Error al cancelar el pedido' }
    }

    // Restore stock
    await restoreStockForOrder(supabase, orderId, user.id)

    revalidateCaja()
    revalidateOrders()
    revalidateStock()

    return { error: null }
  } catch (err) {
    devError('Error in cancelMostadorOrder:', err)
    return { error: 'Error inesperado' }
  }
}
