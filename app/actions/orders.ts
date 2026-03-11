'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBusinessSettings } from '@/app/actions/business-settings'
import { checkBusinessStatus } from '@/lib/services/business-hours'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import { revalidateOrders } from '@/lib/server/revalidate'
import { deductStockForOrder } from '@/lib/server/stock-deduction'
import { convertToBaseUnit, getBaseUnit } from '@/lib/server/unit-conversion'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Order, OrderStatus, OrderWithZone } from '@/lib/types/database'
import type { CreateOrderData, OrderFilters } from '@/lib/types/orders'

// ─── Elaborado stock helper ──────────────────────────────────────────────────

/**
 * Calcula cuántas unidades de un producto elaborado se pueden producir
 * con el stock actual de ingredientes. Replica la lógica de deductElaboradoStock
 * pero en modo lectura. Retorna null si no hay ingredientes trackeados (sin límite).
 */
async function getMaxElaboradoQuantity(
  supabase: SupabaseClient,
  productId: string
): Promise<number | null> {
  const { data: productRecipes } = await supabase
    .from('product_recipes')
    .select(`
      quantity,
      recipes (
        recipe_ingredients (
          quantity,
          unit,
          ingredients (
            id,
            unit,
            waste_percentage,
            current_stock,
            stock_tracking_enabled
          )
        )
      )
    `)
    .eq('product_id', productId)

  if (!productRecipes?.length) return null

  let maxQty: number | null = null

  for (const pr of productRecipes) {
    const recipeMultiplier = (pr.quantity as number) ?? 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe = pr.recipes as any
    if (!recipe?.recipe_ingredients) continue

    for (const ri of recipe.recipe_ingredients) {
      const ingredient = ri.ingredients
      if (!ingredient?.stock_tracking_enabled) continue
      if (ingredient.current_stock === null) continue

      const effectiveUnit = ri.unit ?? ingredient.unit
      if (getBaseUnit(effectiveUnit) !== getBaseUnit(ingredient.unit)) continue

      // Cantidad necesaria del ingrediente por 1 unidad de producto
      const neededPerUnit = convertToBaseUnit(recipeMultiplier * ri.quantity, effectiveUnit)
      const wastePct = Number(ingredient.waste_percentage) || 0
      const wasteFactor = 1 - wastePct / 100
      const actualNeededPerUnit = wasteFactor > 0 ? neededPerUnit / wasteFactor : neededPerUnit
      if (actualNeededPerUnit <= 0) continue

      const producible = Math.floor(Number(ingredient.current_stock) / actualNeededPerUnit)
      if (maxQty === null || producible < maxQty) maxQty = producible
    }
  }

  return maxQty
}

// ─── Stock validation types (exported for client use) ───────────────────────

export interface StockIssue {
  productId: string
  productName: string
  issue: 'not_found' | 'out_of_stock' | 'insufficient_stock'
  available?: number
  requested?: number
}

/**
 * Validar disponibilidad de stock para un conjunto de items del carrito (público).
 * Usado en el checkout para early feedback antes de crear la orden.
 */
export async function validateCartStock(
  cartItems: { id: string; name: string; quantity: number }[]
): Promise<{ issues: StockIssue[]; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const ids = cartItems.map((i) => i.id)

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, is_active, is_out_of_stock, current_stock, stock_tracking_enabled, product_type')
      .in('id', ids)

    if (error) return { issues: [], error: 'Error al verificar disponibilidad' }

    const issues: StockIssue[] = []

    for (const item of cartItems) {
      const product = products?.find((p) => p.id === item.id)

      if (!product || !product.is_active) {
        issues.push({ productId: item.id, productName: item.name, issue: 'not_found' })
        continue
      }

      if (product.is_out_of_stock) {
        issues.push({ productId: item.id, productName: item.name, issue: 'out_of_stock' })
        continue
      }

      if (product.product_type === 'elaborado') {
        const maxQty = await getMaxElaboradoQuantity(supabase, product.id)
        if (maxQty !== null && maxQty < item.quantity) {
          issues.push({
            productId: item.id,
            productName: item.name,
            issue: 'insufficient_stock',
            available: Math.max(0, maxQty),
            requested: item.quantity,
          })
        }
        continue
      }

      if (
        product.stock_tracking_enabled &&
        product.current_stock !== null &&
        product.current_stock < item.quantity
      ) {
        issues.push({
          productId: item.id,
          productName: item.name,
          issue: 'insufficient_stock',
          available: product.current_stock,
          requested: item.quantity,
        })
      }
    }

    return { issues, error: null }
  } catch {
    return { issues: [], error: 'Error al verificar disponibilidad' }
  }
}

/**
 * Crear una nueva orden (desde checkout - público)
 */
export async function createOrder(
  data: CreateOrderData
): Promise<{ data: Order | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()

    // VALIDACIÓN: Verificar si los pedidos están pausados
    const { data: businessSettings, error: settingsError } = await getBusinessSettings()

    if (settingsError) {
      devError('Error fetching business settings:', settingsError)
      return { data: null, error: 'Error al verificar el estado del negocio' }
    }

    if (businessSettings) {
      const businessStatus = checkBusinessStatus(businessSettings)

      if (businessStatus.isPaused) {
        return {
          data: null,
          error: businessStatus.message || 'Los pedidos están pausados temporalmente'
        }
      }

      if (!businessStatus.isOpen) {
        return {
          data: null,
          error: `No estamos recibiendo pedidos. ${businessStatus.message}`
        }
      }
    }

    // VALIDACIÓN: Verificar stock de cada producto antes de crear la orden
    const productIds = data.items.map((i) => i.id)
    const { data: products, error: stockError } = await supabase
      .from('products')
      .select('id, name, is_active, is_out_of_stock, current_stock, stock_tracking_enabled, product_type')
      .in('id', productIds)

    if (stockError) {
      devError('Error checking stock:', stockError)
      return { data: null, error: 'Error al verificar disponibilidad de productos' }
    }

    for (const item of data.items) {
      const product = products?.find((p) => p.id === item.id)

      if (!product || !product.is_active) {
        return { data: null, error: `"${item.name}" ya no está disponible` }
      }

      if (product.is_out_of_stock) {
        return { data: null, error: `"${item.name}" se agotó. Por favor actualizá tu carrito.` }
      }

      if (product.product_type === 'elaborado') {
        const maxQty = await getMaxElaboradoQuantity(supabase, product.id)
        if (maxQty !== null && maxQty < item.quantity) {
          return {
            data: null,
            error: maxQty === 0
              ? `"${item.name}" se agotó. Por favor actualizá tu carrito.`
              : `Solo quedan ${maxQty} unidades de "${item.name}" y pediste ${item.quantity}.`,
          }
        }
        continue
      }

      if (
        product.stock_tracking_enabled &&
        product.current_stock !== null &&
        product.current_stock < item.quantity
      ) {
        return {
          data: null,
          error: product.current_stock === 0
            ? `"${item.name}" se agotó. Por favor actualizá tu carrito.`
            : `Solo quedan ${product.current_stock} unidades de "${item.name}" y pediste ${item.quantity}.`,
        }
      }
    }

    const { data: order, error } = await supabase
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
        order_source: 'web',
      })
      .select()
      .single()

    if (error) {
      devError('Error creating order:', error)
      return { data: null, error: 'Error al crear el pedido' }
    }

    // Log initial status in history (non-blocking)
    supabase
      .from('order_status_history')
      .insert({
        order_id: order.id,
        from_status: null,
        to_status: 'recibido',
      })
      .then(({ error: historyError }) => {
        if (historyError) {
          devError('Error logging initial status:', historyError)
        }
      })

    // Deduct stock for web order (best-effort, never blocks the sale)
    deductStockForOrder(supabase, data.items, order.id, null).catch((err) => {
      devError('Error deducting stock for web order:', err)
    })

    revalidateOrders()

    return { data: order, error: null }
  } catch (error) {
    devError('Error in createOrder:', error)
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

    const user = await getAuthUser(supabase)
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    let query = supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    if (filters?.source && filters.source !== 'all') {
      query = query.eq('order_source', filters.source)
    }

    if (filters?.search) {
      query = query.or(
        `customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%,customer_address.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query

    if (error) {
      devError('Error fetching orders:', error)
      return { data: null, error: 'Error al cargar pedidos' }
    }

    return { data: data as unknown as OrderWithZone[], error: null }
  } catch (error) {
    devError('Error in getOrders:', error)
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

    const user = await getAuthUser(supabase)
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .eq('id', orderId)
      .single()

    if (error) {
      devError('Error fetching order:', error)
      return { data: null, error: 'Error al cargar pedido' }
    }

    return { data: data as unknown as OrderWithZone, error: null }
  } catch (error) {
    devError('Error in getOrderById:', error)
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
    const supabase = await createAdminClient()

    const user = await getAuthUser(supabase)
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    // Get current status before updating
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      devError('Error fetching current order status:', fetchError)
      return { data: null, error: 'Error al obtener estado actual' }
    }

    const fromStatus = (currentOrder as { status: string }).status

    // Update the order status
    const { data, error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      devError('Error updating order status:', error)
      return { data: null, error: 'Error al actualizar estado' }
    }

    // Log status change in history (non-blocking)
    supabase
      .from('order_status_history')
      .insert({
        order_id: orderId,
        from_status: fromStatus,
        to_status: newStatus,
        changed_by: user.id,
      })
      .then(({ error: historyError }) => {
        if (historyError) {
          devError('Error logging status history:', historyError)
        }
      })

    revalidateOrders()

    return { data: data as Order, error: null }
  } catch (error) {
    devError('Error in updateOrderStatus:', error)
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

    const user = await getAuthUser(supabase)
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      devError('Error fetching today orders:', error)
      return { data: null, error: 'Error al cargar pedidos' }
    }

    return { data: data as unknown as OrderWithZone[], error: null }
  } catch (error) {
    devError('Error in getTodayOrders:', error)
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

    const user = await getAuthUser(supabase)
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      devError('Error fetching recent orders:', error)
      return { data: null, error: 'Error al cargar pedidos' }
    }

    return { data: data as unknown as OrderWithZone[], error: null }
  } catch (error) {
    devError('Error in getRecentOrders:', error)
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
    const supabase = await createAdminClient()

    const user = await getAuthUser(supabase)
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .from('orders')
      .select('status')

    if (error || !data) {
      devError('Error counting orders:', error)
      return { data: null, error: 'Error al contar pedidos' }
    }

    const counts: Record<OrderStatus, number> = {
      abierto: 0,
      recibido: 0,
      cuenta_pedida: 0,
      pagado: 0,
      entregado: 0,
      cancelado: 0,
    }

    data.forEach((order: { status: string }) => {
      if (order.status in counts) {
        counts[order.status as OrderStatus]++
      }
    })

    return { data: counts, error: null }
  } catch (error) {
    devError('Error in getOrderCountsByStatus:', error)
    return { data: null, error: 'Error inesperado' }
  }
}
