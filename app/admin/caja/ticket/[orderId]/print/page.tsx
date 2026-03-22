import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { TicketPrintLayout } from '@/components/admin/caja/ticket-print-layout'
import type { Order } from '@/lib/types/database'
interface PageProps {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ cash?: string; kitchen?: string; tag?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { orderId } = await params
  const { kitchen } = await searchParams
  const isKitchen = kitchen === '1'
  return {
    title: isKitchen
      ? `Cocina #${orderId.slice(-8).toUpperCase()}`
      : `Ticket #${orderId.slice(-8).toUpperCase()}`,
  }
}

export default async function TicketPrintPage({ params, searchParams }: PageProps) {
  const { orderId } = await params
  const { cash, kitchen, tag } = await searchParams
  const isKitchen = kitchen === '1'
  const guestTag = tag ?? null

  const supabase = await createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) notFound()

  // Fetch order_items with product_type and sale_tag for filtering
  const { data: orderItemRows } = await supabase
    .from('order_items')
    .select('product_name, quantity, product_price, notes, status, sale_tag, products(product_type)')
    .eq('order_id', orderId)
    .neq('status', 'cancelado')

  let items: { name: string; quantity: number; price: number; notes?: string | null }[] = []

  if (orderItemRows && orderItemRows.length > 0) {
    items = orderItemRows
      .filter((i) => {
        if (isKitchen) {
          const product = i.products as unknown as { product_type: string | null } | null
          return product?.product_type === 'elaborado'
        }
        if (guestTag) return i.sale_tag === guestTag
        return true
      })
      .map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        price: i.product_price,
        notes: i.notes ?? null,
      }))
  } else if (!isKitchen && !guestTag) {
    // Fallback to JSON items only for full customer ticket
    items = Array.isArray(order.items)
      ? (order.items as { name?: string; quantity?: number; price?: number }[]).map((i) => ({
          name: i.name ?? '',
          quantity: i.quantity ?? 1,
          price: i.price ?? 0,
        }))
      : []
  }

  const cashReceived = cash ? parseFloat(cash) : undefined

  return (
    <TicketPrintLayout
      order={order as Order}
      items={items}
      cashReceived={cashReceived}
      isKitchen={isKitchen}
      guestName={guestTag ?? undefined}
    />
  )
}
