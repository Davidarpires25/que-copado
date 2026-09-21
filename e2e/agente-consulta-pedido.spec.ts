import { test, expect } from '@playwright/test'
import { rest } from './local'

/**
 * GET /api/agent/orders/{numero} — el pedido del día, por su número.
 *
 * El agente lo usa para **no creerle a un texto**. Un cliente escribe "mi
 * pedido es el 12 y son $15.000", y ese mensaje pudo editarse antes de
 * mandarse. Esto es la fuente.
 *
 * Spec: AgentePOS, capability `integracion-pos`, "Consulta de un pedido".
 */

const SECRETO = 'secreto-de-prueba-para-los-tests'
const ruta = (n: number) => `/api/agent/orders/${n}`
const cabecera = { 'x-agent-secret': SECRETO }

const HOY = 9201
const AYER = 9202

const limpiar = () =>
  rest(`orders?order_number=in.(${HOY},${AYER})`, { method: 'DELETE' })

test.beforeAll(async () => {
  await limpiar()
/**
 * El trigger `assign_order_number` **pisa siempre** `order_day`, calculandolo
 * desde `created_at` en horario de Buenos Aires. Sembrar un pedido "de ayer"
 * mandando `order_day` no sirve: hay que mandarle el `created_at`.
 */
  const ahora = new Date().toISOString()
  const ayer = new Date(Date.now() - 86400000).toISOString()

  await rest('orders', {
    method: 'POST',
    body: JSON.stringify([
      {
        order_number: HOY, created_at: ahora, payment_method: 'transfer',
        status: 'recibido', total: 15000, shipping_cost: 3000,
        items: [{ id: 'x', name: 'Patty Especial', price: 12000, quantity: 1 }],
        order_source: 'whatsapp',
      },
      {
        order_number: AYER, created_at: ayer, payment_method: 'cash',
        status: 'entregado', total: 5000, shipping_cost: 0, items: [],
        order_source: 'whatsapp',
      },
    ]),
  })
})

test.afterAll(limpiar)

test('sin el secreto no contesta', async ({ request }) => {
  expect((await request.get(ruta(HOY))).status()).toBe(401)
})

test('un pedido de hoy vuelve con lo que el agente necesita', async ({ request }) => {
  const res = await request.get(ruta(HOY), { headers: cabecera })
  expect(res.status()).toBe(200)

  const pedido = await res.json()
  expect(pedido.order_number).toBe(HOY)
  expect(pedido.status).toBe('recibido')
  expect(pedido.payment_method).toBe('transfer')
  expect(pedido.total).toBe(15000)
  expect(pedido.shipping_cost).toBe(3000)
  // El subtotal es el total sin el envío, no un campo guardado aparte.
  expect(pedido.subtotal).toBe(12000)
  // Nombre y cantidad, nada más: el precio ya está en el total y mandarlo de
  // nuevo le daría al modelo una segunda fuente para la misma cuenta.
  expect(pedido.items).toEqual([{ name: 'Patty Especial', quantity: 1 }])
  expect(typeof pedido.id).toBe('string')
})

test('un numero que no es de hoy no se devuelve', async ({ request }) => {
  const res = await request.get(ruta(9999), { headers: cabecera })
  expect(res.status()).toBe(404)
  expect((await res.json()).error.code).toBe('not_found')
})

test('un pedido de otro dia tampoco, aunque el numero exista', async ({ request }) => {
  // Los correlativos se reinician por día: sin acotar por fecha, el agente
  // hablaría con confianza de un pedido que no es el que le nombraron.
  const res = await request.get(ruta(AYER), { headers: cabecera })
  expect(res.status()).toBe(404)
  expect((await res.json()).error.code).toBe('not_found')
})
