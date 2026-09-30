import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE, SERVICE, rest } from './local'
import { levantarArcaSimulado, certificadoDePrueba, type ArcaSimulado } from './arca-simulado'
import type { ConfigArca } from '@/lib/arca/config'
import { emitir, seFacturaSolo } from '@/lib/facturas/emitir'
import { TIPO } from '@/lib/arca/wsfe'

/**
 * Emitir la factura de un pedido (change la-caja-emite-factura-c, tarea 4.1),
 * contra el ARCA simulado y la base local, sin navegador.
 *
 * Crea sus pedidos (ids con prefijo `fa`) y los borra al final. Los datos
 * fiscales y el ticket de ARCA que hubiera en la base se guardan aparte y se
 * devuelven.
 */

const base = createClient(SUPABASE, SERVICE)
const CUIT_LOCAL = '20111111112'
const PV = 7
let arca: ArcaSimulado
let config: ConfigArca
let respaldoDatos: unknown[] = []
let respaldoTicket: unknown[] = []
let n = 0

const PEDIDO = (i: number) => `fa000000-0000-0000-0000-${String(i).padStart(12, '0')}`

async function pedidoCobrado(total = 12_500, status = 'pagado') {
  const id = PEDIDO(++n)
  await rest('orders', {
    method: 'POST',
    body: JSON.stringify({ id, total, items: [], status, order_source: 'pos', order_type: 'mostrador', payment_method: 'card' }),
  })
  return id
}

async function limpiarPropios() {
  // Primero las notas (apuntan a las facturas), después las facturas y los pedidos.
  const ids = Array.from({ length: 60 }, (_, i) => PEDIDO(i + 1)).join(',')
  await rest(`facturas?order_id=in.(${ids})&tipo=eq.13`, { method: 'DELETE' })
  await rest(`facturas?order_id=in.(${ids})`, { method: 'DELETE' })
  await rest(`orders?id=in.(${ids})`, { method: 'DELETE' })
}

test.describe.configure({ mode: 'serial' })
test.setTimeout(60_000)

test.beforeAll(async () => {
  arca = await levantarArcaSimulado()
  config = { ambiente: 'homologacion', cuitProveedor: '20000000001', ...certificadoDePrueba(), urlWsaa: arca.urlWsaa, urlWsfe: arca.urlWsfe }
  respaldoDatos = await rest('datos_fiscales?select=*')
  respaldoTicket = await rest('arca_ticket_de_acceso?select=*')
  await rest('arca_ticket_de_acceso?servicio=neq.x', { method: 'DELETE' })
  await limpiarPropios()
  await rest('datos_fiscales', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ id: true, activa: true, razon_social: 'ZZ Local', cuit: CUIT_LOCAL, punto_venta: PV }),
  })
})

test.afterAll(async () => {
  await arca?.cerrar()
  await limpiarPropios()
  await rest('datos_fiscales?id=eq.true', { method: 'DELETE' })
  if (respaldoDatos.length) await rest('datos_fiscales', { method: 'POST', body: JSON.stringify(respaldoDatos) })
  await rest('arca_ticket_de_acceso?servicio=neq.x', { method: 'DELETE' })
  if (respaldoTicket.length) await rest('arca_ticket_de_acceso', { method: 'POST', body: JSON.stringify(respaldoTicket) })
})

test.beforeEach(() => {
  arca.modo = 'normal'
  arca.pedidos = {}
})

test('con la facturación apagada no se hace nada', async () => {
  await rest('datos_fiscales?id=eq.true', { method: 'PATCH', body: JSON.stringify({ activa: false }) })
  try {
    const id = await pedidoCobrado()
    expect(await emitir(base, config, id)).toEqual({ estado: 'apagada' })
    expect(arca.pedidos).toEqual({})
    expect(await rest(`facturas?order_id=eq.${id}`)).toEqual([])
  } finally {
    await rest('datos_fiscales?id=eq.true', { method: 'PATCH', body: JSON.stringify({ activa: true }) })
  }
})

test('un pedido cobrado se factura una vez; llamarlo de nuevo devuelve la misma', async () => {
  const id = await pedidoCobrado(12_500)
  const r = await emitir(base, config, id)
  expect(r.estado).toBe('emitida')
  if (r.estado !== 'emitida') return
  expect(r.factura).toMatchObject({ tipo: 11, punto_venta: PV, numero: 1, total: 12500, estado: 'emitida' })
  expect(r.factura.cae).toMatch(/^\d{14}$/)

  const otra = await emitir(base, config, id)
  expect(otra.estado === 'emitida' && otra.factura.id).toBe(r.factura.id)
  expect(arca.pedidos.FECAESolicitar).toBe(1)
})

test('dos emisiones a la vez del mismo pedido: una sola factura', async () => {
  const id = await pedidoCobrado()
  const [a, b] = await Promise.all([emitir(base, config, id), emitir(base, config, id)])
  expect([a.estado, b.estado].sort()).toEqual(['emitida', 'en-curso'])
  expect(arca.pedidos.FECAESolicitar).toBe(1)
  expect(await rest(`facturas?order_id=eq.${id}&select=id`)).toHaveLength(1)
})

test('la respuesta se pierde: queda pendiente y el reintento recupera el CAE sin pedir otro', async () => {
  process.env.ARCA_TIEMPO_MAXIMO_MS = '1500'
  try {
    const id = await pedidoCobrado(7_777)
    arca.modo = 'autoriza-y-no-contesta'
    const primero = await emitir(base, config, id)
    expect(primero.estado).toBe('pendiente')
    expect(primero.estado === 'pendiente' && primero.motivo).toMatch(/no respondió/)

    arca.modo = 'normal'
    arca.pedidos = {}
    const segundo = await emitir(base, config, id)
    expect(segundo.estado).toBe('emitida')
    // Lo encontró consultando: no pidió otro comprobante.
    expect(arca.pedidos.FECAESolicitar ?? 0).toBe(0)
    expect(arca.pedidos.FECompConsultar).toBe(1)
    expect(segundo.estado === 'emitida' && segundo.factura.numero).toBe(primero.estado === 'pendiente' ? primero.factura.pedido_arca?.numero : -1)
  } finally {
    delete process.env.ARCA_TIEMPO_MAXIMO_MS
  }
})

test('otra emisión toma el número en el medio: se pide el siguiente', async () => {
  const id = await pedidoCobrado()
  arca.modo = 'otro-se-adelanta'
  const r = await emitir(base, config, id)
  expect(r.estado).toBe('emitida')
  expect(arca.pedidos.FECAESolicitar).toBe(2)
})

test('ARCA rechaza: queda rechazada con el motivo, y se puede reintentar', async () => {
  const id = await pedidoCobrado()
  arca.modo = 'rechazar'
  const r = await emitir(base, config, id)
  expect(r.estado).toBe('rechazada')
  expect(r.estado === 'rechazada' && r.motivo).toBe('El campo DocNro es invalido (código 10015)')

  arca.modo = 'normal'
  const otra = await emitir(base, config, id)
  expect(otra.estado).toBe('emitida')
  expect(await rest(`facturas?order_id=eq.${id}&select=id`)).toHaveLength(1)
})

test('sin delegación: pendiente, diciendo qué paso falta', async () => {
  const id = await pedidoCobrado()
  arca.modo = 'sin-delegacion'
  const r = await emitir(base, config, id)
  expect(r.estado).toBe('pendiente')
  expect(r.estado === 'pendiente' && r.motivo).toMatch(/paso 2 de la guía/)
})

test('un pedido sin cobrar no se factura', async () => {
  const id = await pedidoCobrado(5_000, 'abierto')
  expect((await emitir(base, config, id)).estado).toBe('no-corresponde')
  expect(arca.pedidos.FECAESolicitar ?? 0).toBe(0)
})

test('anular un pedido facturado: nota de crédito asociada, por el mismo importe', async () => {
  const id = await pedidoCobrado(9_900)
  const factura = await emitir(base, config, id)
  expect(factura.estado).toBe('emitida')
  if (factura.estado !== 'emitida') return

  // Sin anular, no corresponde.
  expect((await emitir(base, config, id, TIPO.notaDeCreditoC)).estado).toBe('no-corresponde')

  await rest(`orders?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelado' }) })
  const nota = await emitir(base, config, id, TIPO.notaDeCreditoC)
  expect(nota.estado).toBe('emitida')
  if (nota.estado !== 'emitida') return
  expect(nota.factura).toMatchObject({ tipo: 13, total: 9900, asociada_a: factura.factura.id, numero: 1 })
})

test('se factura solo si alguno de los medios usados está tildado', () => {
  const datos = { medios_automaticos: ['card', 'mercadopago'] }
  expect(seFacturaSolo(datos, ['cash'])).toBe(false)
  expect(seFacturaSolo(datos, ['cash', 'card'])).toBe(true)
  expect(seFacturaSolo({ medios_automaticos: [] }, ['card'])).toBe(false)
})
