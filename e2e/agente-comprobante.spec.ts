import { test, expect } from '@playwright/test'
import { rest } from './local'

/**
 * POST /api/agent/orders/{numero}/comprobante — el cliente dice que transfirio.
 *
 * Lo que define este endpoint es lo que **no** hace: no cobra. Deja una marca
 * para que alguien del local mire el banco, y el `status` del pedido se queda
 * donde estaba. Si marcar cambiara el estado, un cliente podria dar por pagado
 * su pedido escribiendo un mensaje.
 *
 * Spec: AgentePOS, capability `integracion-pos`, "Marca de comprobante
 * recibido".
 */

const SECRETO = 'secreto-de-prueba-para-los-tests'
const ruta = (n: number) => `/api/agent/orders/${n}/comprobante`
const cabecera = { 'x-agent-secret': SECRETO }

const NUM_TRANSFER = 9101
const NUM_EFECTIVO = 9102

const limpiar = () =>
  rest(`orders?order_number=in.(${NUM_TRANSFER},${NUM_EFECTIVO})`, { method: 'DELETE' })

test.beforeAll(async () => {
  await limpiar()
  await rest('orders', {
    method: 'POST',
    body: JSON.stringify([
      { order_number: NUM_TRANSFER, payment_method: 'transfer',
        status: 'recibido', total: 5000, items: [], order_source: 'whatsapp' },
      { order_number: NUM_EFECTIVO, payment_method: 'cash',
        status: 'recibido', total: 5000, items: [], order_source: 'whatsapp' },
    ]),
  })
})

test.afterAll(limpiar)

test('sin el secreto no contesta', async ({ request }) => {
  expect((await request.post(ruta(NUM_TRANSFER))).status()).toBe(401)
})

test('marcar no cobra: el estado del pedido no cambia', async ({ request }) => {
  const res = await request.post(ruta(NUM_TRANSFER), { headers: cabecera })
  expect(res.status()).toBe(200)

  const cuerpo = await res.json()
  expect(cuerpo.order_number).toBe(NUM_TRANSFER)
  expect(cuerpo.status).toBe('recibido')
  expect(cuerpo.transfer_claimed_at).toBeTruthy()

  // Y en la base tampoco, que es lo que de verdad importa.
  const [guardado] = await rest(
    `orders?order_number=eq.${NUM_TRANSFER}&select=status,transfer_claimed_at`
  )
  expect(guardado.status).toBe('recibido')
  expect(guardado.transfer_claimed_at).toBeTruthy()
})

test('marcar dos veces conserva el primer aviso', async ({ request }) => {
  const primera = await (await request.post(ruta(NUM_TRANSFER), { headers: cabecera })).json()
  await new Promise((r) => setTimeout(r, 1100))
  const segunda = await (await request.post(ruta(NUM_TRANSFER), { headers: cabecera })).json()

  // El cliente puede repetir el aviso; lo que importa es cuando aviso la
  // primera vez, que es contra lo que se mira el banco.
  expect(segunda.transfer_claimed_at).toBe(primera.transfer_claimed_at)
})

test('un pedido que no es por transferencia es invalid_request', async ({ request }) => {
  const res = await request.post(ruta(NUM_EFECTIVO), { headers: cabecera })
  expect(res.status()).toBe(400)
  expect((await res.json()).error.code).toBe('invalid_request')
})

test('un numero que no existe tampoco se marca', async ({ request }) => {
  const res = await request.post(ruta(99999), { headers: cabecera })
  // `not_found` y no `invalid_request`: el numero esta bien formado, lo que no
  // existe es el pedido. Mismo criterio que la consulta.
  expect(res.status()).toBe(404)
  expect((await res.json()).error.code).toBe('not_found')
})
