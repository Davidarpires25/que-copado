'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import { revalidateCaja, revalidateOrders, revalidateStock } from '@/lib/server/revalidate'
import { deductStockForOrder, restoreStockForOrder } from '@/lib/server/stock-deduction'
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

    const { data: currentSession } = await supabase
      .from('cash_register_sessions')
      .select('total_sales, total_orders, total_cash_sales, total_card_sales, total_transfer_sales')
      .eq('id', data.session_id)
      .single()

    if (currentSession) {
      const s = currentSession as Record<string, number>
      await supabase
        .from('cash_register_sessions')
        .update({
          total_sales: (s.total_sales || 0) + data.total,
          total_orders: (s.total_orders || 0) + 1,
          [salesField]: (s[salesField] || 0) + data.total,
        })
        .eq('id', data.session_id)
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

      const { data: currentSession } = await supabase
        .from('cash_register_sessions')
        .select('total_sales, total_orders, total_cash_sales, total_card_sales, total_transfer_sales')
        .eq('id', orderData.cash_register_session_id)
        .single()

      if (currentSession) {
        const s = currentSession as Record<string, number>
        await supabase
          .from('cash_register_sessions')
          .update({
            total_sales: Math.max(0, (s.total_sales || 0) - orderData.total),
            total_orders: Math.max(0, (s.total_orders || 0) - 1),
            [salesField]: Math.max(0, (s[salesField] || 0) - orderData.total),
          })
          .eq('id', orderData.cash_register_session_id)
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
        shipping_cost: 0,
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
    }))

    await supabase.from('order_items').insert(orderItemsToInsert)

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

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('order_type', 'mostrador')
      .single()

    if (!existingOrder || existingOrder.status !== 'abierto') {
      return { data: null, error: 'Orden no encontrada o ya procesada' }
    }

    const orderData = existingOrder as Order
    const isHybrid = splits && splits.length > 1

    // Determine primary payment_method for the order record
    // (for hybrid: use the method with the highest amount)
    const primaryMethod = isHybrid
      ? splits.reduce((a, b) => (a.amount >= b.amount ? a : b)).method
      : paymentMethod

    const { data: paidOrder, error: payError } = await supabase
      .from('orders')
      .update({
        status: 'pagado',
        payment_method: primaryMethod,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()

    if (payError) {
      devError('Error completing mostrador payment:', payError)
      return { data: null, error: 'Error al procesar pago' }
    }

    // Insert payment_splits when hybrid
    if (isHybrid) {
      const splitsToInsert = splits.map((s) => ({
        order_id: orderId,
        sale_tag: null,
        amount: s.amount,
        method: s.method,
        session_id: sessionId,
      }))
      const { error: splitsError } = await supabase
        .from('payment_splits')
        .insert(splitsToInsert)
      if (splitsError) {
        devError('Error inserting payment_splits:', splitsError)
        // Non-fatal: the order is already marked pagado
      }
    }

    // Update session totals
    const { data: currentSession } = await supabase
      .from('cash_register_sessions')
      .select('total_sales, total_orders, total_cash_sales, total_card_sales, total_transfer_sales')
      .eq('id', sessionId)
      .single()

    if (currentSession) {
      const s = currentSession as Record<string, number>
      const sessionUpdate: Record<string, number> = {
        total_sales: (s.total_sales || 0) + orderData.total,
        total_orders: (s.total_orders || 0) + 1,
      }

      if (isHybrid) {
        // Accumulate per-method from splits
        for (const split of splits) {
          const field = getSalesField(split.method)
          sessionUpdate[field] = (sessionUpdate[field] ?? (s[field] || 0)) + split.amount
        }
      } else {
        const salesField = getSalesField(paymentMethod)
        sessionUpdate[salesField] = (s[salesField] || 0) + orderData.total
      }

      await supabase
        .from('cash_register_sessions')
        .update(sessionUpdate)
        .eq('id', sessionId)
    }

    // Best-effort stock deduction
    try {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId)
        .eq('status', 'pendiente')

      if (orderItems && orderItems.length > 0) {
        await deductStockForOrder(supabase, orderItems, orderId, user.id)
      }
    } catch (stockError) {
      devError('Error deducting stock for mostrador payment:', stockError)
    }

    revalidateCaja()
    revalidateOrders()
    revalidateStock()

    return { data: paidOrder as Order, error: null }
  } catch (error) {
    devError('Error in completeMostadorPayment:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtiene pedidos mostrador pendientes (status='abierto') de una sesion
 */
export async function getPendingMostadorOrders(
  sessionId: string
): Promise<{ data: Order[] | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('cash_register_session_id', sessionId)
      .eq('order_type', 'mostrador')
      .eq('status', 'abierto')
      .order('created_at', { ascending: true })

    if (error) {
      devError('Error fetching pending mostrador orders:', error)
      return { data: null, error: 'Error al obtener pedidos pendientes' }
    }

    return { data: data as Order[], error: null }
  } catch (error) {
    devError('Error in getPendingMostadorOrders:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

function getSalesField(paymentMethod: string): string {
  switch (paymentMethod) {
    case 'cash':
      return 'total_cash_sales'
    case 'card':
      return 'total_card_sales'
    case 'transfer':
    case 'mercadopago':
      return 'total_transfer_sales'
    default:
      return 'total_cash_sales'
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
