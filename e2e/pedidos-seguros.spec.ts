import { test, expect } from '@playwright/test'
import { SUPABASE, SERVICE, rest } from './local'

/**
 * Un pedido solo entra por el servidor o por el personal (spec
 * pedidos-seguros, change los-pedidos-entran-por-el-servidor).
 *
 * Con la clave pública —la que está en el navegador de cualquiera— se podía
 * insertar un pedido con cualquier total y estado, o llamar a
 * `crear_pedido_remoto`, salteando lo que valida `createOrder`. Lo encontró la
 * revisión de seguridad de Supabase (2026-10-02).
 *
 * Crea un cajero propio y los pedidos que necesita, y borra todo al final.
 */

const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const CAJERO = { email: 'cajero-pedidos@local.test', password: 'cajero1234' }
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }
const MARCA = 'ZZ pedido falso'
let cajeroId = ''

async function comoAnon(ruta: string, cuerpo: unknown, jwt = ANON) {
  return fetch(`${SUPABASE}/rest/v1/${ruta}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(cuerpo),
  })
}

const pedidoFalso = { customer_name: MARCA, total: 1, items: [{ name: 'x', price: 1, quantity: 1 }], status: 'pagado', order_source: 'web', payment_method: 'cash' }

test.beforeAll(async () => {
  const lista = await fetch(`${SUPABASE}/auth/v1/admin/users`, { headers: admin }).then((r) => r.json())
  const viejo = (lista.users ?? []).find((u: { email?: string }) => u.email === CAJERO.email)
  if (viejo) await fetch(`${SUPABASE}/auth/v1/admin/users/${viejo.id}`, { method: 'DELETE', headers: admin })
  const creado = await fetch(`${SUPABASE}/auth/v1/admin/users`, {
    method: 'POST', headers: admin, body: JSON.stringify({ ...CAJERO, email_confirm: true }),
  }).then((r) => r.json())
  cajeroId = creado.id
  await rest(`profiles?id=eq.${cajeroId}`, { method: 'PATCH', body: JSON.stringify({ role: 'cajero' }) })
})

test.afterAll(async () => {
  const falsos: { id: string }[] = await rest(`orders?customer_name=like.ZZ*&select=id`)
  for (const { id } of falsos) {
    await rest(`order_status_history?order_id=eq.${id}`, { method: 'DELETE' })
    await rest(`orders?id=eq.${id}`, { method: 'DELETE' })
  }
  if (cajeroId) await fetch(`${SUPABASE}/auth/v1/admin/users/${cajeroId}`, { method: 'DELETE', headers: admin })
})

test('sin sesión no se puede insertar un pedido', async () => {
  const r = await comoAnon('orders', pedidoFalso)
  expect([401, 403]).toContain(r.status)
  expect(await rest(`orders?customer_name=eq.${encodeURIComponent(MARCA)}&select=id`)).toEqual([])
})

test('sin sesión no se puede llamar a crear_pedido_remoto', async () => {
  const r = await comoAnon('rpc/crear_pedido_remoto', {
    p_customer_name: MARCA, p_customer_phone: '1', p_customer_address: 'x',
    p_items: [{ name: 'x', price: 1, quantity: 1 }], p_total: 1, p_payment_method: 'cash',
  })
  expect([401, 403]).toContain(r.status)
  expect(await rest(`orders?customer_name=eq.${encodeURIComponent(MARCA)}&select=id`)).toEqual([])
})

test('sin sesión no se puede escribir el historial de estados', async () => {
  const [cualquiera] = await rest('orders?select=id&limit=1')
  const r = await comoAnon('order_status_history', { order_id: cualquiera.id, from_status: 'recibido', to_status: 'pagado' })
  expect([401, 403]).toContain(r.status)
})

test('un cajero sí puede crear un pedido de mostrador', async () => {
  const sesion = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify(CAJERO),
  }).then((r) => r.json())
  const r = await comoAnon('orders', { ...pedidoFalso, customer_name: 'ZZ mostrador del cajero', status: 'abierto', order_source: 'pos', order_type: 'mostrador' }, sesion.access_token)
  expect(r.status).toBe(201)
})
