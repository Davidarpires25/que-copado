import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { getOrders } from '@/app/actions/orders'
import { orderDateRange, type DateFilter } from '@/lib/utils/order-date-range'
import { OrdersTable } from './orders-table'

/**
 * Periodo con el que abre la pantalla. La tabla arranca mostrando lo mismo, y
 * desde ahi el cliente pide otros rangos por su cuenta.
 */
const PERIODO_INICIAL: DateFilter = 'today'

export default async function OrdersPage() {
  const user = await getAuthUser()

  if (!user) {
    redirect('/admin/login')
  }

  const rango = orderDateRange(PERIODO_INICIAL)
  const { data: orders } = await getOrders(
    rango ? { dateFrom: rango.dateFrom, dateTo: rango.dateTo } : undefined
  )

  return <OrdersTable initialOrders={orders || []} initialDateFilter={PERIODO_INICIAL} />
}
