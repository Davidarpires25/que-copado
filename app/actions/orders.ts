'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBusinessSettings } from '@/app/actions/business-settings'
import { checkBusinessStatus } from '@/lib/services/business-hours'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import { revalidateOrders } from '@/lib/server/revalidate'
import { esTelefonoValido } from '@/lib/utils/phone'
import { getMaxElaboradoQuantity } from '@/lib/server/elaborado-stock'
import { checkRateLimit } from '@/lib/server/rate-limit'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Order, OrderSource, OrderStatus, OrderWithZone } from '@/lib/types/database'
import type { CreateOrderData, OrderFilters } from '@/lib/types/orders'

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

    const elaboradoItems = cartItems.filter((item) => {
      const product = products?.find((p) => p.id === item.id)
      return product?.product_type === 'elaborado'
    })

    const elaboradoMaxQtys = await Promise.all(
      elaboradoItems.map((item) => getMaxElaboradoQuantity(supabase, item.id))
    )
    const elaboradoMaxMap = new Map(
      elaboradoItems.map((item, i) => [item.id, elaboradoMaxQtys[i]])
    )

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
        const maxQty = elaboradoMaxMap.get(item.id) ?? null
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
 * Opciones de creacion. Sin ellas, `createOrder` se comporta exactamente como
 * antes de que existiera el canal de WhatsApp: origen 'web' y limite por IP.
 */
export interface CreateOrderOptions {
  /** Canal que origina el pedido. Por defecto 'web'. */
  source?: OrderSource
  /**
   * Clave con la que se cuenta el limite de pedidos.
   *
   * El default es la IP del request, que sirve para el checkout publico. No
   * sirve para el agente de WhatsApp: sus pedidos salen todos del mismo
   * servidor, asi que una clave por IP dejaria de atender clientes al
   * undecimo pedido de la hora. Ese canal pasa el telefono del cliente.
   */
  rateLimitKey?: string
}

/**
 * Crear una nueva orden (desde checkout - público, o desde el agente)
 */
export async function createOrder(
  data: CreateOrderData,
  options?: CreateOrderOptions
): Promise<{ data: Order | null; error: string | null }> {
  try {
    // Rate limit: 10 órdenes por clave por hora
    let rateLimitKey = options?.rateLimitKey
    if (!rateLimitKey) {
      const headersList = await headers()
      const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
      rateLimitKey = `order:${ip}`
    }
    const { allowed } = checkRateLimit(rateLimitKey, 10, 60 * 60 * 1000)
    if (!allowed) {
      return { data: null, error: 'Demasiados pedidos desde tu conexión. Intentá en unos minutos.' }
    }

    // El telefono se valida aca y no solo en el formulario: la validacion del
    // cliente es una cortesia, no una garantia. Cualquiera puede llamar a esta
    // accion sin pasar por el checkout, y un pedido sin telefono no se puede
    // confirmar ni entregar.
    if (!esTelefonoValido(data.customer_phone)) {
      return { data: null, error: 'El teléfono no es válido' }
    }

    const supabase = await createAdminClient()

    // Las tres consultas que no dependen una de otra, juntas. Estaban en fila
    // —settings, despues productos, despues la zona— y cada viaje a Supabase
    // cuesta ~160ms fijos aunque la consulta se resuelva en 2ms. La zona se pide
    // igual aunque despues falle una validacion: viaja en la misma ola, asi que
    // no cuesta nada, y pedirla despues costaba un viaje entero.
    const productIds = data.items.map((i) => i.id)

    const [
      { data: businessSettings, error: settingsError },
      { data: products, error: stockError },
      { data: zone },
    ] = await Promise.all([
      getBusinessSettings(),
      supabase
        .from('products')
        .select('id, name, price, is_active, is_out_of_stock, current_stock, stock_tracking_enabled, product_type')
        .in('id', productIds),
      data.delivery_zone_id
        ? supabase
            .from('delivery_zones')
            .select('shipping_cost, free_shipping_threshold')
            .eq('id', data.delivery_zone_id)
            .single()
        : Promise.resolve({ data: null }),
    ])

    // VALIDACIÓN: Verificar si los pedidos están pausados
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
    if (stockError) {
      devError('Error checking stock:', stockError)
      return { data: null, error: 'Error al verificar disponibilidad de productos' }
    }

    // Cuanto se puede armar de cada elaborado, todo junto. Era una consulta por
    // hamburguesa adentro del `for`, o sea en serie: tres hamburguesas eran tres
    // viajes de ~160ms para 7ms de trabajo real (medido con EXPLAIN ANALYZE).
    // `validateCartStock`, en este mismo archivo, ya lo hacia con Promise.all.
    // Set y no array: el mismo producto puede venir dos veces en el carrito
    // —dos veces la misma hamburguesa, con observaciones distintas— y no tiene
    // sentido preguntar dos veces por el mismo.
    const elaboradoIds = [...new Set(
      data.items
        .filter((item) => products?.find((p) => p.id === item.id)?.product_type === 'elaborado')
        .map((item) => item.id)
    )]

    const maximos = new Map(
      (await Promise.all(
        elaboradoIds.map(async (id) => [id, await getMaxElaboradoQuantity(supabase, id)] as const)
      ))
    )

    for (const item of data.items) {
      const product = products?.find((p) => p.id === item.id)

      if (!product || !product.is_active) {
        return { data: null, error: `"${item.name}" ya no está disponible` }
      }

      if (product.is_out_of_stock) {
        return { data: null, error: `"${item.name}" se agotó. Por favor actualizá tu carrito.` }
      }

      if (product.product_type === 'elaborado') {
        const maxQty = maximos.get(product.id) ?? null
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

    // Recalculate subtotal server-side from verified product prices — never trust client total
    const priceMap = new Map((products ?? []).map((p) => [p.id, p.price]))
    const serverSubtotal = data.items.reduce((sum, item) => {
      const price = priceMap.get(item.id) ?? 0
      return sum + price * item.quantity
    }, 0)

    // Validate shipping cost against delivery zone — fallback to client value if no zone
    let serverShipping = data.shipping_cost
    if (zone) {
      serverShipping =
        zone.free_shipping_threshold !== null && serverSubtotal >= zone.free_shipping_threshold
          ? 0
          : zone.shipping_cost
    }

    const serverTotal = serverSubtotal + serverShipping

    // El id se genera aca en vez de dejar que lo devuelva la base.
    //
    // El checkout publico corre como `anon`, que tiene permiso para INSERT en
    // `orders` pero no para SELECT —y con razon: si lo tuviera, cualquiera
    // podria leer los pedidos y los datos de todos los clientes—. Un
    // `.insert().select()` se traduce en `INSERT ... RETURNING`, y Postgres
    // exige politica de SELECT para devolver la fila, asi que fallaba con
    // "new row violates row-level security policy" y el pedido nunca se
    // guardaba. Generando el id no hace falta leer nada de vuelta.
    const orderId = crypto.randomUUID()

    const newOrder = {
      id: orderId,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      customer_coordinates: data.customer_coordinates || null,
      items: data.items,
      total: serverTotal,
      shipping_cost: serverShipping,
      delivery_zone_id: data.delivery_zone_id || null,
      notes: data.notes || null,
      payment_method: data.payment_method,
      status: 'recibido' as const,
      order_source: options?.source ?? ('web' as const),
    }

    const { error } = await supabase.from('orders').insert(newOrder)

    if (error) {
      devError('Error creating order:', error)
      return { data: null, error: 'Error al crear el pedido' }
    }

    // El correlativo lo asigna un trigger al insertar, asi que hay que leerlo
    // de vuelta: es el numero que el cliente ve en su WhatsApp y el que despues
    // te dice por telefono. Va en una consulta aparte y no en un
    // `.insert().select()` a proposito — ese RETURNING es el que fallaba por RLS
    // y hacia que el pedido no se guardara.
    const { data: numerado } = await supabase
      .from('orders')
      .select('order_number')
      .eq('id', orderId)
      .single()

    const order = {
      ...newOrder,
      order_number: numerado?.order_number ?? null,
      created_at: new Date().toISOString(),
    } as unknown as Order

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

    // El stock NO se descuenta aca.
    //
    // Antes se descontaba al crear el pedido, o sea antes de que nadie lo
    // aceptara: cualquiera que abriera el checkout y confirmara bajaba el
    // inventario, aunque el pedido no llegara nunca a cocina. Ahora se descuenta
    // al cobrarlo en caja, que es lo que ya hacen mostrador y mesa.

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
      // Use chained ilike calls instead of string interpolation to avoid PostgREST filter injection
      const term = `%${filters.search}%`
      query = query.or(
        `customer_name.ilike.${term},customer_phone.ilike.${term},customer_address.ilike.${term}`
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
      .select('*, delivery_zones(id, name)')
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

    const statuses: OrderStatus[] = ['abierto', 'recibido', 'cuenta_pedida', 'pagado', 'entregado', 'cancelado']

    const results = await Promise.all(
      statuses.map((status) =>
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', status)
      )
    )

    const firstError = results.find((r) => r.error)
    if (firstError?.error) {
      devError('Error counting orders:', firstError.error)
      return { data: null, error: 'Error al contar pedidos' }
    }

    const counts = Object.fromEntries(
      statuses.map((status, i) => [status, results[i].count ?? 0])
    ) as Record<OrderStatus, number>

    return { data: counts, error: null }
  } catch (error) {
    devError('Error in getOrderCountsByStatus:', error)
    return { data: null, error: 'Error inesperado' }
  }
}
