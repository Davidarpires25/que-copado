'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Order, OrderStatus, OrderWithZone } from '@/lib/types/database'
import type { CreateOrderData, OrderFilters } from '@/lib/types/orders'

/**
 * Crear una nueva orden (desde checkout - público)
 */
export async function createOrder(
  data: CreateOrderData
): Promise<{ data: Order | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error } = await (supabase as any)
      .from('orders')
      .insert({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_address: data.customer_address,
        customer_coordinates: data.customer_coordinates || null,
        items: data.items,
        total: data.total,
        shipping_cost: data.shipping_cost,
        delivery_zone_id: data.delivery_zone_id || null,
        notes: data.notes || null,
        payment_method: data.payment_method,
        status: 'recibido',
      })
      .select()
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating order:', error)
      }
      return { data: null, error: 'Error al crear el pedido' }
    }

    // Revalidar páginas del admin
    revalidatePath('/admin/orders')
    revalidatePath('/admin/dashboard')

    return { data: order, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in createOrder:', error)
    }
    return { data: null, error: 'Error inesperado al crear el pedido' }
  }
}

/**
 * Obtener todas las órdenes con filtros (admin)
 */
export async function getOrders(
  filters?: OrderFilters
): Promise<{ data: OrderWithZone[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    let query = supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    if (filters?.search) {
      query = query.or(
        `customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%,customer_address.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching orders:', error)
      }
      return { data: null, error: 'Error al cargar pedidos' }
    }

    return { data: data as OrderWithZone[], error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getOrders:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener una orden por ID (admin)
 */
export async function getOrderById(
  orderId: string
): Promise<{ data: OrderWithZone | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .eq('id', orderId)
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching order:', error)
      }
      return { data: null, error: 'Error al cargar pedido' }
    }

    return { data: data as OrderWithZone, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getOrderById:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Actualizar estado de una orden (admin)
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ data: Order | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating order status:', error)
      }
      return { data: null, error: 'Error al actualizar estado' }
    }

    // Revalidar páginas
    revalidatePath('/admin/orders')
    revalidatePath('/admin/dashboard')

    return { data: data as Order, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in updateOrderStatus:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener órdenes del día (admin - para dashboard)
 */
export async function getTodayOrders(): Promise<{
  data: OrderWithZone[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    // Inicio del día actual en timezone local
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching today orders:', error)
      }
      return { data: null, error: 'Error al cargar pedidos' }
    }

    return { data: data as OrderWithZone[], error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getTodayOrders:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener órdenes recientes (últimas 24h) para notificaciones
 */
export async function getRecentOrders(
  limit: number = 10
): Promise<{ data: OrderWithZone[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching recent orders:', error)
      }
      return { data: null, error: 'Error al cargar pedidos' }
    }

    return { data: data as OrderWithZone[], error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getRecentOrders:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Contar pedidos por estado (admin)
 */
export async function getOrderCountsByStatus(): Promise<{
  data: Record<OrderStatus, number> | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .from('orders')
      .select('status') as { data: { status: string }[] | null; error: unknown }

    if (error || !data) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error counting orders:', error)
      }
      return { data: null, error: 'Error al contar pedidos' }
    }

    const counts: Record<OrderStatus, number> = {
      recibido: 0,
      pagado: 0,
      entregado: 0,
      cancelado: 0,
    }

    data.forEach((order) => {
      if (order.status in counts) {
        counts[order.status as OrderStatus]++
      }
    })

    return { data: counts, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getOrderCountsByStatus:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}
