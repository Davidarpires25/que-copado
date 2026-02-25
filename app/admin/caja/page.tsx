import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveSession } from '@/app/actions/cash-register'
import { CajaDashboard } from './caja-dashboard'

export default async function CajaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Fetch products, categories, active session, and tables in parallel
  const [productsResult, categoriesResult, sessionResult, tablesResult] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('categories')
      .select('*')
      .order('sort_order'),
    getActiveSession(),
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
  ])

  return (
    <CajaDashboard
      products={productsResult.data || []}
      categories={categoriesResult.data || []}
      initialSession={sessionResult.data}
      initialTables={tablesResult.data || []}
    />
  )
}
