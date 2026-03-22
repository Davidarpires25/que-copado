import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats, getTopProducts, getSalesChartData } from '@/app/actions/dashboard'
import { getRecentOrders, getOrderCountsByStatus } from '@/app/actions/orders'
import { getComparativeStats } from '@/app/actions/analytics'
import { getOpenTablesCount } from '@/app/actions/tables'
import { getStockAlerts } from '@/app/actions/stock'
import { DashboardOverview } from './dashboard-overview'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const [statsResult, topProductsResult, chartDataResult, recentOrdersResult, trendsResult, openTablesCount, orderCountsResult, stockAlertsResult] = await Promise.all([
    getDashboardStats(),
    getTopProducts(5),
    getSalesChartData(7),
    getRecentOrders(5),
    getComparativeStats(),
    getOpenTablesCount(),
    getOrderCountsByStatus(),
    getStockAlerts(),
  ])

  const orderCounts = orderCountsResult.data
  const activeOrders = orderCounts
    ? (orderCounts.abierto + orderCounts.recibido + orderCounts.cuenta_pedida)
    : 0

  const operationalStatus = {
    openTables: openTablesCount,
    activeOrders,
    stockAlerts: stockAlertsResult.data ?? [],
  }

  return (
    <DashboardOverview
      stats={statsResult.data}
      topProducts={topProductsResult.data || []}
      chartData={chartDataResult.data || []}
      recentOrders={recentOrdersResult.data || []}
      trends={trendsResult.data}
      operationalStatus={operationalStatus}
    />
  )
}
