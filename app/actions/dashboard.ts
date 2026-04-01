'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import type { DashboardStats, TopProduct, SalesChartData } from '@/lib/types/orders'

interface OrderChartRow {
  total: number
  created_at: string
}

/**
 * Obtener estadísticas del dashboard
 * Runs 3 parallel queries with SQL date filters instead of fetching all month data
 */
export async function getDashboardStats(): Promise<{
  data: DashboardStats | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const user = await getAuthUser(supabase)
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const now = new Date()

    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStart.setDate(weekStart.getDate() - daysToMonday)
    weekStart.setHours(0, 0, 0, 0)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [todayResult, weekResult, monthResult] = await Promise.all([
      supabase
        .from('orders')
        .select('total')
        .gte('created_at', todayStart.toISOString())
        .neq('status', 'cancelado'),
      supabase
        .from('orders')
        .select('total')
        .gte('created_at', weekStart.toISOString())
        .neq('status', 'cancelado'),
      supabase
        .from('orders')
        .select('total')
        .gte('created_at', monthStart.toISOString())
        .neq('status', 'cancelado'),
    ])

    if (todayResult.error || weekResult.error || monthResult.error) {
      devError('Error fetching stats:', todayResult.error ?? weekResult.error ?? monthResult.error)
      return { data: null, error: 'Error al cargar estadísticas' }
    }

    const sumTotal = (rows: { total: number }[]) =>
      rows.reduce((acc, o) => acc + o.total, 0)

    const todayOrders = todayResult.data.length
    const todayRevenue = sumTotal(todayResult.data)
    const weekOrders = weekResult.data.length
    const weekRevenue = sumTotal(weekResult.data)
    const monthOrders = monthResult.data.length
    const monthRevenue = sumTotal(monthResult.data)
    const averageTicket = monthOrders > 0 ? monthRevenue / monthOrders : 0

    return {
      data: {
        todayRevenue,
        todayOrders,
        weekRevenue,
        weekOrders,
        monthRevenue,
        monthOrders,
        averageTicket,
      },
      error: null,
    }
  } catch (error) {
    devError('Error in getDashboardStats:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener productos más vendidos
 */
export async function getTopProducts(
  limit: number = 5
): Promise<{ data: TopProduct[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const user = await getAuthUser(supabase)
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { data: orderIds, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .gte('created_at', monthStart.toISOString())
      .neq('status', 'cancelado')

    if (ordersError || !orderIds) {
      devError('Error fetching orders for top products:', ordersError)
      return { data: null, error: 'Error al cargar productos' }
    }

    if (orderIds.length === 0) {
      return { data: [], error: null }
    }

    interface OrderItemRow {
      product_id: string | null
      product_name: string
      product_price: number
      quantity: number
    }

    const { data: rows, error } = await supabase
      .from('order_items')
      .select('product_id, product_name, product_price, quantity')
      .in('order_id', (orderIds as { id: string }[]).map((o) => o.id))
      .neq('status', 'cancelado') as { data: OrderItemRow[] | null; error: unknown }

    if (error || !rows) {
      devError('Error fetching order_items for top products:', error)
      return { data: null, error: 'Error al cargar productos' }
    }

    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {}

    rows.forEach((item) => {
      const key = item.product_id ?? item.product_name
      if (!productStats[key]) {
        productStats[key] = {
          name: item.product_name,
          quantity: 0,
          revenue: 0,
        }
      }
      productStats[key].quantity += item.quantity
      productStats[key].revenue += item.product_price * item.quantity
    })

    const topProducts = Object.entries(productStats)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        quantity: stats.quantity,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit)

    return { data: topProducts, error: null }
  } catch (error) {
    devError('Error in getTopProducts:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener datos para el gráfico de ventas (últimos 7 días)
 */
export async function getSalesChartData(
  days: number = 7
): Promise<{ data: SalesChartData[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const user = await getAuthUser(supabase)
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelado') as { data: OrderChartRow[] | null; error: unknown }

    if (error || !orders) {
      devError('Error fetching chart data:', error)
      return { data: null, error: 'Error al cargar datos' }
    }

    const chartData: Record<string, { revenue: number; orders: number }> = {}

    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      chartData[dateKey] = { revenue: 0, orders: 0 }
    }

    orders.forEach((order) => {
      const dateKey = order.created_at.split('T')[0]
      if (chartData[dateKey]) {
        chartData[dateKey].revenue += order.total
        chartData[dateKey].orders++
      }
    })

    const result: SalesChartData[] = Object.entries(chartData)
      .map(([date, stats]) => ({
        date,
        revenue: stats.revenue,
        orders: stats.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return { data: result, error: null }
  } catch (error) {
    devError('Error in getSalesChartData:', error)
    return { data: null, error: 'Error inesperado' }
  }
}
