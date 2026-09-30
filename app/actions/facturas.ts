'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createServiceRoleClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/server/profile'
import { devError } from '@/lib/server/logger'
import { configArca } from '@/lib/arca/config'
import { ticketVigente } from '@/lib/arca/wsaa'
import { estado as estadoArca, ultimoAutorizado, TIPO } from '@/lib/arca/wsfe'
import { emitir, explicarError, type DatosFiscales, type FilaFactura } from '@/lib/facturas/emitir'
import { nombreDeComprobante, numeroDeComprobante } from '@/lib/facturas/formato'

/**
 * Lo que la caja y Ajustes piden de la facturación (change
 * la-caja-emite-factura-c). Cada acción comprueba el permiso y después escribe
 * con la clave de servicio: las tablas de facturación no aceptan escrituras
 * de usuarios.
 */

export type EstadoFacturaPedido = {
  estado: FilaFactura['estado']
  texto: string
  motivo: string | null
  tipo: number
}

/**
 * Facturar un pedido cobrado que no se facturó solo, o reintentar lo que quedó
 * pendiente o rechazado. En un pedido anulado con factura, reintenta su nota
 * de crédito.
 */
export async function facturarPedido(orderId: string): Promise<{ texto?: string; error?: string }> {
  const denegado = await requirePermission('caja.manage')
  if (denegado) return { error: denegado.error }
  try {
    const base = createServiceRoleClient()
    const { data: pedido } = await base.from('orders').select('status').eq('id', orderId).maybeSingle()
    const tipo = pedido?.status === 'cancelado' ? TIPO.notaDeCreditoC : TIPO.facturaC
    const r = await emitir(base, configArca(), orderId, tipo)
    revalidatePath('/admin/caja')
    switch (r.estado) {
      case 'emitida':
        return { texto: nombreDeComprobante(r.factura) }
      case 'en-curso':
        return { texto: 'La factura ya se está emitiendo.' }
      case 'apagada':
        return { error: 'La facturación está apagada en Ajustes.' }
      default:
        return { error: r.motivo }
    }
  } catch (e) {
    devError('[facturas] facturarPedido:', e)
    return { error: 'No se pudo facturar. Probá de nuevo.' }
  }
}

/**
 * Las facturas de un grupo de pedidos, para el Historial: la última de cada
 * tipo por pedido. Lee con la sesión del usuario (RLS: `caja.view`).
 */
export async function facturasDePedidos(orderIds: string[]): Promise<Record<string, EstadoFacturaPedido>> {
  if (orderIds.length === 0) return {}
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('facturas')
    .select('order_id, tipo, estado, punto_venta, numero, motivo, created_at')
    .in('order_id', orderIds)
    .order('created_at', { ascending: true })
  const porPedido: Record<string, EstadoFacturaPedido> = {}
  // La nota de crédito, si la hay, es lo último que pasó con ese pedido.
  for (const f of data ?? []) {
    const actual = porPedido[f.order_id]
    if (actual && actual.tipo === TIPO.notaDeCreditoC && f.tipo === TIPO.facturaC) continue
    porPedido[f.order_id] = { estado: f.estado, texto: nombreDeComprobante(f), motivo: f.motivo, tipo: f.tipo }
  }
  return porPedido
}

// ─── Ajustes ────────────────────────────────────────────────────────────────

export interface EstadoFacturacion {
  datos: DatosFiscales | null
  /** Si esta instalación tiene el certificado de ARCA cargado. */
  conCertificado: boolean
  ambiente: 'homologacion' | 'produccion'
  /** La CUIT en la que el local delega el servicio (la del proveedor del sistema). */
  cuitProveedor: string | null
}

export async function leerFacturacion(): Promise<EstadoFacturacion | { error: string }> {
  const denegado = await requirePermission('settings.view')
  if (denegado) return { error: denegado.error }
  const supabase = await createAdminClient()
  const { data } = await supabase.from('datos_fiscales').select('*').maybeSingle()
  const config = configArca()
  return {
    datos: (data as DatosFiscales | null) ?? null,
    conCertificado: Boolean(config),
    ambiente: config?.ambiente ?? 'homologacion',
    cuitProveedor: config?.cuitProveedor ?? null,
  }
}

/** El dígito verificador de la CUIT (módulo 11). */
function cuitValida(cuit: string) {
  if (!/^\d{11}$/.test(cuit)) return false
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = pesos.reduce((s, p, i) => s + p * Number(cuit[i]), 0)
  const resto = 11 - (suma % 11)
  const verificador = resto === 11 ? 0 : resto === 10 ? 9 : resto
  return verificador === Number(cuit[10])
}

export interface CambiosFacturacion {
  activa: boolean
  razon_social: string
  cuit: string
  punto_venta: number | null
  domicilio_comercial: string
  ingresos_brutos: string
  inicio_actividades: string | null
  medios_automaticos: string[]
}

const MEDIOS = ['cash', 'card', 'transfer', 'mercadopago']

export async function guardarFacturacion(c: CambiosFacturacion): Promise<{ error?: string }> {
  const denegado = await requirePermission('settings.manage')
  if (denegado) return { error: denegado.error }

  const cuit = c.cuit.replace(/\D/g, '')
  if (cuit && !cuitValida(cuit)) return { error: 'La CUIT no es válida: revisá los 11 números.' }
  if (c.punto_venta !== null && !(Number.isInteger(c.punto_venta) && c.punto_venta >= 1 && c.punto_venta <= 99998)) {
    return { error: 'El punto de venta es un número entre 1 y 99998.' }
  }
  if (c.activa) {
    if (!configArca()) return { error: 'Esta instalación no tiene cargado el certificado de ARCA: no se puede encender.' }
    const faltan = [
      !c.razon_social.trim() && 'razón social',
      !cuit && 'CUIT',
      !c.punto_venta && 'punto de venta',
      !c.domicilio_comercial.trim() && 'domicilio comercial',
      !c.inicio_actividades && 'inicio de actividades',
    ].filter(Boolean)
    if (faltan.length) return { error: `Para encender la facturación falta: ${faltan.join(', ')}.` }
  }

  const { error } = await createServiceRoleClient()
    .from('datos_fiscales')
    .upsert({
      id: true,
      activa: c.activa,
      razon_social: c.razon_social.trim(),
      cuit,
      punto_venta: c.punto_venta,
      domicilio_comercial: c.domicilio_comercial.trim(),
      ingresos_brutos: c.ingresos_brutos.trim(),
      inicio_actividades: c.inicio_actividades || null,
      medios_automaticos: c.medios_automaticos.filter((m) => MEDIOS.includes(m)),
      updated_at: new Date().toISOString(),
    })
  if (error) {
    devError('[facturas] guardarFacturacion:', error)
    return { error: 'No se pudieron guardar los datos fiscales.' }
  }
  revalidatePath('/admin/settings')
  return {}
}

/**
 * "Probar conexión": que ARCA esté, que acepte el certificado, y que la CUIT y
 * el punto de venta cargados respondan. Lo dice en castellano.
 */
export async function probarConexion(cuitIngresada: string, puntoVenta: number | null): Promise<{ ok: boolean; texto: string }> {
  const denegado = await requirePermission('settings.manage')
  if (denegado) return { ok: false, texto: denegado.error }
  const config = configArca()
  if (!config) return { ok: false, texto: 'Esta instalación no tiene cargado el certificado de ARCA.' }
  const cuit = cuitIngresada.replace(/\D/g, '')
  if (!cuitValida(cuit)) return { ok: false, texto: 'Cargá una CUIT válida para probar.' }
  if (!puntoVenta) return { ok: false, texto: 'Cargá el punto de venta para probar.' }

  try {
    const servidores = await estadoArca(config)
    if ([servidores.app, servidores.base, servidores.autenticacion].some((s) => s !== 'OK')) {
      return { ok: false, texto: 'ARCA no está funcionando bien en este momento. Probá en unos minutos.' }
    }
    const ticket = await ticketVigente(createServiceRoleClient(), config)
    const ultimo = await ultimoAutorizado(config, { ticket, cuit }, puntoVenta, TIPO.facturaC)
    return {
      ok: true,
      texto:
        ultimo === 0
          ? `Conectado. El punto de venta ${puntoVenta} todavía no emitió facturas C.`
          : `Conectado. La última factura C del punto de venta ${puntoVenta} es la ${numeroDeComprobante(puntoVenta, ultimo)}.`,
    }
  } catch (e) {
    return { ok: false, texto: explicarError(e) }
  }
}
