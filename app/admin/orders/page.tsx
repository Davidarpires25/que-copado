import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { getOrders } from '@/app/actions/orders'
import { OrdersTable } from './orders-table'

export default async function OrdersPage() {
  const user = await getAuthUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: orders } = await getOrders()

  return <OrdersTable initialOrders={orders || []} />
}
