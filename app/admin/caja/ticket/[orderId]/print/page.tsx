import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { TicketPrintLayout } from '@/components/admin/caja/ticket-print-layout'
import type { Order } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ cash?: string }>
}

export default async function TicketPrintPage({ params, searchParams }: PageProps) {
  const { orderId } = await params
  const { cash } = await searchParams

  const supabase = await createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) notFound()

  // Try to get normalized items from order_items, fallback to JSON items
  const { data: orderItemRows } = await supabase
    .from('order_items')
    .select('product_name, quantity, product_price, status')
    .eq('order_id', orderId)
    .eq('status', 'pendiente')

  const items = orderItemRows && orderItemRows.length > 0
    ? orderItemRows.map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        price: i.product_price,
      }))
    : (Array.isArray(order.items)
        ? (order.items as { name?: string; quantity?: number; price?: number }[]).map((i) => ({
            name: i.name ?? '',
            quantity: i.quantity ?? 1,
            price: i.price ?? 0,
          }))
        : [])

  const cashReceived = cash ? parseFloat(cash) : undefined

  return (
    <html>
      <head>
        <title>Ticket #{orderId.slice(-8).toUpperCase()}</title>
        <style>{`
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; }
          }
          body { font-family: 'Courier New', monospace; }
        `}</style>
      </head>
      <body>
        <TicketPrintLayout
          order={order as Order}
          items={items}
          cashReceived={cashReceived}
        />
      </body>
    </html>
  )
}
