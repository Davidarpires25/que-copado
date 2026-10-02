import { ErrorArca, type ConfigArca } from './config'
import type { TicketDeAcceso } from './wsaa'
import { lista, pedirSoap, x } from './soap'

/**
 * Factura electrónica (WSFEv1): las cuatro operaciones que usa la caja.
 *
 * Los sobres siguen el Manual del desarrollador WSFEv1 v4.7 (ver "Datos
 * verificados" en design.md). Cada pedido lleva el ticket del proveedor y la
 * CUIT **representada**: la del local, que delegó el servicio en él.
 */

const NS = 'http://ar.gov.afip.dif.FEV1/'

export const TIPO = { facturaC: 11, notaDeCreditoC: 13 } as const

/** Un mensaje de ARCA tal como vino: código y texto. */
export interface MensajeArca {
  codigo: string
  mensaje: string
}

interface Credenciales {
  ticket: TicketDeAcceso
  /** La CUIT del local. */
  cuit: string
}

function sobre(operacion: string, adentro: string) {
  return (
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${NS}">` +
    `<soapenv:Header/><soapenv:Body><ar:${operacion}>${adentro}</ar:${operacion}></soapenv:Body></soapenv:Envelope>`
  )
}

function auth({ ticket, cuit }: Credenciales) {
  return `<ar:Auth><ar:Token>${x(ticket.token)}</ar:Token><ar:Sign>${x(ticket.firma)}</ar:Sign><ar:Cuit>${x(cuit)}</ar:Cuit></ar:Auth>`
}

async function operar(config: ConfigArca, operacion: string, adentro: string) {
  const cuerpo = await pedirSoap(config.urlWsfe, NS + operacion, sobre(operacion, adentro))
  const resultado = (cuerpo[`${operacion}Response`] as Record<string, unknown> | undefined)?.[`${operacion}Result`]
  if (!resultado || typeof resultado !== 'object') throw new ErrorArca('red', `ARCA no devolvió el resultado de ${operacion}.`)
  return resultado as Record<string, unknown>
}

function mensajes(nodo: unknown, hijo: string): MensajeArca[] {
  const contenedor = nodo as Record<string, unknown> | undefined
  return lista(contenedor?.[hijo] as Record<string, unknown> | Record<string, unknown>[] | undefined).map((m) => ({
    codigo: String(m.Code ?? ''),
    mensaje: String(m.Msg ?? ''),
  }))
}

/** Errores generales de la operación: si hay, no se procesó nada. */
function fallaGeneral(resultado: Record<string, unknown>) {
  const errores = mensajes(resultado.Errors, 'Err')
  if (errores.length > 0) {
    const [primero] = errores
    throw new ErrorArca('arca', errores.map((e) => `${e.codigo}: ${e.mensaje}`).join(' · '), primero.codigo)
  }
}

/** `yyyymmdd` → `yyyy-mm-dd`. */
function fechaIso(f: unknown) {
  const s = String(f ?? '')
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null
}

// ─── Operaciones ────────────────────────────────────────────────────────────

/** ¿ARCA está? No necesita ticket. */
export async function estado(config: ConfigArca) {
  const r = await operar(config, 'FEDummy', '')
  return { app: String(r.AppServer ?? ''), base: String(r.DbServer ?? ''), autenticacion: String(r.AuthServer ?? '') }
}

/** El último número autorizado para ese punto de venta y tipo (0 si no hay ninguno). */
export async function ultimoAutorizado(config: ConfigArca, cred: Credenciales, puntoVenta: number, tipo: number) {
  const r = await operar(
    config,
    'FECompUltimoAutorizado',
    `${auth(cred)}<ar:PtoVta>${puntoVenta}</ar:PtoVta><ar:CbteTipo>${tipo}</ar:CbteTipo>`
  )
  fallaGeneral(r)
  return Number(r.CbteNro ?? 0)
}

export interface Comprobante {
  tipo: number
  puntoVenta: number
  numero: number
  /** `yyyy-mm-dd`, en hora de Argentina. */
  fecha: string
  total: number
  docTipo: number
  docNro: number
  /** La factura que compensa una nota de crédito. */
  asociado?: { tipo: number; puntoVenta: number; numero: number; cuit: string; fecha: string }
}

/** Importe como lo pide ARCA: punto decimal y dos decimales. */
function importe(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2)
}

/**
 * El detalle de una factura o nota de crédito C.
 *
 * La C no discrimina IVA: el neto es el total, y IVA, no gravado, exento y
 * tributos van en cero. Concepto 1 (productos): una comida es un producto, y
 * así no se informan fechas de servicio. Condición del receptor 5
 * (consumidor final): se manda siempre, aunque hoy sea opcional (RG 5616).
 */
export function detalle(c: Comprobante) {
  const asociado = c.asociado
    ? `<ar:CbtesAsoc><ar:CbteAsoc><ar:Tipo>${c.asociado.tipo}</ar:Tipo><ar:PtoVta>${c.asociado.puntoVenta}</ar:PtoVta>` +
      `<ar:Nro>${c.asociado.numero}</ar:Nro><ar:Cuit>${x(c.asociado.cuit)}</ar:Cuit>` +
      `<ar:CbteFch>${c.asociado.fecha.replace(/-/g, '')}</ar:CbteFch></ar:CbteAsoc></ar:CbtesAsoc>`
    : ''
  return (
    `<ar:FeCAEReq><ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${c.puntoVenta}</ar:PtoVta><ar:CbteTipo>${c.tipo}</ar:CbteTipo></ar:FeCabReq>` +
    '<ar:FeDetReq><ar:FECAEDetRequest>' +
    '<ar:Concepto>1</ar:Concepto>' +
    `<ar:DocTipo>${c.docTipo}</ar:DocTipo><ar:DocNro>${c.docNro}</ar:DocNro>` +
    `<ar:CbteDesde>${c.numero}</ar:CbteDesde><ar:CbteHasta>${c.numero}</ar:CbteHasta>` +
    `<ar:CbteFch>${c.fecha.replace(/-/g, '')}</ar:CbteFch>` +
    `<ar:ImpTotal>${importe(c.total)}</ar:ImpTotal><ar:ImpTotConc>0.00</ar:ImpTotConc>` +
    `<ar:ImpNeto>${importe(c.total)}</ar:ImpNeto><ar:ImpOpEx>0.00</ar:ImpOpEx>` +
    '<ar:ImpTrib>0.00</ar:ImpTrib><ar:ImpIVA>0.00</ar:ImpIVA>' +
    '<ar:MonId>PES</ar:MonId><ar:MonCotiz>1</ar:MonCotiz>' +
    '<ar:CondicionIVAReceptorId>5</ar:CondicionIVAReceptorId>' +
    asociado +
    '</ar:FECAEDetRequest></ar:FeDetReq></ar:FeCAEReq>'
  )
}

export type Autorizacion =
  | { resultado: 'aprobado'; cae: string; caeVence: string; observaciones: MensajeArca[] }
  | { resultado: 'rechazado'; observaciones: MensajeArca[] }

/** Pide el CAE de un comprobante. */
export async function solicitarCae(config: ConfigArca, cred: Credenciales, c: Comprobante): Promise<Autorizacion> {
  const r = await operar(config, 'FECAESolicitar', `${auth(cred)}${detalle(c)}`)
  fallaGeneral(r)
  const [det] = lista((r.FeDetResp as Record<string, unknown> | undefined)?.FECAEDetResponse as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined)
  if (!det) throw new ErrorArca('red', 'ARCA no devolvió el detalle del comprobante.')
  const observaciones = mensajes(det.Observaciones, 'Obs')
  if (det.Resultado === 'A' && det.CAE) {
    return { resultado: 'aprobado', cae: String(det.CAE), caeVence: fechaIso(det.CAEFchVto) ?? '', observaciones }
  }
  return { resultado: 'rechazado', observaciones }
}

/** Código de ARCA cuando el número no es el que sigue: otra emisión se metió en el medio. */
export const NUMERO_NO_CORRELATIVO = '10016'

export interface ComprobanteEnArca {
  cae: string
  caeVence: string
  total: number
  docTipo: number
  docNro: number
  fecha: string
}

/**
 * Un comprobante ya emitido, o `null` si ARCA no lo tiene.
 *
 * Sirve para no duplicar: si un pedido de CAE se quedó sin respuesta, antes
 * de reintentar se pregunta si ese número ya está autorizado.
 */
export async function consultar(
  config: ConfigArca,
  cred: Credenciales,
  puntoVenta: number,
  tipo: number,
  numero: number
): Promise<ComprobanteEnArca | null> {
  const r = await operar(
    config,
    'FECompConsultar',
    `${auth(cred)}<ar:FeCompConsReq><ar:CbteTipo>${tipo}</ar:CbteTipo><ar:CbteNro>${numero}</ar:CbteNro><ar:PtoVta>${puntoVenta}</ar:PtoVta></ar:FeCompConsReq>`
  )
  const errores = mensajes(r.Errors, 'Err')
  // 602: "Sin Resultados". Cualquier otro error es un problema de verdad.
  if (errores.some((e) => e.codigo === '602')) return null
  fallaGeneral(r)
  const g = r.ResultGet as Record<string, unknown> | undefined
  if (!g || !g.CodAutorizacion) return null
  return {
    cae: String(g.CodAutorizacion),
    caeVence: fechaIso(g.FchVto) ?? '',
    total: Number(g.ImpTotal ?? 0),
    docTipo: Number(g.DocTipo ?? 0),
    docNro: Number(g.DocNro ?? 0),
    fecha: fechaIso(g.CbteFch) ?? '',
  }
}
