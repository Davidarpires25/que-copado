import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import {
  getHourlySales,
  getWeekdaySales,
  getCancellationRate,
  getTopProductsByRevenue,
  getConfigurableSalesChart,
  getZoneSales,
  getShippingAnalysis,
  getPaymentMethodDistribution,
  getProfitabilityReport,
} from '@/app/actions/analytics'

const AnalyticsDashboard = dynamic(
  () => import('./analytics-dashboard').then((mod) => ({ default: mod.AnalyticsDashboard })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
)

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Fetch all initial data in parallel with default periods
  const [
    hourlySalesResult,
    weekdaySalesResult,
    cancellationResult,
    topProductsResult,
    salesChartResult,
    zoneSalesResult,
    shippingResult,
    paymentMethodResult,
    profitabilityResult,
  ] = await Promise.all([
    getHourlySales('30d'),
    getWeekdaySales('30d'),
    getCancellationRate('30d'),
    getTopProductsByRevenue('30d', 10),
    getConfigurableSalesChart('7d'),
    getZoneSales('30d'),
    getShippingAnalysis('30d'),
    getPaymentMethodDistribution('30d'),
    getProfitabilityReport('30d'),
  ])

  return (
    <AnalyticsDashboard
      initialHourlySales={hourlySalesResult.data || []}
      initialWeekdaySales={weekdaySalesResult.data || []}
      initialCancellation={cancellationResult.data}
      initialTopProducts={topProductsResult.data || []}
      initialSalesChart={salesChartResult.data || []}
      initialZoneSales={zoneSalesResult.data || []}
      initialShipping={shippingResult.data}
      initialPaymentMethods={paymentMethodResult.data || []}
      initialProfitability={profitabilityResult.data}
    />
  )
}
