import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE, SERVICE, rest } from './local'
import { levantarArcaSimulado, certificadoDePrueba, type ArcaSimulado } from './arca-simulado'
import { ErrorArca, type ConfigArca } from '@/lib/arca/config'
import { ticketVigente } from '@/lib/arca/wsaa'
import { estado, ultimoAutorizado, solicitarCae, consultar, TIPO, NUMERO_NO_CORRELATIVO } from '@/lib/arca/wsfe'
import { textoDelQr, URL_QR } from '@/lib/arca/qr'

/**
 * La conexión con ARCA (change la-caja-emite-factura-c, tareas 3.2 a 3.4),
 * contra el ARCA simulado. No abre el navegador.
 *
 * El ticket de acceso se guarda en la base local: si había uno (de una prueba
 * real en homologación), se guarda aparte y se devuelve al final.
 */

const base = createClient(SUPABASE, SERVICE)
const CUIT_LOCAL = '20111111112'
let arca: ArcaSimulado
let config: ConfigArca
let respaldo: unknown[] = []

test.beforeAll(async () => {
  arca = await levantarArcaSimulado()
  config = {
    ambiente: 'homologacion',
    cuitProveedor: '20000000001',
    ...certificadoDePrueba(),
    urlWsaa: arca.urlWsaa,
    urlWsfe: arca.urlWsfe,
  }
  respaldo = await rest('arca_ticket_de_acceso?select=*')
})

test.afterAll(async () => {
  await arca?.cerrar()
  await rest('arca_ticket_de_acceso?servicio=neq.x', { method: 'DELETE' })
  if (respaldo.length) await rest('arca_ticket_de_acceso', { method: 'POST', body: JSON.stringify(respaldo) })
})

test.beforeEach(async () => {
  arca.modo = 'normal'
  arca.pedidos = {}
  arca.ticketHasta = 0
  arca.demoraWsaa = 0
  await rest('arca_ticket_de_acceso?servicio=neq.x', { method: 'DELETE' })
})

const comprobante = (numero: number, total = 12_500) => ({
  tipo: TIPO.facturaC,
  puntoVenta: 3,
  numero,
  fecha: '2026-09-30',
  total,
  docTipo: 99,
  docNro: 0,
})

test.describe.configure({ mode: 'serial' })

test('3.2 el ticket se pide firmado, se guarda y se reutiliza', async () => {
  const primero = await ticketVigente(base, config)
  expect(primero.token).toBe('token-de-prueba')
  expect(arca.pedidos.loginCms).toBe(1)

  const segundo = await ticketVigente(base, config)
  expect(segundo.token).toBe(primero.token)
  // El segundo salió de la base: ARCA rechaza pedir otro con uno vigente.
  expect(arca.pedidos.loginCms).toBe(1)
})

test('3.2 dos pedidos a la vez terminan con un solo ticket', async () => {
  // El primero que llega a ARCA se lleva el ticket; a los demás ARCA les dice
  // "ya tenés uno", y lo tienen que encontrar en la base aunque el primero
  // todavía no lo haya guardado (WSAA tarda en contestar).
  arca.demoraWsaa = 300
  const pedidos = await Promise.allSettled([1, 2, 3].map(() => ticketVigente(base, config)))
  expect(pedidos.map((p) => p.status)).toEqual(['fulfilled', 'fulfilled', 'fulfilled'])
  const tokens = new Set(pedidos.map((p) => (p.status === 'fulfilled' ? p.value.token : '')))
  expect(tokens).toEqual(new Set(['token-de-prueba']))
  expect(arca.pedidos.loginCms).toBe(3)
  expect(await rest('arca_ticket_de_acceso?select=token')).toHaveLength(1)
})

test('3.2 si ARCA ya dio un ticket, se usa el guardado', async () => {
  // Un ticket por vencer: obliga a pedir otro.
  await rest('arca_ticket_de_acceso', {
    method: 'POST',
    body: JSON.stringify({ servicio: 'wsfe', ambiente: 'homologacion', token: 'viejo', firma: 'f', vence: new Date(Date.now() + 60_000).toISOString() }),
  })
  arca.modo = 'ticket-ya-dado'
  const t = await ticketVigente(base, config)
  // ARCA no da otro y nadie guardó uno nuevo: sirve el que vence en un
  // minuto, mejor que quedarse sin facturar.
  expect(t.token).toBe('viejo')
})

test('3.3 FEDummy, último autorizado y CAE', async () => {
  expect(await estado(config)).toEqual({ app: 'OK', base: 'OK', autenticacion: 'OK' })
  const ticket = await ticketVigente(base, config)
  const cred = { ticket, cuit: CUIT_LOCAL }

  expect(await ultimoAutorizado(config, cred, 3, TIPO.facturaC)).toBe(0)
  const r = await solicitarCae(config, cred, comprobante(1))
  expect(r.resultado).toBe('aprobado')
  if (r.resultado !== 'aprobado') return
  expect(r.cae).toMatch(/^\d{14}$/)
  expect(r.caeVence).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(await ultimoAutorizado(config, cred, 3, TIPO.facturaC)).toBe(1)
  // Cada pedido llevó la CUIT del local, no la del proveedor.
  expect(new Set(arca.cuits)).toEqual(new Set([CUIT_LOCAL]))
})

test('3.3 número no correlativo y rechazo, con el código de ARCA', async () => {
  const cred = { ticket: await ticketVigente(base, config), cuit: CUIT_LOCAL }
  const siguiente = (await ultimoAutorizado(config, cred, 3, TIPO.facturaC)) + 1

  const desfasado = await solicitarCae(config, cred, comprobante(siguiente + 5))
  expect(desfasado.resultado).toBe('rechazado')
  expect(desfasado.observaciones.map((o) => o.codigo)).toContain(NUMERO_NO_CORRELATIVO)

  arca.modo = 'rechazar'
  const rechazado = await solicitarCae(config, cred, comprobante(siguiente))
  expect(rechazado.resultado).toBe('rechazado')
  expect(rechazado.observaciones[0]).toEqual({ codigo: '10015', mensaje: 'El campo DocNro es invalido' })
})

test('3.3 sin respuesta: error de red, y la consulta encuentra lo que sí se autorizó', async () => {
  process.env.ARCA_TIEMPO_MAXIMO_MS = '1500'
  try {
    const cred = { ticket: await ticketVigente(base, config), cuit: CUIT_LOCAL }
    const siguiente = (await ultimoAutorizado(config, cred, 3, TIPO.facturaC)) + 1

    arca.modo = 'autoriza-y-no-contesta'
    const error = await solicitarCae(config, cred, comprobante(siguiente, 4_321)).catch((e) => e)
    expect(error).toBeInstanceOf(ErrorArca)
    expect((error as ErrorArca).tipo).toBe('red')

    arca.modo = 'normal'
    const encontrado = await consultar(config, cred, 3, TIPO.facturaC, siguiente)
    expect(encontrado?.cae).toMatch(/^\d{14}$/)
    expect(encontrado?.total).toBe(4_321)
    expect(await consultar(config, cred, 3, TIPO.facturaC, siguiente + 1)).toBeNull()
  } finally {
    delete process.env.ARCA_TIEMPO_MAXIMO_MS
  }
})

test('3.3 sin delegación: error de ARCA con su texto', async () => {
  const cred = { ticket: await ticketVigente(base, config), cuit: CUIT_LOCAL }
  arca.modo = 'sin-delegacion'
  const error = await ultimoAutorizado(config, cred, 3, TIPO.facturaC).catch((e) => e)
  expect(error).toBeInstanceOf(ErrorArca)
  expect((error as ErrorArca).codigo).toBe('600')
  expect((error as ErrorArca).message).toMatch(/lista de relaciones/)
})

test('3.4 el QR es el JSON de la RG 4892 en base64', () => {
  const texto = textoDelQr({
    fecha: '2026-09-30',
    cuit: CUIT_LOCAL,
    puntoVenta: 3,
    tipo: 11,
    numero: 41,
    total: 12_500,
    docTipo: 99,
    docNro: 0,
    cae: '70417054367476',
  })
  expect(texto.startsWith(`${URL_QR}?p=`)).toBe(true)
  const json = JSON.parse(Buffer.from(texto.slice(`${URL_QR}?p=`.length), 'base64').toString('utf8'))
  expect(json).toEqual({
    ver: 1,
    fecha: '2026-09-30',
    cuit: 20111111112,
    ptoVta: 3,
    tipoCmp: 11,
    nroCmp: 41,
    importe: 12500,
    moneda: 'PES',
    ctz: 1,
    tipoCodAut: 'E',
    codAut: 70417054367476,
  })
})
