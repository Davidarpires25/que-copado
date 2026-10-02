import type { SupabaseClient } from '@supabase/supabase-js'
import { ErrorArca, type ConfigArca } from '@/lib/arca/config'
import { ticketVigente } from '@/lib/arca/wsaa'
import { consultar, solicitarCae, ultimoAutorizado, NUMERO_NO_CORRELATIVO, TIPO, type Comprobante, type MensajeArca } from '@/lib/arca/wsfe'
import { estaCobrado } from '@/lib/types/database'

/**
 * Emitir la factura C de un pedido, o la nota de crédito C que la compensa
 * (change la-caja-emite-factura-c, decisiones 5 y 6).
 *
 * Tres reglas, cada una contra un problema concreto:
 *
 * 1. **Nunca dos comprobantes para lo mismo.** Una fila por pedido (índice
 *    único en la base) y, antes de hablar con ARCA, la fila se *toma*
 *    (`procesando_desde`): un segundo clic o un reintento concurrente
 *    encuentra la fila tomada y no pide otro número.
 * 2. **Una respuesta perdida no duplica.** El número que se pide se guarda
 *    *antes* de pedirlo. Si ARCA no contestó, el reintento consulta ese número:
 *    si ARCA lo tiene con este importe, era nuestro, y se guarda ese CAE.
 * 3. **ARCA caído no es un error de la caja.** Lo que no se pudo emitir queda
 *    pendiente, con el motivo en castellano, para reintentar.
 *
 * Escribe con la clave de servicio (`base`): las tablas de facturación no
 * aceptan escrituras de usuarios. Quien llama ya comprobó el permiso.
 */

/** Desde este total ARCA exige identificar al consumidor final (RG 5700/2025). */
export const TOPE_CONSUMIDOR_FINAL = 10_000_000

/** Cuántas veces se pide número de nuevo si otra emisión se metió en el medio. */
const INTENTOS_DE_NUMERO = 3

export interface DatosFiscales {
  activa: boolean
  razon_social: string
  cuit: string
  punto_venta: number | null
  domicilio_comercial: string
  ingresos_brutos: string
  inicio_actividades: string | null
  medios_automaticos: string[]
}

export interface FilaFactura {
  id: string
  order_id: string
  tipo: number
  estado: 'pendiente' | 'emitida' | 'rechazada'
  punto_venta: number | null
  numero: number | null
  cae: string | null
  cae_vence: string | null
  fecha: string
  total: number
  doc_tipo: number
  doc_nro: number
  asociada_a: string | null
  motivo: string | null
  intentos: number
  procesando_desde: string | null
  pedido_arca: { numero?: number } | null
}

export type ResultadoEmision =
  /** La facturación está apagada o sin datos: no se hizo nada, y está bien. */
  | { estado: 'apagada' }
  /** No corresponde emitir (pedido sin cobrar, sin factura que compensar…). */
  | { estado: 'no-corresponde'; motivo: string }
  /** Otra emisión del mismo comprobante está en curso. */
  | { estado: 'en-curso' }
  | { estado: 'emitida'; factura: FilaFactura }
  | { estado: 'pendiente' | 'rechazada'; motivo: string; factura: FilaFactura }

/** La fecha de hoy en Argentina, `yyyy-mm-dd` (lección 44: el servidor corre en UTC). */
export function hoyEnArgentina(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora)
}

/** Los datos fiscales, si la facturación está encendida y completa. */
export async function datosFiscalesActivos(base: SupabaseClient): Promise<(DatosFiscales & { punto_venta: number }) | null> {
  const { data } = await base.from('datos_fiscales').select('*').maybeSingle()
  const d = data as DatosFiscales | null
  if (!d?.activa || !d.cuit || !d.punto_venta) return null
  return d as DatosFiscales & { punto_venta: number }
}

/** Lo que ARCA dijo, en castellano y con su código para buscarlo. */
function explicar(observaciones: MensajeArca[]) {
  return observaciones.map((o) => `${o.mensaje} (código ${o.codigo})`).join(' · ') || 'ARCA rechazó el comprobante sin decir por qué.'
}

export function explicarError(e: unknown): string {
  if (e instanceof ErrorArca) {
    if (e.codigo === '600' && /relaciones/i.test(e.message)) {
      return 'ARCA no reconoce la delegación de esta CUIT: falta el paso 2 de la guía de alta.'
    }
    if (e.codigo === '11002') {
      return 'ARCA no habilita ese punto de venta para el sistema: tiene que ser uno creado como «Factura electrónica – Monotributo – Web Services» (paso 1 de la guía).'
    }
    if (e.codigo === 'coe.notAuthorized') {
      return 'ARCA no autoriza el certificado de esta instalación para facturar.'
    }
    return e.message
  }
  return e instanceof Error ? e.message : 'Error desconocido al facturar.'
}

type Tipo = typeof TIPO.facturaC | typeof TIPO.notaDeCreditoC

/**
 * Emite la factura C de un pedido cobrado, o la nota de crédito C de un pedido
 * anulado que tenía factura. Se puede llamar las veces que haga falta: si ya
 * está emitida, la devuelve; si quedó pendiente o rechazada, la reintenta.
 */
export async function emitir(
  base: SupabaseClient,
  config: ConfigArca | null,
  orderId: string,
  tipo: Tipo = TIPO.facturaC
): Promise<ResultadoEmision> {
  const datos = await datosFiscalesActivos(base)
  if (!datos) return { estado: 'apagada' }
  if (!config) {
    return { estado: 'no-corresponde', motivo: 'Esta instalación no tiene cargado el certificado de ARCA.' }
  }

  const { data: pedido } = await base.from('orders').select('id, total, status').eq('id', orderId).maybeSingle()
  if (!pedido) return { estado: 'no-corresponde', motivo: 'El pedido no existe.' }

  // Qué se emite y por cuánto.
  let total = Number(pedido.total)
  let asociado: Comprobante['asociado']
  let asociadaA: string | null = null
  if (tipo === TIPO.facturaC) {
    if (!estaCobrado(pedido)) return { estado: 'no-corresponde', motivo: 'El pedido todavía no se cobró.' }
  } else {
    if (pedido.status !== 'cancelado') return { estado: 'no-corresponde', motivo: 'El pedido no está anulado.' }
    const { data: factura } = await base
      .from('facturas')
      .select('*')
      .eq('order_id', orderId)
      .eq('tipo', TIPO.facturaC)
      .eq('estado', 'emitida')
      .maybeSingle()
    const f = factura as FilaFactura | null
    if (!f) return { estado: 'no-corresponde', motivo: 'El pedido no tiene factura emitida que compensar.' }
    total = Number(f.total)
    asociadaA = f.id
    asociado = { tipo: TIPO.facturaC, puntoVenta: f.punto_venta!, numero: f.numero!, cuit: datos.cuit, fecha: f.fecha }
  }
  if (!(total > 0)) return { estado: 'no-corresponde', motivo: 'El pedido no tiene importe para facturar.' }
  if (total >= TOPE_CONSUMIDOR_FINAL) {
    return {
      estado: 'no-corresponde',
      motivo: `Desde ${TOPE_CONSUMIDOR_FINAL.toLocaleString('es-AR')} pesos ARCA pide identificar al cliente, y esta versión todavía no lo hace.`,
    }
  }

  // La fila: la que ya existe para este pedido y tipo, o una nueva.
  const { data: existentes } = await base
    .from('facturas')
    .select('*')
    .eq('order_id', orderId)
    .eq('tipo', tipo)
    .order('created_at', { ascending: false })
    .limit(1)
  let fila = (existentes?.[0] as FilaFactura | undefined) ?? null
  if (fila?.estado === 'emitida') return { estado: 'emitida', factura: fila }

  const hoy = hoyEnArgentina()
  if (!fila) {
    const { data: nueva, error } = await base
      .from('facturas')
      .insert({ order_id: orderId, tipo, fecha: hoy, total, asociada_a: asociadaA })
      .select('*')
      .single()
    // 23505: otra emisión la creó en este mismo momento.
    if (error?.code === '23505') return { estado: 'en-curso' }
    if (error || !nueva) throw new Error(`No se pudo registrar la factura: ${error?.message}`)
    fila = nueva as FilaFactura
  }

  // Tomarla: si otra emisión la tiene, no se pide otro número.
  const { data: tomadas, error: errorToma } = await base.rpc('tomar_factura', { p_id: fila.id })
  // 23505: al volver a "pendiente" chocó con otra fila viva del mismo pedido.
  if (errorToma?.code === '23505') return { estado: 'en-curso' }
  if (errorToma) throw new Error(`No se pudo tomar la factura: ${errorToma.message}`)
  const tomada = (tomadas as FilaFactura[] | null)?.[0]
  if (!tomada) return { estado: 'en-curso' }
  fila = tomada as FilaFactura

  const guardar = async (cambios: Record<string, unknown>) => {
    const { data, error } = await base
      .from('facturas')
      .update({ ...cambios, procesando_desde: null, updated_at: new Date().toISOString() })
      .eq('id', fila!.id)
      .select('*')
      .single()
    if (error) throw new Error(`No se pudo guardar la factura: ${error.message}`)
    return data as FilaFactura
  }

  try {
    const cred = { ticket: await ticketVigente(base, config), cuit: datos.cuit }
    const puntoVenta = datos.punto_venta

    // Un intento anterior pudo quedar sin respuesta con el comprobante
    // autorizado del lado de ARCA: si ese número está y es por este importe,
    // es este comprobante.
    const numeroPrevio = fila.pedido_arca?.numero
    if (numeroPrevio) {
      const previo = await consultar(config, cred, puntoVenta, tipo, numeroPrevio)
      if (previo && Math.abs(previo.total - total) < 0.005) {
        const factura = await guardar({
          estado: 'emitida',
          punto_venta: puntoVenta,
          numero: numeroPrevio,
          cae: previo.cae,
          cae_vence: previo.caeVence,
          fecha: previo.fecha || fila.fecha,
          motivo: null,
          respuesta_arca: previo,
        })
        return { estado: 'emitida', factura }
      }
    }

    for (let intento = 0; intento < INTENTOS_DE_NUMERO; intento++) {
      const numero = (await ultimoAutorizado(config, cred, puntoVenta, tipo)) + 1
      const comprobante: Comprobante = { tipo, puntoVenta, numero, fecha: hoy, total, docTipo: 99, docNro: 0, asociado }
      // Antes de pedirlo: si la respuesta se pierde, este número es el que
      // hay que consultar.
      await base.from('facturas').update({ pedido_arca: comprobante, fecha: hoy }).eq('id', fila.id)

      const r = await solicitarCae(config, cred, comprobante)
      if (r.resultado === 'aprobado') {
        const factura = await guardar({
          estado: 'emitida',
          punto_venta: puntoVenta,
          numero,
          cae: r.cae,
          cae_vence: r.caeVence,
          fecha: hoy,
          motivo: null,
          respuesta_arca: r,
        })
        return { estado: 'emitida', factura }
      }
      if (r.observaciones.some((o) => o.codigo === NUMERO_NO_CORRELATIVO)) continue

      const motivo = explicar(r.observaciones)
      const factura = await guardar({ estado: 'rechazada', motivo, respuesta_arca: r, pedido_arca: null })
      return { estado: 'rechazada', motivo, factura }
    }

    const motivo = 'Otra emisión tomó el número tres veces seguidas. Probá de nuevo.'
    const factura = await guardar({ estado: 'pendiente', motivo })
    return { estado: 'pendiente', motivo, factura }
  } catch (e) {
    const motivo = explicarError(e)
    const factura = await guardar({ estado: 'pendiente', motivo })
    return { estado: 'pendiente', motivo, factura }
  }
}

/**
 * ¿Este cobro se factura solo? Sí si alguno de los medios usados está entre
 * los que el local eligió (como Fudo, por medio de pago).
 */
export function seFacturaSolo(datos: Pick<DatosFiscales, 'medios_automaticos'>, mediosUsados: string[]) {
  return mediosUsados.some((m) => datos.medios_automaticos.includes(m))
}
