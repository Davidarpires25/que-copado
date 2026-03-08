import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getFullStockData,
  getStockAlerts,
  getAllTheoreticalStocks,
  getStockForecast,
  getReservedStock,
  getConsumptionReport,
} from '@/app/actions/stock'
import { StockDashboard } from '@/components/admin/stock/stock-dashboard'

export default async function StockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const adminSupabase = await createAdminClient()

  const [stockResult, alertsResult, theoreticalResult, elaboradoResult, forecastResult, reservedResult, consumptionResult] =
    await Promise.all([
      getFullStockData(),
      getStockAlerts(),
      getAllTheoreticalStocks(),
      adminSupabase
        .from('products')
        .select('*')
        .eq('product_type', 'elaborado')
        .eq('is_active', true)
        .order('name'),
      getStockForecast('30d'),
      getReservedStock(),
      getConsumptionReport('30d'),
    ])

  return (
    <StockDashboard
      initialIngredients={stockResult.data?.ingredients ?? []}
      initialProducts={stockResult.data?.products ?? []}
      initialAlerts={alertsResult.data ?? []}
      initialMovements={[]}
      initialElaboradoProducts={elaboradoResult.data ?? []}
      initialTheoreticalStocks={theoreticalResult.data ?? {}}
      initialForecast={forecastResult.data ?? []}
      initialReserved={reservedResult.data ?? []}
      initialConsumption={consumptionResult.data ?? []}
    />
  )
}
