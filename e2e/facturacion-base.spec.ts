import { test, expect } from '@playwright/test'
import { SUPABASE, SERVICE, rest } from './local'

/**
 * Quién puede leer las tablas de la facturación (change la-caja-emite-factura-c,
 * tarea 2.1). Todo se escribe desde el servidor; los usuarios solo leen lo que
 * su permiso les deja, y el ticket de ARCA no lo lee nadie.
 *
 * Crea un cajero propio, una fila de datos fiscales si no había y una factura
 * de prueba sobre un pedido existente, y deja todo como estaba.
 */

const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const CAJERO = { email: 'cajero-facturas@local.test', password: 'cajero1234' }
const ADMIN = { email: 'prueba@local.test', password: 'prueba1234' }
const SERVICIO = 'zz-prueba'

const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }

async function token(u: { email: string; password: string }) {
  const r = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(u),
  })
  return (await r.json()).access_token as string
}

/** Lo que devuelve PostgREST para ese usuario (o sin sesión). */
async function leer(tabla: string, jwt?: string) {
  const r = await fetch(`${SUPABASE}/rest/v1/${tabla}?select=*`, {
    headers: { apikey: ANON, Authorization: `Bearer ${jwt ?? ANON}` },
  })
  return (await r.json()) as unknown[]
}

let cajeroId = ''
let creeDatosFiscales = false
let facturaId = ''

test.beforeAll(async () => {
  const lista = await fetch(`${SUPABASE}/auth/v1/admin/users`, { headers: admin }).then((r) => r.json())
  const viejo = (lista.users ?? []).find((u: { email?: string }) => u.email === CAJERO.email)
  if (viejo) await fetch(`${SUPABASE}/auth/v1/admin/users/${viejo.id}`, { method: 'DELETE', headers: admin })
  const creado = await fetch(`${SUPABASE}/auth/v1/admin/users`, {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({ ...CAJERO, email_confirm: true }),
  }).then((r) => r.json())
  cajeroId = creado.id
  // El usuario nuevo nace cajero (handle_new_user); se deja explícito.
  await rest(`profiles?id=eq.${cajeroId}`, { method: 'PATCH', body: JSON.stringify({ role: 'cajero' }) })

  if ((await rest('datos_fiscales?select=id')).length === 0) {
    await rest('datos_fiscales', { method: 'POST', body: JSON.stringify({ razon_social: 'ZZ Prueba' }) })
    creeDatosFiscales = true
  }
  const [pedido] = await rest('orders?select=id&limit=1')
  const [factura] = await rest('facturas', {
    method: 'POST',
    body: JSON.stringify({ order_id: pedido.id, tipo: 11, fecha: '2026-09-30', total: 100, estado: 'rechazada', motivo: 'zz prueba' }),
  })
  facturaId = factura.id
  await rest('arca_ticket_de_acceso', {
    method: 'POST',
    body: JSON.stringify({ servicio: SERVICIO, ambiente: 'homologacion', token: 't', firma: 'f', vence: '2030-01-01T00:00:00Z' }),
  })
})

test.afterAll(async () => {
  await rest(`arca_ticket_de_acceso?servicio=eq.${SERVICIO}`, { method: 'DELETE' })
  if (facturaId) await rest(`facturas?id=eq.${facturaId}`, { method: 'DELETE' })
  if (creeDatosFiscales) await rest('datos_fiscales?id=eq.true', { method: 'DELETE' })
  if (cajeroId) await fetch(`${SUPABASE}/auth/v1/admin/users/${cajeroId}`, { method: 'DELETE', headers: admin })
})

test('sin sesión no se lee nada de la facturación', async () => {
  expect(await leer('datos_fiscales')).toEqual([])
  expect(await leer('facturas')).toEqual([])
  expect(await leer('arca_ticket_de_acceso')).toEqual([])
})

test('el cajero ve las facturas pero no los datos fiscales ni el ticket de ARCA', async () => {
  const jwt = await token(CAJERO)
  expect((await leer('facturas', jwt)).length).toBeGreaterThan(0)
  expect(await leer('datos_fiscales', jwt)).toEqual([])
  expect(await leer('arca_ticket_de_acceso', jwt)).toEqual([])
})

test('el admin ve facturas y datos fiscales, y tampoco el ticket de ARCA', async () => {
  const jwt = await token(ADMIN)
  expect((await leer('facturas', jwt)).length).toBeGreaterThan(0)
  expect((await leer('datos_fiscales', jwt)).length).toBe(1)
  expect(await leer('arca_ticket_de_acceso', jwt)).toEqual([])
})

test('nadie escribe desde el navegador: ni el admin', async () => {
  const jwt = await token(ADMIN)
  const r = await fetch(`${SUPABASE}/rest/v1/datos_fiscales?id=eq.true`, {
    method: 'PATCH',
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ activa: true }),
  })
  // PostgREST no encuentra filas que pueda modificar: 0 filas, nada cambia.
  expect(await r.json()).toEqual([])
  const [fila] = await rest('datos_fiscales?select=activa')
  expect(fila.activa).toBe(false)
})

test('una factura por pedido: la segunda choca en la base', async () => {
  const [pedido] = await rest('orders?select=id&limit=1')
  const primera = await rest('facturas', {
    method: 'POST',
    body: JSON.stringify({ order_id: pedido.id, tipo: 11, fecha: '2026-09-30', total: 100 }),
  })
  try {
    await expect(
      rest('facturas', { method: 'POST', body: JSON.stringify({ order_id: pedido.id, tipo: 11, fecha: '2026-09-30', total: 100 }) })
    ).rejects.toThrow(/facturas_una_por_pedido/)
  } finally {
    await rest(`facturas?id=eq.${primera[0].id}`, { method: 'DELETE' })
  }
})
