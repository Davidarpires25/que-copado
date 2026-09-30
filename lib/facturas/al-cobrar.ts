import { after } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { configArca } from '@/lib/arca/config'
import { TIPO } from '@/lib/arca/wsfe'
import { devError } from '@/lib/server/logger'
import { datosFiscalesActivos, emitir, seFacturaSolo, type ResultadoEmision } from './emitir'
import { nombreDeComprobante } from './formato'

/**
 * La factura que sigue a un cobro, y la nota de crédito que sigue a una
 * anulación (change la-caja-emite-factura-c, decisión 6).
 *
 * El cobro ya terminó cuando se llega acá: nada de esto lo deshace ni lo
 * frena. Se espera a ARCA un rato corto para que, en el caso normal, el cajero
 * ya vea el número; si ARCA tarda más, la emisión sigue después de responder
 * (`after`) y el cajero la ve en el Historial.
 *
 * No es una acción del servidor: la llaman las acciones de cobro y de
 * anulación, que ya comprobaron quién es el usuario.
 */

/** Cuánto espera el cobro a ARCA antes de devolverle el control al cajero. */
const PLAZO_EN_EL_COBRO_MS = 6_000

/** Lo que se le dice al cajero de la factura, en una línea. */
export interface AvisoFactura {
  estado: 'emitida' | 'pendiente' | 'rechazada' | 'en-curso'
  texto: string
}

function aviso(r: ResultadoEmision): AvisoFactura | null {
  switch (r.estado) {
    case 'emitida':
      return { estado: 'emitida', texto: nombreDeComprobante(r.factura) }
    case 'pendiente':
      return { estado: 'pendiente', texto: `La factura quedó pendiente: ${r.motivo}` }
    case 'rechazada':
      return { estado: 'rechazada', texto: `ARCA rechazó la factura: ${r.motivo}` }
    case 'en-curso':
      return { estado: 'en-curso', texto: 'La factura se está emitiendo: la vas a ver en el Historial.' }
    case 'no-corresponde':
      return { estado: 'pendiente', texto: `No se facturó: ${r.motivo}` }
    case 'apagada':
      return null
  }
}

async function emitirConPlazo(orderId: string, tipo: typeof TIPO.facturaC | typeof TIPO.notaDeCreditoC) {
  const base = createServiceRoleClient()
  const emision = emitir(base, configArca(), orderId, tipo).catch((e): ResultadoEmision => {
    devError('[facturas] emitir:', e)
    return { estado: 'no-corresponde', motivo: 'Falló el registro de la factura. Reintentá desde el Historial.' }
  })
  const aTiempo = await Promise.race([
    emision,
    new Promise<null>((ok) => setTimeout(() => ok(null), PLAZO_EN_EL_COBRO_MS)),
  ])
  if (aTiempo) return aviso(aTiempo)
  after(async () => {
    await emision
  })
  return aviso({ estado: 'en-curso' })
}

/** Después de cobrar: factura si alguno de los medios usados se factura solo. */
export async function facturarAlCobrar(orderId: string, mediosUsados: string[]): Promise<AvisoFactura | null> {
  try {
    const datos = await datosFiscalesActivos(createServiceRoleClient())
    if (!datos || !seFacturaSolo(datos, mediosUsados)) return null
    return await emitirConPlazo(orderId, TIPO.facturaC)
  } catch (e) {
    // El cobro está hecho: un problema de la facturación no puede volverlo error.
    devError('[facturas] facturarAlCobrar:', e)
    return { estado: 'pendiente', texto: 'No se pudo facturar. Reintentá desde el Historial.' }
  }
}

/** Después de anular: nota de crédito si el pedido tenía factura emitida. */
export async function compensarAlAnular(orderId: string): Promise<AvisoFactura | null> {
  try {
    const base = createServiceRoleClient()
    const { data: factura } = await base
      .from('facturas')
      .select('id')
      .eq('order_id', orderId)
      .eq('tipo', TIPO.facturaC)
      .eq('estado', 'emitida')
      .maybeSingle()
    if (!factura) return null
    return await emitirConPlazo(orderId, TIPO.notaDeCreditoC)
  } catch (e) {
    devError('[facturas] compensarAlAnular:', e)
    return { estado: 'pendiente', texto: 'No se pudo emitir la nota de crédito. Reintentá desde el Historial.' }
  }
}
