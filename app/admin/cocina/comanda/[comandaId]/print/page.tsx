import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ComandaPrintLayout } from '@/components/admin/cocina/comanda-print-layout'
import type { Comanda, Station, ComandaStatus } from '@/lib/types/comandas'

interface PageProps {
  params: Promise<{ comandaId: string }>
}

export default async function ComandaPrintPage({ params }: PageProps) {
  const { comandaId } = await params
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('comandas')
    .select(`
      *,
      comanda_items (*),
      orders:order_id (order_type, table_number)
    `)
    .eq('id', comandaId)
    .single()

  if (error || !data) notFound()

  const order = data.orders as { order_type: string | null; table_number: number | null } | null

  const comanda: Comanda & { order_type: string | null; table_number: number | null } = {
    id: data.id,
    order_id: data.order_id,
    station: data.station as Station,
    status: data.status as ComandaStatus,
    notes: data.notes,
    created_at: data.created_at,
    updated_at: data.updated_at,
    items: (data.comanda_items ?? []).map((ci: Record<string, unknown>) => ({
      id: ci.id as string,
      comanda_id: ci.comanda_id as string,
      order_item_id: ci.order_item_id as string | null,
      product_name: ci.product_name as string,
      quantity: ci.quantity as number,
      sale_tag: ci.sale_tag as string | null,
      notes: ci.notes as string | null,
    })),
    order_type: order?.order_type ?? null,
    table_number: order?.table_number ?? null,
  }

  return (
    <html>
      <head>
        <title>Comanda - {comanda.station} #{comanda.id.slice(-6).toUpperCase()}</title>
        <style>{`
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; }
          }
          body { font-family: 'Courier New', monospace; }
        `}</style>
      </head>
      <body>
        <ComandaPrintLayout comanda={comanda} />
      </body>
    </html>
  )
}
