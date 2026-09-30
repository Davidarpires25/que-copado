import { notFound, redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/server/profile'
import { facturaPorId } from '@/lib/facturas/ticket'

/**
 * Una factura para imprimir desde el navegador (change
 * la-caja-emite-factura-c, decisión 8): sirve sin el puente de impresión y
 * para reimprimir. El papel es el ticket del pedido, que ya lleva la factura
 * cuando la hay; acá solo se llega a él.
 */
export default async function FacturaPrintPage({ params }: { params: Promise<{ facturaId: string }> }) {
  if (await requirePermission('caja.view')) notFound()
  const { facturaId } = await params
  const encontrada = await facturaPorId(createServiceRoleClient(), facturaId)
  if (!encontrada) notFound()
  redirect(`/admin/caja/ticket/${encontrada.orderId}/print`)
}
