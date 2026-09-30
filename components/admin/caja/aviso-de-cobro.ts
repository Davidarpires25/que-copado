import { toast } from 'sonner'
import type { AvisoFactura } from '@/lib/facturas/al-cobrar'

/**
 * El aviso de un cobro o una anulación, con lo que pasó con la factura en la
 * misma línea: "Pago registrado · Factura C 0007-00000012".
 *
 * Lo que no salió (pendiente, rechazada, sin facturar) va como advertencia y
 * dura más: es una venta sin facturar, y quien cobra tiene que llegar a leerlo.
 * El cobro igual está hecho.
 */
export function avisarCobro(texto: string, factura?: AvisoFactura | null) {
  if (!factura) return toast.success(texto)
  if (factura.estado === 'emitida') return toast.success(`${texto} · ${factura.texto}`)
  if (factura.estado === 'en-curso') return toast.success(`${texto}. ${factura.texto}`)
  return toast.warning(`${texto}. ${factura.texto}`, { duration: 10_000 })
}
