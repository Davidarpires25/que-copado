'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import { friendlyError } from '@/lib/server/error-messages'
import { revalidateCaja, revalidateOrders, revalidateTables } from '@/lib/server/revalidate'
import type { Order, PaymentMethod } from '@/lib/types/database'
import type { TableWithOrder, RestaurantTable, OrderItemRow } from '@/lib/types/tables'

// ─── Helpers ────────────────────────────────────────────────

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
 * Recalcula el total de la orden desde order_items y sincroniza el JSON items
 */
async function recalculateOrderTotal(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  orderId: string
) {
  // Fetch all non-cancelled items
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .eq('status', 'pendiente')
    .order('added_at')

  if (!items) return

  const total = items.reduce(
    (sum: number, item: OrderItemRow) => sum + item.product_price * item.quantity,
    0
  )

  // Serialize to JSON format for backward compatibility
  const itemsJson = items.map((item: OrderItemRow) => ({
    id: item.product_id || item.id,
    name: item.product_name,
    price: item.product_price,
    quantity: item.quantity,
  }))

  await supabase
    .from('orders')
    .update({
      total,
      items: itemsJson,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
}

// ─── Table Queries ──────────────────────────────────────────

/**
 * Obtener todas las mesas activas con su orden actual
 */
export async function getTables(): Promise<{
  data: TableWithOrder[] | null
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select(`
        *,
        orders:current_order_id (
          *,
          order_items (*)
        )
      `)
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      devError('Error fetching tables:', error)
      return { data: null, error: 'Error al obtener mesas' }
    }

    return { data: data as TableWithOrder[], error: null }
  } catch (error) {
    devError('Error in getTables:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener una mesa con su orden y items
 */
export async function getTableWithOrder(tableId: string): Promise<{
  data: TableWithOrder | null
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select(`
        *,
        orders:current_order_id (
          *,
          order_items (*)
        )
      `)
      .eq('id', tableId)
      .single()

    if (error) {
      devError('Error fetching table:', error)
      return { data: null, error: 'Mesa no encontrada' }
    }

    return { data: data as TableWithOrder, error: null }
  } catch (error) {
    devError('Error in getTableWithOrder:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

// ─── Open Order Flow ────────────────────────────────────────

/**
 * Abrir una mesa: crea orden 'abierto' y marca mesa 'ocupada'
 */
export async function openTable(
  tableId: string,
  sessionId: string
): Promise<{
  data: { table: RestaurantTable; order: Order } | null
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    // Verify table is libre
    const { data: table, error: tableError } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('id', tableId)
      .eq('status', 'libre')
      .single()

    if (tableError || !table) {
      return { data: null, error: 'La mesa no esta disponible' }
    }

    // Verify session is open
    const { data: session } = await supabase
      .from('cash_register_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .eq('status', 'open')
      .single()

    if (!session) {
      return { data: null, error: 'La caja no esta abierta' }
    }

    const now = new Date().toISOString()

    // Create open order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        total: 0,
        items: [],
        payment_method: 'cash', // default, will be set on payment
        status: 'abierto',
        order_source: 'pos',
        order_type: 'mesa',
        table_number: (table as RestaurantTable).number,
        cash_register_session_id: sessionId,
        customer_phone: null,
        customer_name: null,
        customer_address: null,
        shipping_cost: 0,
        opened_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (orderError || !order) {
      devError('Error creating open order:', orderError)
      return { data: null, error: 'Error al crear la orden' }
    }

    // Update table status
    const { data: updatedTable, error: updateError } = await supabase
      .from('restaurant_tables')
      .update({
        status: 'ocupada',
        current_order_id: order.id,
      })
      .eq('id', tableId)
      .select()
      .single()

    if (updateError) {
      devError('Error updating table:', updateError)
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', order.id)
      return { data: null, error: 'Error al actualizar mesa' }
    }

    revalidateCaja()

    return {
      data: {
        table: updatedTable as RestaurantTable,
        order: order as Order,
      },
      error: null,
    }
  } catch (error) {
    devError('Error in openTable:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Agregar items a una orden abierta
 */
export async function addItemsToOrder(
  orderId: string,
  items: {
    product_id: string
    product_name: string
    product_price: number
    quantity: number
    notes?: string | null
  }[]
): Promise<{
  data: OrderItemRow[] | null
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    // Verify order exists and is open
    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single()

    if (!order || (order.status !== 'abierto' && order.status !== 'cuenta_pedida')) {
      return { data: null, error: 'La orden no esta abierta' }
    }

    // Insert items
    const itemsToInsert = items.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      product_price: item.product_price,
      quantity: item.quantity,
      notes: item.notes || null,
      status: 'pendiente',
      added_by: user.id,
    }))

    const { data: insertedItems, error } = await supabase
      .from('order_items')
      .insert(itemsToInsert)
      .select()

    if (error) {
      devError('Error inserting order items:', error)
      return { data: null, error: 'Error al agregar productos' }
    }

    // Recalculate total and sync JSON
    await recalculateOrderTotal(supabase, orderId)

    revalidateCaja()

    return { data: insertedItems as OrderItemRow[], error: null }
  } catch (error) {
    devError('Error in addItemsToOrder:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Modificar cantidad de un item
 */
export async function updateOrderItem(
  itemId: string,
  quantity: number
): Promise<{
  data: OrderItemRow | null
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    if (quantity < 1) {
      return { data: null, error: 'La cantidad debe ser al menos 1' }
    }

    // Get item to find order_id
    const { data: existingItem } = await supabase
      .from('order_items')
      .select('order_id, status')
      .eq('id', itemId)
      .single()

    if (!existingItem || existingItem.status === 'cancelado') {
      return { data: null, error: 'Item no encontrado' }
    }

    const { data: item, error } = await supabase
      .from('order_items')
      .update({ quantity })
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      devError('Error updating order item:', error)
      return { data: null, error: 'Error al actualizar item' }
    }

    await recalculateOrderTotal(supabase, existingItem.order_id)
    revalidateCaja()

    return { data: item as OrderItemRow, error: null }
  } catch (error) {
    devError('Error in updateOrderItem:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Cancelar un item (soft delete)
 */
export async function removeOrderItem(itemId: string): Promise<{
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { error: 'No autenticado' }

    // Get item to find order_id
    const { data: existingItem } = await supabase
      .from('order_items')
      .select('order_id')
      .eq('id', itemId)
      .single()

    if (!existingItem) {
      return { error: 'Item no encontrado' }
    }

    const { error } = await supabase
      .from('order_items')
      .update({ status: 'cancelado' })
      .eq('id', itemId)

    if (error) {
      devError('Error removing order item:', error)
      return { error: 'Error al eliminar item' }
    }

    await recalculateOrderTotal(supabase, existingItem.order_id)
    revalidateCaja()

    return { error: null }
  } catch (error) {
    devError('Error in removeOrderItem:', error)
    return { error: 'Error inesperado' }
  }
}

/**
 * Pedir la cuenta (abierto -> cuenta_pedida)
 */
export async function requestBill(orderId: string): Promise<{
  data: Order | null
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    // Get order and its table
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('status', 'abierto')
      .single()

    if (!order) {
      return { data: null, error: 'Orden no encontrada o ya cerrada' }
    }

    // Update order status
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({
        status: 'cuenta_pedida',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      devError('Error requesting bill:', error)
      return { data: null, error: 'Error al pedir la cuenta' }
    }

    // Update table status
    await supabase
      .from('restaurant_tables')
      .update({ status: 'cuenta_pedida' })
      .eq('current_order_id', orderId)

    revalidateCaja()

    return { data: updatedOrder as Order, error: null }
  } catch (error) {
    devError('Error in requestBill:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Pagar orden de mesa y liberar mesa
 */
export async function payTableOrder(
  orderId: string,
  tableId: string,
  paymentMethod: PaymentMethod,
  sessionId: string
): Promise<{
  data: Order | null
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    // Get order
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (!order || (order.status !== 'abierto' && order.status !== 'cuenta_pedida')) {
      return { data: null, error: 'Orden no encontrada o ya pagada' }
    }

    const orderData = order as Order

    // Update order to pagado
    const { data: paidOrder, error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'pagado',
        payment_method: paymentMethod,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()

    if (orderError) {
      devError('Error paying table order:', orderError)
      return { data: null, error: 'Error al procesar pago' }
    }

    // Update session totals (same logic as createPosOrder)
    const salesField = getSalesField(paymentMethod)

    const { data: currentSession } = await supabase
      .from('cash_register_sessions')
      .select('total_sales, total_orders, total_cash_sales, total_card_sales, total_transfer_sales')
      .eq('id', sessionId)
      .single()

    if (currentSession) {
      const s = currentSession as Record<string, number>
      await supabase
        .from('cash_register_sessions')
        .update({
          total_sales: (s.total_sales || 0) + orderData.total,
          total_orders: (s.total_orders || 0) + 1,
          [salesField]: (s[salesField] || 0) + orderData.total,
        })
        .eq('id', sessionId)
    }

    // Free the table
    await supabase
      .from('restaurant_tables')
      .update({
        status: 'libre',
        current_order_id: null,
      })
      .eq('id', tableId)

    revalidateCaja()
    revalidateOrders()

    return { data: paidOrder as Order, error: null }
  } catch (error) {
    devError('Error in payTableOrder:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Cancelar orden de mesa y liberar mesa
 */
export async function cancelTableOrder(
  orderId: string,
  tableId: string
): Promise<{
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { error: 'No autenticado' }

    // Cancel order
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'cancelado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (orderError) {
      devError('Error cancelling table order:', orderError)
      return { error: 'Error al cancelar orden' }
    }

    // Cancel all items
    await supabase
      .from('order_items')
      .update({ status: 'cancelado' })
      .eq('order_id', orderId)

    // Free the table
    await supabase
      .from('restaurant_tables')
      .update({
        status: 'libre',
        current_order_id: null,
      })
      .eq('id', tableId)

    revalidateCaja()
    revalidateOrders()

    return { error: null }
  } catch (error) {
    devError('Error in cancelTableOrder:', error)
    return { error: 'Error inesperado' }
  }
}

/**
 * Obtener items de una orden
 */
export async function getOrderItems(orderId: string): Promise<{
  data: OrderItemRow[] | null
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('added_at')

    if (error) {
      devError('Error fetching order items:', error)
      return { data: null, error: 'Error al obtener items' }
    }

    return { data: data as OrderItemRow[], error: null }
  } catch (error) {
    devError('Error in getOrderItems:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener cantidad de mesas abiertas (para status bar)
 */
export async function getOpenTablesCount(): Promise<number> {
  try {
    const supabase = await createAdminClient()
    const { count } = await supabase
      .from('restaurant_tables')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'libre')
      .eq('is_active', true)

    return count || 0
  } catch {
    return 0
  }
}

// ─── Table CRUD (Admin) ────────────────────────────────────

/**
 * Obtener todas las mesas (incluidas inactivas) para admin
 */
export async function getAllTables(): Promise<{
  data: RestaurantTable[] | null
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .order('sort_order')

    if (error) {
      devError('Error fetching all tables:', error)
      return { data: null, error: 'Error al obtener mesas' }
    }

    return { data: data as RestaurantTable[], error: null }
  } catch (error) {
    devError('Error in getAllTables:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Crear una nueva mesa
 */
export async function createTable(data: {
  number: number
  label?: string
  section: string
  capacity: number
}): Promise<{ data: RestaurantTable | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    // Validate
    if (!data.number || !Number.isInteger(data.number) || data.number < 1) {
      return { data: null, error: 'El número de mesa debe ser un entero mayor a 0' }
    }
    if (!data.section?.trim()) {
      return { data: null, error: 'La sección es requerida' }
    }
    if (!data.capacity || data.capacity < 1 || data.capacity > 50) {
      return { data: null, error: 'La capacidad debe ser entre 1 y 50' }
    }
    if (data.label && data.label.length > 50) {
      return { data: null, error: 'La etiqueta no puede exceder 50 caracteres' }
    }

    // Check unique number
    const { data: existing } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('number', data.number)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return { data: null, error: `Ya existe una mesa con el número ${data.number}` }
    }

    // Auto-calculate sort_order
    const { data: maxSort } = await supabase
      .from('restaurant_tables')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const { data: table, error } = await supabase
      .from('restaurant_tables')
      .insert({
        number: data.number,
        label: data.label?.trim() || null,
        section: data.section.trim(),
        capacity: data.capacity,
        sort_order: (maxSort?.sort_order ?? 0) + 1,
        status: 'libre',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      devError('Error creating table:', error)
      return { data: null, error: friendlyError(error) }
    }

    revalidateTables()
    return { data: table as RestaurantTable, error: null }
  } catch (error) {
    devError('Error in createTable:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Actualizar una mesa existente
 */
export async function updateTable(
  tableId: string,
  data: {
    number?: number
    label?: string | null
    section?: string
    capacity?: number
    is_active?: boolean
  }
): Promise<{ data: RestaurantTable | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    if (!tableId?.trim()) {
      return { data: null, error: 'ID de mesa inválido' }
    }

    // Validate number if provided
    if (data.number !== undefined) {
      if (!Number.isInteger(data.number) || data.number < 1) {
        return { data: null, error: 'El número de mesa debe ser un entero mayor a 0' }
      }

      // Check unique (excluding self)
      const { data: existing } = await supabase
        .from('restaurant_tables')
        .select('id')
        .eq('number', data.number)
        .neq('id', tableId)
        .limit(1)
        .maybeSingle()

      if (existing) {
        return { data: null, error: `Ya existe una mesa con el número ${data.number}` }
      }
    }

    if (data.capacity !== undefined && (data.capacity < 1 || data.capacity > 50)) {
      return { data: null, error: 'La capacidad debe ser entre 1 y 50' }
    }

    if (data.label !== undefined && data.label !== null && data.label.length > 50) {
      return { data: null, error: 'La etiqueta no puede exceder 50 caracteres' }
    }

    // If deactivating, check table is libre
    if (data.is_active === false) {
      const { data: currentTable } = await supabase
        .from('restaurant_tables')
        .select('status')
        .eq('id', tableId)
        .single()

      if (currentTable && currentTable.status !== 'libre') {
        return { data: null, error: 'No se puede desactivar una mesa que está en uso' }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (data.number !== undefined) updateData.number = data.number
    if (data.label !== undefined) updateData.label = data.label?.trim() || null
    if (data.section !== undefined) updateData.section = data.section.trim()
    if (data.capacity !== undefined) updateData.capacity = data.capacity
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { data: table, error } = await supabase
      .from('restaurant_tables')
      .update(updateData)
      .eq('id', tableId)
      .select()
      .single()

    if (error) {
      devError('Error updating table:', error)
      return { data: null, error: friendlyError(error) }
    }

    revalidateTables()
    return { data: table as RestaurantTable, error: null }
  } catch (error) {
    devError('Error in updateTable:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Eliminar una mesa (solo si está libre)
 */
export async function deleteTable(tableId: string): Promise<{
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { error: 'No autenticado' }

    if (!tableId?.trim()) {
      return { error: 'ID de mesa inválido' }
    }

    // Check table status
    const { data: table } = await supabase
      .from('restaurant_tables')
      .select('status, number')
      .eq('id', tableId)
      .single()

    if (!table) {
      return { error: 'Mesa no encontrada' }
    }

    if (table.status !== 'libre') {
      return { error: `No se puede eliminar la mesa ${table.number} porque está en uso` }
    }

    const { error } = await supabase
      .from('restaurant_tables')
      .delete()
      .eq('id', tableId)

    if (error) {
      devError('Error deleting table:', error)
      return { error: friendlyError(error) }
    }

    revalidateTables()
    return { error: null }
  } catch (error) {
    devError('Error in deleteTable:', error)
    return { error: 'Error inesperado' }
  }
}

/**
 * Reordenar mesa (swap sort_order con vecina)
 */
export async function reorderTable(
  tableId: string,
  direction: 'up' | 'down'
): Promise<{ error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { error: 'No autenticado' }

    // Get all tables sorted
    const { data: tables } = await supabase
      .from('restaurant_tables')
      .select('id, sort_order')
      .order('sort_order')

    if (!tables) return { error: 'Error al obtener mesas' }

    const currentIndex = tables.findIndex((t) => t.id === tableId)
    if (currentIndex === -1) return { error: 'Mesa no encontrada' }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (swapIndex < 0 || swapIndex >= tables.length) {
      return { error: 'No se puede mover en esa dirección' }
    }

    const current = tables[currentIndex]
    const swap = tables[swapIndex]

    // Swap sort_order values
    await supabase
      .from('restaurant_tables')
      .update({ sort_order: swap.sort_order })
      .eq('id', current.id)

    await supabase
      .from('restaurant_tables')
      .update({ sort_order: current.sort_order })
      .eq('id', swap.id)

    revalidateTables()
    return { error: null }
  } catch (error) {
    devError('Error in reorderTable:', error)
    return { error: 'Error inesperado' }
  }
}
