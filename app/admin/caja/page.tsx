import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveSession, getSessionOrders } from '@/app/actions/cash-register'
import { getPendingOrders } from '@/app/actions/pos-orders'
import { getStockAlerts } from '@/app/actions/stock'
import { getCurrentUserInfo } from '@/app/actions/profile'
import { CajaDashboard } from './caja-dashboard'

export default async function CajaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Session first — needed to fetch pending orders
  const sessionResult = await getActiveSession()
  const session = sessionResult.data

  // Fetch remaining data in parallel, including pending orders if session exists
  const [productsResult, categoriesResult, tablesResult, pendingOrdersResult, activeZonesResult, sessionOrdersResult, stockAlertsResult, meResult] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_half_configs(*)')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('categories')
      .select('*')
      .order('sort_order'),
    supabase
      .from('restaurant_tables')
      .select(`
        *,
        orders:current_order_id (
          *,
          order_items (*)
        )
      `)
      .eq('is_active', true)
      .order('sort_order'),
    session ? getPendingOrders(session.id) : Promise.resolve({ data: [], error: null }),
    supabase
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    session ? getSessionOrders(session.id) : Promise.resolve({ data: [], error: null }),
    getStockAlerts(),
    getCurrentUserInfo(),
  ])

  return (
    <CajaDashboard
      products={productsResult.data || []}
      categories={categoriesResult.data || []}
      initialSession={session}
      initialTables={tablesResult.data || []}
      initialPendingOrders={pendingOrdersResult.data || []}
      initialDeliveryZones={activeZonesResult.data || []}
      initialSessionOrders={sessionOrdersResult.data || []}
      stockAlertCount={stockAlertsResult.data?.length ?? 0}
      currentUser={meResult}
    />
  )
}
