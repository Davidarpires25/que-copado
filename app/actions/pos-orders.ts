'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import { revalidateCaja, revalidateOrders } from '@/lib/server/revalidate'
import type { Order } from '@/lib/types/database'
import type { CreatePosOrderData } from '@/lib/types/cash-register'

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

    revalidateCaja()
    revalidateOrders()

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

    revalidateCaja()
    revalidateOrders()

    return { data: order as Order, error: null }
  } catch (error) {
    devError('Error in cancelPosOrder:', error)
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
