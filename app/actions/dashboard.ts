'use server'

import { createClient } from '@/lib/supabase/server'
import type { DashboardStats, TopProduct, SalesChartData } from '@/lib/types/orders'
import { parseOrderItems } from '@/lib/services/order-formatter'

// Tipos para las queries
interface OrderStatsRow {
  total: number
  shipping_cost: number
  created_at: string
  status: string
}

interface OrderItemsRow {
  items: unknown
}

interface OrderChartRow {
  total: number
  created_at: string
}

/**
 * Obtener estadísticas del dashboard
 */
export async function getDashboardStats(): Promise<{
  data: DashboardStats | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const now = new Date()

    // Inicio del día
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    // Inicio de la semana (lunes)
    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStart.setDate(weekStart.getDate() - daysToMonday)
    weekStart.setHours(0, 0, 0, 0)

    // Inicio del mes
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Obtener todas las órdenes del mes (para calcular todo)
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, shipping_cost, created_at, status')
      .gte('created_at', monthStart.toISOString())
      .neq('status', 'cancelado') as { data: OrderStatsRow[] | null; error: unknown }

    if (error || !orders) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching stats:', error)
      }
      return { data: null, error: 'Error al cargar estadísticas' }
    }

    // Calcular estadísticas
    let todayRevenue = 0
    let todayOrders = 0
    let weekRevenue = 0
    let weekOrders = 0
    let monthRevenue = 0
    let monthOrders = 0

    orders.forEach((order) => {
      const orderDate = new Date(order.created_at)
      const revenue = order.total

      // Mes
      monthRevenue += revenue
      monthOrders++

      // Semana
      if (orderDate >= weekStart) {
        weekRevenue += revenue
        weekOrders++
      }

      // Hoy
      if (orderDate >= todayStart) {
        todayRevenue += revenue
        todayOrders++
      }
    })

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
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getDashboardStats:', error)
    }
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    // Obtener órdenes del mes actual
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('items')
      .gte('created_at', monthStart.toISOString())
      .neq('status', 'cancelado') as { data: OrderItemsRow[] | null; error: unknown }

    if (error || !orders) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching orders for top products:', error)
      }
      return { data: null, error: 'Error al cargar productos' }
    }

    // Agregar ventas por producto
    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {}

    orders.forEach((order) => {
      const items = parseOrderItems(order.items)
      items.forEach((item) => {
        if (!productStats[item.id]) {
          productStats[item.id] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
          }
        }
        productStats[item.id].quantity += item.quantity
        productStats[item.id].revenue += item.price * item.quantity
      })
    })

    // Ordenar por cantidad y tomar los top
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
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getTopProducts:', error)
    }
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    // Calcular fecha de inicio
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelado') as { data: OrderChartRow[] | null; error: unknown }

    if (error || !orders) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching chart data:', error)
      }
      return { data: null, error: 'Error al cargar datos' }
    }

    // Inicializar datos por día
    const chartData: Record<string, { revenue: number; orders: number }> = {}

    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      chartData[dateKey] = { revenue: 0, orders: 0 }
    }

    // Agregar datos de órdenes
    orders.forEach((order) => {
      const dateKey = order.created_at.split('T')[0]
      if (chartData[dateKey]) {
        chartData[dateKey].revenue += order.total
        chartData[dateKey].orders++
      }
    })

    // Convertir a array y ordenar por fecha
    const result: SalesChartData[] = Object.entries(chartData)
      .map(([date, stats]) => ({
        date,
        revenue: stats.revenue,
        orders: stats.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return { data: result, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getSalesChartData:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}
