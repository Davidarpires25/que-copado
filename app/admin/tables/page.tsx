import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { TablesDashboard } from './tables-dashboard'
import type { RestaurantTable } from '@/lib/types/tables'

export default async function TablesPage() {
  const user = await getAuthUser()
  if (!user) {
    redirect('/admin/login')
  }

  const adminSupabase = await createAdminClient()
  const { data: tables } = await adminSupabase
    .from('restaurant_tables')
    .select('*')
    .order('sort_order', { ascending: true })

  return <TablesDashboard initialTables={(tables as RestaurantTable[]) ?? []} />
}
