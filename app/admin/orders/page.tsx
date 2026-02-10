import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrders } from '@/app/actions/orders'
import { OrdersTable } from './orders-table'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: orders } = await getOrders()

  return <OrdersTable initialOrders={orders || []} />
}
