import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { createClient } from '@/lib/supabase/server'
import { getActiveSession, getSessionOrders } from '@/app/actions/cash-register'
import { getPendingOrders } from '@/app/actions/pos-orders'
import { getStockAlerts } from '@/app/actions/stock'
import { getCurrentUserInfo } from '@/app/actions/profile'
import { CajaDashboard } from './caja-dashboard'

export default async function CajaPage() {
  const supabase = await createClient()
  const user = await getAuthUser()

  if (!user) {
    redirect('/admin/login')
  }

  // La sesion abierta se pide junto con todo lo que NO depende de ella. Antes
  // era una espera aparte y bloqueante: seis de las ocho consultas de abajo no
  // la necesitan, y estaban esperandola igual.
  //
  // Cada viaje a Supabase cuesta ~160ms fijos —medido sobre los logs, el p50 es
  // el mismo para una consulta trivial que para una pesada— asi que una ola de
  // menos es una ola de menos, sin importar que se pida.
  const [sessionResult, productsResult, categoriesResult, tablesResult, activeZonesResult, stockAlertsResult, meResult] = await Promise.all([
    getActiveSession(),
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
    supabase
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    getStockAlerts(),
    getCurrentUserInfo(),
  ])

  const session = sessionResult.data

  // Estas dos si necesitan el id de la sesion, asi que van despues. Juntas.
  const [pendingOrdersResult, sessionOrdersResult] = session
    ? await Promise.all([getPendingOrders(session.id), getSessionOrders(session.id)])
    : [{ data: [], error: null }, { data: [], error: null }]

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
