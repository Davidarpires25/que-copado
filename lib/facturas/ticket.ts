import type { SupabaseClient } from '@supabase/supabase-js'
import { textoDelQr } from '@/lib/arca/qr'
import { TIPO } from '@/lib/arca/wsfe'
import { NOMBRE_TIPO, numeroDeComprobante } from './formato'
export { LEYENDA_NO_FACTURA } from './formato'
import type { DatosFiscales, FilaFactura } from './emitir'

/**
 * Lo que el papel tiene que decir cuando el ticket es la factura (change
 * la-caja-emite-factura-c, decisión 8): el emisor, el comprobante, el CAE y el
 * QR. Viaja dentro del ticket del cliente (`print_jobs.data.factura`): un
 * puente de impresión que no lo conoce lo ignora y sigue imprimiendo el ticket
 * de siempre.
 */
export interface FacturaDelTicket {
  /** "Factura C" */
  tipo: string
  /** Código de ARCA del comprobante, que va impreso junto a la letra: "Cód. 011". */
  codigo: string
  /** "0007-00000012" */
  numero: string
  /** dd/mm/aaaa */
  fecha: string
  cae: string
  /** dd/mm/aaaa */
  caeVence: string
  receptor: string
  emisor: {
    razonSocial: string
    cuit: string
    domicilio: string
    ingresosBrutos: string
    /** dd/mm/aaaa */
    inicioActividades: string
    condicion: string
  }
  /** El texto a codificar en el QR (RG 4892). */
  qr: string
}

const ddmmaaaa = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '')

/** "20111111112" → "20-11111111-2", como se escribe una CUIT. */
export function cuitConGuiones(cuit: string) {
  return cuit.length === 11 ? `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}` : cuit
}

export function armarFacturaDelTicket(f: FilaFactura, datos: DatosFiscales): FacturaDelTicket | null {
  if (f.estado !== 'emitida' || !f.punto_venta || !f.numero || !f.cae) return null
  return {
    tipo: NOMBRE_TIPO[f.tipo] ?? 'Comprobante',
    codigo: String(f.tipo).padStart(3, '0'),
    numero: numeroDeComprobante(f.punto_venta, f.numero),
    fecha: ddmmaaaa(f.fecha),
    cae: f.cae,
    caeVence: ddmmaaaa(f.cae_vence),
    receptor: 'Consumidor Final',
    emisor: {
      razonSocial: datos.razon_social,
      cuit: cuitConGuiones(datos.cuit),
      domicilio: datos.domicilio_comercial,
      ingresosBrutos: datos.ingresos_brutos || 'No informado',
      inicioActividades: ddmmaaaa(datos.inicio_actividades),
      condicion: 'Responsable Monotributo',
    },
    qr: textoDelQr({
      fecha: f.fecha,
      cuit: datos.cuit,
      puntoVenta: f.punto_venta,
      tipo: f.tipo,
      numero: f.numero,
      total: Number(f.total),
      docTipo: f.doc_tipo,
      docNro: Number(f.doc_nro),
      cae: f.cae,
    }),
  }
}

/**
 * La factura emitida de un pedido, lista para el papel, o `null`. Lee con la
 * clave de servicio: quien imprime puede no tener permiso de ver los datos
 * fiscales, y el ticket igual los tiene que llevar.
 */
export async function facturaDelPedido(base: SupabaseClient, orderId: string): Promise<FacturaDelTicket | null> {
  const [{ data: factura }, { data: datos }] = await Promise.all([
    base.from('facturas').select('*').eq('order_id', orderId).eq('tipo', TIPO.facturaC).eq('estado', 'emitida').maybeSingle(),
    base.from('datos_fiscales').select('*').maybeSingle(),
  ])
  if (!factura || !datos) return null
  return armarFacturaDelTicket(factura as FilaFactura, datos as DatosFiscales)
}

/** Lo mismo, por el id de la factura (la página imprimible). */
export async function facturaPorId(
  base: SupabaseClient,
  facturaId: string
): Promise<{ factura: FacturaDelTicket; orderId: string } | null> {
  const [{ data: fila }, { data: datos }] = await Promise.all([
    base.from('facturas').select('*').eq('id', facturaId).maybeSingle(),
    base.from('datos_fiscales').select('*').maybeSingle(),
  ])
  if (!fila || !datos) return null
  const factura = armarFacturaDelTicket(fila as FilaFactura, datos as DatosFiscales)
  return factura ? { factura, orderId: (fila as FilaFactura).order_id } : null
}

/**
 * Si el local factura desde el sistema. Con la facturación encendida, un
 * ticket que no es la factura —la cuenta antes de cobrar, un cobro que no se
 * facturó, el de un comensal— lleva "Documento no válido como factura" (RG
 * 1415), para que no se confunda con la factura de verdad. Apagada, el ticket
 * queda como siempre.
 */
export async function facturacionEncendida(base: SupabaseClient): Promise<boolean> {
  const { data } = await base.from('datos_fiscales').select('activa').maybeSingle()
  return Boolean(data?.activa)
}
