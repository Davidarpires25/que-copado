import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats, getTopProducts, getSalesChartData } from '@/app/actions/dashboard'
import { getRecentOrders } from '@/app/actions/orders'
import { DashboardOverview } from './dashboard-overview'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const [statsResult, topProductsResult, chartDataResult, recentOrdersResult] = await Promise.all([
    getDashboardStats(),
    getTopProducts(5),
    getSalesChartData(7),
    getRecentOrders(5),
  ])

  return (
    <DashboardOverview
      stats={statsResult.data}
      topProducts={topProductsResult.data || []}
      chartData={chartDataResult.data || []}
      recentOrders={recentOrdersResult.data || []}
    />
  )
}
