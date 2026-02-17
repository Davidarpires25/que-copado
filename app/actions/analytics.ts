'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import { parseOrderItems } from '@/lib/services/order-formatter'
import type { Json } from '@/lib/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnalyticsPeriod = '7d' | '30d' | '90d'

export interface TrendData {
  value: number
  isPositive: boolean
}

export interface ComparativeStats {
  todayRevenueTrend: TrendData | null
  todayOrdersTrend: TrendData | null
  weekRevenueTrend: TrendData | null
  weekOrdersTrend: TrendData | null
  monthRevenueTrend: TrendData | null
  monthOrdersTrend: TrendData | null
  averageTicketTrend: TrendData | null
}

export interface HourlySalesData {
  hour: number
  label: string
  orders: number
  revenue: number
  avgTicket: number
}

export interface WeekdaySalesData {
  day: number
  dayName: string
  totalOrders: number
  totalRevenue: number
  avgOrders: number
  avgRevenue: number
}

export interface CancellationData {
  rate: number
  cancelledOrders: number
  totalOrders: number
  previousRate: number
  trend: TrendData | null
}

export interface TopProductRevenue {
  id: string
  name: string
  quantity: number
  revenue: number
  percentage: number
}

export interface ConfigurableSalesData {
  date: string
  label: string
  revenue: number
  orders: number
}

export interface ZoneSalesData {
  zoneId: string | null
  zoneName: string
  zoneColor: string
  orders: number
  revenue: number
  avgTicket: number
  shippingRevenue: number
  freeShippingOrders: number
  paidShippingOrders: number
  percentage: number
}

export interface ShippingAnalysisData {
  totalShippingRevenue: number
  avgShippingCost: number
  freeShippingOrders: { count: number; avgTicket: number; totalRevenue: number }
  paidShippingOrders: { count: number; avgTicket: number; totalRevenue: number }
  ticketLiftPercentage: number
}

export interface PaymentMethodData {
  method: string
  label: string
  orders: number
  revenue: number
  percentage: number
  avgTicket: number
}

export interface ProductProfitability {
  id: string
  name: string
  price: number
  cost: number | null
  revenue: number
  cogs: number
  margin: number
  marginPercentage: number
  foodCostPercentage: number
  quantitySold: number
}

export interface ProfitabilityData {
  totalRevenue: number
  totalCOGS: number
  grossMargin: number
  grossMarginPercentage: number
  foodCostPercentage: number
  productsWithCost: number
  productsWithoutCost: number
  products: ProductProfitability[]
}

// ---------------------------------------------------------------------------
// Internal types for raw query rows
// ---------------------------------------------------------------------------

interface OrderRow {
  id: string
  total: number
  shipping_cost: number
  created_at: string
  status: string
  items: unknown
  delivery_zone_id: string | null
  payment_method: string
}

interface DeliveryZoneRow {
  id: string
  name: string
  color: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPeriodStartDate(period: AnalyticsPeriod): Date {
  const days = { '7d': 7, '30d': 30, '90d': 90 }
  const start = new Date()
  start.setDate(start.getDate() - days[period])
  start.setHours(0, 0, 0, 0)
  return start
}

function calculateTrend(current: number, previous: number): TrendData | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return { value: 100, isPositive: true }
  const change = ((current - previous) / previous) * 100
  return {
    value: Math.round(Math.abs(change)),
    isPositive: change >= 0,
  }
}

// ---------------------------------------------------------------------------
// F1.1 - Comparative Stats (Trends for dashboard)
// ---------------------------------------------------------------------------

export async function getComparativeStats(): Promise<{
  data: ComparativeStats | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const now = new Date()

    // Today boundaries
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    // Week boundaries (Monday-based)
    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStart.setDate(weekStart.getDate() - daysToMonday)
    weekStart.setHours(0, 0, 0, 0)
    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)

    // Month boundaries
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Fetch all orders from the start of prev month (covers all needed periods)
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, shipping_cost, created_at, status')
      .gte('created_at', prevMonthStart.toISOString()) as { data: OrderRow[] | null; error: unknown }

    if (error || !orders) {
      devError('Error fetching comparative stats:', error)
      return { data: null, error: 'Error al cargar estadisticas comparativas' }
    }

    // Classify orders into periods
    let todayRevenue = 0, todayOrders = 0
    let yesterdayRevenue = 0, yesterdayOrders = 0
    let weekRevenue = 0, weekOrders = 0
    let prevWeekRevenue = 0, prevWeekOrders = 0
    let monthRevenue = 0, monthOrders = 0
    let prevMonthRevenue = 0, prevMonthOrders = 0

    for (const order of orders) {
      if (order.status === 'cancelado') continue
      const orderDate = new Date(order.created_at)
      const revenue = Number(order.total)

      // Today vs yesterday
      if (orderDate >= todayStart) {
        todayRevenue += revenue
        todayOrders++
      } else if (orderDate >= yesterdayStart && orderDate < todayStart) {
        yesterdayRevenue += revenue
        yesterdayOrders++
      }

      // This week vs prev week
      if (orderDate >= weekStart) {
        weekRevenue += revenue
        weekOrders++
      } else if (orderDate >= prevWeekStart && orderDate < weekStart) {
        prevWeekRevenue += revenue
        prevWeekOrders++
      }

      // This month vs prev month
      if (orderDate >= monthStart) {
        monthRevenue += revenue
        monthOrders++
      } else if (orderDate >= prevMonthStart && orderDate < monthStart) {
        prevMonthRevenue += revenue
        prevMonthOrders++
      }
    }

    const avgTicketCurrent = monthOrders > 0 ? monthRevenue / monthOrders : 0
    const avgTicketPrev = prevMonthOrders > 0 ? prevMonthRevenue / prevMonthOrders : 0

    return {
      data: {
        todayRevenueTrend: calculateTrend(todayRevenue, yesterdayRevenue),
        todayOrdersTrend: calculateTrend(todayOrders, yesterdayOrders),
        weekRevenueTrend: calculateTrend(weekRevenue, prevWeekRevenue),
        weekOrdersTrend: calculateTrend(weekOrders, prevWeekOrders),
        monthRevenueTrend: calculateTrend(monthRevenue, prevMonthRevenue),
        monthOrdersTrend: calculateTrend(monthOrders, prevMonthOrders),
        averageTicketTrend: calculateTrend(avgTicketCurrent, avgTicketPrev),
      },
      error: null,
    }
  } catch (err) {
    devError('Error in getComparativeStats:', err)
    return { data: null, error: 'Error inesperado' }
  }
}

// ---------------------------------------------------------------------------
// F1.2 - Hourly Sales
// ---------------------------------------------------------------------------

export async function getHourlySales(
  period: AnalyticsPeriod = '30d'
): Promise<{ data: HourlySalesData[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const startDate = getPeriodStartDate(period)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelado') as { data: { total: number; created_at: string }[] | null; error: unknown }

    if (error || !orders) {
      devError('Error fetching hourly sales:', error)
      return { data: null, error: 'Error al cargar datos por hora' }
    }

    // Initialize all 24 hours
    const hourlyMap: Record<number, { orders: number; revenue: number }> = {}
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = { orders: 0, revenue: 0 }
    }

    for (const order of orders) {
      const hour = new Date(order.created_at).getHours()
      hourlyMap[hour].orders++
      hourlyMap[hour].revenue += Number(order.total)
    }

    const result: HourlySalesData[] = Object.entries(hourlyMap).map(([h, stats]) => ({
      hour: Number(h),
      label: `${h.padStart(2, '0')}:00`,
      orders: stats.orders,
      revenue: stats.revenue,
      avgTicket: stats.orders > 0 ? Math.round(stats.revenue / stats.orders) : 0,
    }))

    return { data: result, error: null }
  } catch (err) {
    devError('Error in getHourlySales:', err)
    return { data: null, error: 'Error inesperado' }
  }
}

// ---------------------------------------------------------------------------
// F1.3 - Weekday Sales
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

export async function getWeekdaySales(
  period: AnalyticsPeriod = '30d'
): Promise<{ data: WeekdaySalesData[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const startDate = getPeriodStartDate(period)
    const days = { '7d': 7, '30d': 30, '90d': 90 }
    const numWeeks = Math.ceil(days[period] / 7)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelado') as { data: { total: number; created_at: string }[] | null; error: unknown }

    if (error || !orders) {
      devError('Error fetching weekday sales:', error)
      return { data: null, error: 'Error al cargar datos por dia' }
    }

    // Initialize all 7 days
    const dayMap: Record<number, { totalOrders: number; totalRevenue: number }> = {}
    for (let d = 0; d < 7; d++) {
      dayMap[d] = { totalOrders: 0, totalRevenue: 0 }
    }

    for (const order of orders) {
      const day = new Date(order.created_at).getDay()
      dayMap[day].totalOrders++
      dayMap[day].totalRevenue += Number(order.total)
    }

    // Order: Lun, Mar, Mie, Jue, Vie, Sab, Dom
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]

    const result: WeekdaySalesData[] = dayOrder.map((d) => ({
      day: d,
      dayName: DAY_NAMES[d],
      totalOrders: dayMap[d].totalOrders,
      totalRevenue: dayMap[d].totalRevenue,
      avgOrders: Math.round((dayMap[d].totalOrders / numWeeks) * 10) / 10,
      avgRevenue: Math.round(dayMap[d].totalRevenue / numWeeks),
    }))

    return { data: result, error: null }
  } catch (err) {
    devError('Error in getWeekdaySales:', err)
    return { data: null, error: 'Error inesperado' }
  }
}

// ---------------------------------------------------------------------------
// F1.4 - Cancellation Rate
// ---------------------------------------------------------------------------

export async function getCancellationRate(
  period: AnalyticsPeriod = '30d'
): Promise<{ data: CancellationData | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const days = { '7d': 7, '30d': 30, '90d': 90 }
    const startDate = getPeriodStartDate(period)
    const prevStart = new Date(startDate)
    prevStart.setDate(prevStart.getDate() - days[period])

    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, created_at')
      .gte('created_at', prevStart.toISOString()) as { data: { status: string; created_at: string }[] | null; error: unknown }

    if (error || !orders) {
      devError('Error fetching cancellation rate:', error)
      return { data: null, error: 'Error al cargar tasa de cancelacion' }
    }

    let currentTotal = 0, currentCancelled = 0
    let prevTotal = 0, prevCancelled = 0

    for (const order of orders) {
      const orderDate = new Date(order.created_at)
      if (orderDate >= startDate) {
        currentTotal++
        if (order.status === 'cancelado') currentCancelled++
      } else {
        prevTotal++
        if (order.status === 'cancelado') prevCancelled++
      }
    }

    const currentRate = currentTotal > 0 ? (currentCancelled / currentTotal) * 100 : 0
    const previousRate = prevTotal > 0 ? (prevCancelled / prevTotal) * 100 : 0

    return {
      data: {
        rate: Math.round(currentRate * 10) / 10,
        cancelledOrders: currentCancelled,
        totalOrders: currentTotal,
        previousRate: Math.round(previousRate * 10) / 10,
        trend: calculateTrend(currentRate, previousRate),
      },
      error: null,
    }
  } catch (err) {
    devError('Error in getCancellationRate:', err)
    return { data: null, error: 'Error inesperado' }
  }
}

// ---------------------------------------------------------------------------
// F1.5 - Payment Method Distribution
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  mercadopago: 'MercadoPago',
  card: 'Tarjeta',
}

export async function getPaymentMethodDistribution(
  period: AnalyticsPeriod = '30d'
): Promise<{ data: PaymentMethodData[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const startDate = getPeriodStartDate(period)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, payment_method')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelado') as { data: { total: number; payment_method: string }[] | null; error: unknown }

    if (error || !orders) {
      devError('Error fetching payment method distribution:', error)
      return { data: null, error: 'Error al cargar distribución de pagos' }
    }

    const methodStats: Record<string, { orders: number; revenue: number }> = {}

    for (const order of orders) {
      const method = order.payment_method || 'cash'
      if (!methodStats[method]) {
        methodStats[method] = { orders: 0, revenue: 0 }
      }
      methodStats[method].orders++
      methodStats[method].revenue += Number(order.total)
    }

    const totalOrders = orders.length

    const result: PaymentMethodData[] = Object.entries(methodStats)
      .map(([method, stats]) => ({
        method,
        label: PAYMENT_METHOD_LABELS[method] || method,
        orders: stats.orders,
        revenue: stats.revenue,
        percentage: totalOrders > 0 ? Math.round((stats.orders / totalOrders) * 1000) / 10 : 0,
        avgTicket: stats.orders > 0 ? Math.round(stats.revenue / stats.orders) : 0,
      }))
      .sort((a, b) => b.orders - a.orders)

    return { data: result, error: null }
  } catch (err) {
    devError('Error in getPaymentMethodDistribution:', err)
    return { data: null, error: 'Error inesperado' }
  }
}

// ---------------------------------------------------------------------------
// F1.6 - Top Products by Revenue
// ---------------------------------------------------------------------------

export async function getTopProductsByRevenue(
  period: AnalyticsPeriod = '30d',
  limit: number = 10
): Promise<{ data: TopProductRevenue[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const startDate = getPeriodStartDate(period)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('items')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelado') as { data: { items: unknown }[] | null; error: unknown }

    if (error || !orders) {
      devError('Error fetching top products:', error)
      return { data: null, error: 'Error al cargar top productos' }
    }

    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {}

    for (const order of orders) {
      const items = parseOrderItems(order.items as Json)
      for (const item of items) {
        if (!productStats[item.id]) {
          productStats[item.id] = { name: item.name, quantity: 0, revenue: 0 }
        }
        productStats[item.id].quantity += item.quantity
        productStats[item.id].revenue += item.price * item.quantity
      }
    }

    const totalRevenue = Object.values(productStats).reduce((sum, p) => sum + p.revenue, 0)

    const result: TopProductRevenue[] = Object.entries(productStats)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        quantity: stats.quantity,
        revenue: stats.revenue,
        percentage: totalRevenue > 0 ? Math.round((stats.revenue / totalRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)

    return { data: result, error: null }
  } catch (err) {
    devError('Error in getTopProductsByRevenue:', err)
    return { data: null, error: 'Error inesperado' }
  }
}

// ---------------------------------------------------------------------------
// F1.6 - Configurable Sales Chart (7/30/90 days)
// ---------------------------------------------------------------------------

export async function getConfigurableSalesChart(
  period: AnalyticsPeriod = '7d'
): Promise<{ data: ConfigurableSalesData[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const days = { '7d': 7, '30d': 30, '90d': 90 }
    const numDays = days[period]
    const startDate = getPeriodStartDate(period)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelado') as { data: { total: number; created_at: string }[] | null; error: unknown }

    if (error || !orders) {
      devError('Error fetching configurable sales:', error)
      return { data: null, error: 'Error al cargar grafico de ventas' }
    }

    if (numDays <= 30) {
      // Daily granularity
      const dailyMap: Record<string, { revenue: number; orders: number }> = {}
      for (let i = 0; i < numDays; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (numDays - 1 - i))
        const dateKey = date.toISOString().split('T')[0]
        dailyMap[dateKey] = { revenue: 0, orders: 0 }
      }

      for (const order of orders) {
        const dateKey = order.created_at.split('T')[0]
        if (dailyMap[dateKey]) {
          dailyMap[dateKey].revenue += Number(order.total)
          dailyMap[dateKey].orders++
        }
      }

      const result: ConfigurableSalesData[] = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => {
          const d = new Date(date)
          return {
            date,
            label: d.toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'short',
            }),
            revenue: stats.revenue,
            orders: stats.orders,
          }
        })

      return { data: result, error: null }
    } else {
      // Weekly granularity for 90d
      const weeklyMap: Record<string, { revenue: number; orders: number; start: Date }> = {}

      for (let i = 0; i < Math.ceil(numDays / 7); i++) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - numDays + i * 7)
        weekStart.setHours(0, 0, 0, 0)
        const weekKey = weekStart.toISOString().split('T')[0]
        weeklyMap[weekKey] = { revenue: 0, orders: 0, start: weekStart }
      }

      const weekKeys = Object.keys(weeklyMap).sort()

      for (const order of orders) {
        const orderDate = new Date(order.created_at)
        // Find which week this order belongs to
        let assignedWeek = weekKeys[0]
        for (const wk of weekKeys) {
          if (orderDate >= weeklyMap[wk].start) {
            assignedWeek = wk
          }
        }
        weeklyMap[assignedWeek].revenue += Number(order.total)
        weeklyMap[assignedWeek].orders++
      }

      const result: ConfigurableSalesData[] = weekKeys.map((wk) => {
        const d = weeklyMap[wk].start
        return {
          date: wk,
          label: `Sem ${d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
          revenue: weeklyMap[wk].revenue,
          orders: weeklyMap[wk].orders,
        }
      })

      return { data: result, error: null }
    }
  } catch (err) {
    devError('Error in getConfigurableSalesChart:', err)
    return { data: null, error: 'Error inesperado' }
  }
}

// ---------------------------------------------------------------------------
// F1.7 - Zone Sales
// ---------------------------------------------------------------------------

export async function getZoneSales(
  period: AnalyticsPeriod = '30d'
): Promise<{ data: ZoneSalesData[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const startDate = getPeriodStartDate(period)

    // Fetch orders and delivery zones
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('total, shipping_cost, delivery_zone_id, created_at')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelado') as { data: OrderRow[] | null; error: unknown }

    if (ordersError || !ordersData) {
      devError('Error fetching zone sales orders:', ordersError)
      return { data: null, error: 'Error al cargar datos por zona' }
    }

    const { data: zonesData, error: zonesError } = await supabase
      .from('delivery_zones')
      .select('id, name, color') as { data: DeliveryZoneRow[] | null; error: unknown }

    if (zonesError || !zonesData) {
      devError('Error fetching zones:', zonesError)
      return { data: null, error: 'Error al cargar zonas' }
    }

    const orders = ordersData
    const zones = zonesData

    // Build zone lookup
    const zoneMap = new Map<string, { name: string; color: string }>()
    for (const z of zones) {
      zoneMap.set(z.id, { name: z.name, color: z.color })
    }

    // Aggregate by zone
    const zoneStats: Record<string, {
      zoneName: string
      zoneColor: string
      orders: number
      revenue: number
      shippingRevenue: number
      freeShippingOrders: number
      paidShippingOrders: number
    }> = {}

    const NO_ZONE = '__no_zone__'

    for (const order of orders) {
      const zoneKey = order.delivery_zone_id || NO_ZONE
      if (!zoneStats[zoneKey]) {
        const zoneInfo = order.delivery_zone_id ? zoneMap.get(order.delivery_zone_id) : null
        zoneStats[zoneKey] = {
          zoneName: zoneInfo?.name || 'Sin zona',
          zoneColor: zoneInfo?.color || '#6B7280',
          orders: 0,
          revenue: 0,
          shippingRevenue: 0,
          freeShippingOrders: 0,
          paidShippingOrders: 0,
        }
      }

      const stats = zoneStats[zoneKey]
      stats.orders++
      stats.revenue += Number(order.total)
      stats.shippingRevenue += Number(order.shipping_cost || 0)

      if (Number(order.shipping_cost || 0) === 0) {
        stats.freeShippingOrders++
      } else {
        stats.paidShippingOrders++
      }
    }

    const totalRevenue = Object.values(zoneStats).reduce((sum, s) => sum + s.revenue, 0)

    const result: ZoneSalesData[] = Object.entries(zoneStats)
      .map(([zoneId, stats]) => ({
        zoneId: zoneId === NO_ZONE ? null : zoneId,
        zoneName: stats.zoneName,
        zoneColor: stats.zoneColor,
        orders: stats.orders,
        revenue: stats.revenue,
        avgTicket: stats.orders > 0 ? Math.round(stats.revenue / stats.orders) : 0,
        shippingRevenue: stats.shippingRevenue,
        freeShippingOrders: stats.freeShippingOrders,
        paidShippingOrders: stats.paidShippingOrders,
        percentage: totalRevenue > 0 ? Math.round((stats.revenue / totalRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    return { data: result, error: null }
  } catch (err) {
    devError('Error in getZoneSales:', err)
    return { data: null, error: 'Error inesperado' }
  }
}

// ---------------------------------------------------------------------------
// F1.8 - Shipping Analysis
// ---------------------------------------------------------------------------

export async function getShippingAnalysis(
  period: AnalyticsPeriod = '30d'
): Promise<{ data: ShippingAnalysisData | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const startDate = getPeriodStartDate(period)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, shipping_cost')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelado') as { data: { total: number; shipping_cost: number }[] | null; error: unknown }

    if (error || !orders) {
      devError('Error fetching shipping analysis:', error)
      return { data: null, error: 'Error al cargar analisis de envio' }
    }

    let totalShippingRevenue = 0
    const freeOrders: number[] = []
    const paidOrders: number[] = []

    for (const order of orders) {
      const shipping = Number(order.shipping_cost || 0)
      const total = Number(order.total)
      totalShippingRevenue += shipping

      if (shipping === 0) {
        freeOrders.push(total)
      } else {
        paidOrders.push(total)
      }
    }

    const freeAvgTicket = freeOrders.length > 0
      ? Math.round(freeOrders.reduce((a, b) => a + b, 0) / freeOrders.length)
      : 0
    const paidAvgTicket = paidOrders.length > 0
      ? Math.round(paidOrders.reduce((a, b) => a + b, 0) / paidOrders.length)
      : 0

    const freeTotal = freeOrders.reduce((a, b) => a + b, 0)
    const paidTotal = paidOrders.reduce((a, b) => a + b, 0)

    const ticketLift = paidAvgTicket > 0
      ? Math.round(((freeAvgTicket - paidAvgTicket) / paidAvgTicket) * 100)
      : 0

    return {
      data: {
        totalShippingRevenue,
        avgShippingCost: orders.length > 0 ? Math.round(totalShippingRevenue / orders.length) : 0,
        freeShippingOrders: {
          count: freeOrders.length,
          avgTicket: freeAvgTicket,
          totalRevenue: freeTotal,
        },
        paidShippingOrders: {
          count: paidOrders.length,
          avgTicket: paidAvgTicket,
          totalRevenue: paidTotal,
        },
        ticketLiftPercentage: ticketLift,
      },
      error: null,
    }
  } catch (err) {
    devError('Error in getShippingAnalysis:', err)
    return { data: null, error: 'Error inesperado' }
  }
}

// ---------------------------------------------------------------------------
// F2.3 - Profitability Report (Food Cost & Margin)
// ---------------------------------------------------------------------------

export async function getProfitabilityReport(
  period: AnalyticsPeriod = '30d'
): Promise<{ data: ProfitabilityData | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const startDate = getPeriodStartDate(period)

    // Fetch orders and products
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('items')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelado') as { data: { items: unknown }[] | null; error: unknown }

    if (ordersError || !ordersData) {
      devError('Error fetching orders for profitability:', ordersError)
      return { data: null, error: 'Error al cargar datos de rentabilidad' }
    }

    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, cost') as { data: { id: string; name: string; price: number; cost: number | null }[] | null; error: unknown }

    if (productsError || !productsData) {
      devError('Error fetching products for profitability:', productsError)
      return { data: null, error: 'Error al cargar productos' }
    }

    // Build product cost lookup
    const productCostMap = new Map<string, { name: string; price: number; cost: number | null }>()
    for (const p of productsData) {
      productCostMap.set(p.id, { name: p.name, price: p.price, cost: p.cost })
    }

    // Aggregate sales by product
    const productStats: Record<string, { name: string; price: number; cost: number | null; quantity: number; revenue: number }> = {}

    for (const order of ordersData) {
      const items = parseOrderItems(order.items as Json)
      for (const item of items) {
        if (!productStats[item.id]) {
          const productInfo = productCostMap.get(item.id)
          productStats[item.id] = {
            name: productInfo?.name || item.name,
            price: productInfo?.price || item.price,
            cost: productInfo?.cost ?? null,
            quantity: 0,
            revenue: 0,
          }
        }
        productStats[item.id].quantity += item.quantity
        productStats[item.id].revenue += item.price * item.quantity
      }
    }

    // Calculate profitability per product
    let totalRevenue = 0
    let totalCOGS = 0
    let productsWithCost = 0
    let productsWithoutCost = 0

    const products: ProductProfitability[] = Object.entries(productStats)
      .map(([id, stats]) => {
        const cogs = stats.cost !== null ? stats.cost * stats.quantity : 0
        const margin = stats.revenue - cogs
        const marginPct = stats.revenue > 0 ? (margin / stats.revenue) * 100 : 0
        const foodCostPct = stats.revenue > 0 ? (cogs / stats.revenue) * 100 : 0

        totalRevenue += stats.revenue
        if (stats.cost !== null) {
          totalCOGS += cogs
          productsWithCost++
        } else {
          productsWithoutCost++
        }

        return {
          id,
          name: stats.name,
          price: stats.price,
          cost: stats.cost,
          revenue: stats.revenue,
          cogs,
          margin,
          marginPercentage: Math.round(marginPct * 10) / 10,
          foodCostPercentage: Math.round(foodCostPct * 10) / 10,
          quantitySold: stats.quantity,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)

    const grossMargin = totalRevenue - totalCOGS
    const grossMarginPct = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0
    const foodCostPct = totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0

    return {
      data: {
        totalRevenue,
        totalCOGS,
        grossMargin,
        grossMarginPercentage: Math.round(grossMarginPct * 10) / 10,
        foodCostPercentage: Math.round(foodCostPct * 10) / 10,
        productsWithCost,
        productsWithoutCost,
        products,
      },
      error: null,
    }
  } catch (err) {
    devError('Error in getProfitabilityReport:', err)
    return { data: null, error: 'Error inesperado' }
  }
}
