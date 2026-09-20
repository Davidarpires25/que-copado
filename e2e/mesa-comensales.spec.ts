import { test, expect } from '@playwright/test'
import { rest, asegurarUsuario, USUARIO } from './local'

/**
 * Una mesa con dos comensales, y un ticket para cada uno.
 *
 * Lo que se comprueba no es que existan los botones sino que cada papel
 * **traiga lo que corresponde**: los items de esa persona, su total, y nada de
 * la otra. Un ticket que suma lo del vecino se descubre cobrando, con la gente
 * esperando.
 */

const MESA = 99
const ANA = 'Ana'
const BETO = 'Beto'

let orderId = ''

async function limpiar() {
  const pedidos = await rest(`orders?table_number=eq.${MESA}&select=id`)
  for (const p of pedidos ?? []) {
    await rest(`order_items?order_id=eq.${p.id}`, { method: 'DELETE' })
    await rest(`print_jobs?data->>orderId=eq.${p.id}`, { method: 'DELETE' })
  }
  await rest(`restaurant_tables?number=eq.${MESA}`, { method: 'PATCH', body: JSON.stringify({ current_order_id: null, status: 'libre' }) }).catch(() => {})
  await rest(`orders?table_number=eq.${MESA}`, { method: 'DELETE' })
  await rest(`restaurant_tables?number=eq.${MESA}`, { method: 'DELETE' })
  // La caja que abre el test no queda abierta para la proxima corrida.
  await rest(`cash_register_sessions?status=eq.abierta`, { method: 'DELETE' })
}

test.beforeAll(async () => {
  await asegurarUsuario()
  await limpiar()

  await rest('restaurant_tables', {
    method: 'POST',
    body: JSON.stringify([{ number: MESA, label: 'Mesa de prueba', capacity: 4, status: 'ocupada' }]),
  })

  // Una mesa abierta con dos comensales y un item compartido.
  const [orden] = await rest('orders', {
    method: 'POST',
    body: JSON.stringify([{
      total: 9000, items: [], order_source: 'pos', order_type: 'mesa',
      // `cuenta_pedida` y no `abierto`: los tickets por comensal aparecen
      // recien cuando alguien pidio la cuenta. Con la mesa abierta la seccion
      // "Imprimir Tickets" no se dibuja (`canPrintPerTag`).
      table_number: MESA, status: 'cuenta_pedida', sale_tags: [ANA, BETO],
    }]),
  })
  orderId = orden.id

  await rest('order_items', {
    method: 'POST',
    body: JSON.stringify([
      { order_id: orderId, product_name: 'Burger de Ana', product_price: 5000, quantity: 1, sale_tag: ANA, status: 'pendiente' },
      { order_id: orderId, product_name: 'Papas de Beto', product_price: 3000, quantity: 1, sale_tag: BETO, status: 'pendiente' },
      { order_id: orderId, product_name: 'Gaseosa compartida', product_price: 1000, quantity: 1, sale_tag: null, status: 'pendiente' },
    ]),
  })

  await rest(`restaurant_tables?number=eq.${MESA}`, {
    method: 'PATCH', body: JSON.stringify({ current_order_id: orderId }),
  })
})

test.afterAll(limpiar)

/** Un ticket tal como quedo encolado para la impresora. */
interface TicketEncolado {
  guest: string | null
  total: number
  items: string[]
}

/** Lo que quedo encolado para la impresora. */
async function ticketsEncolados(): Promise<TicketEncolado[]> {
  const jobs = await rest(
    `print_jobs?data->>orderId=eq.${orderId}&type=eq.client_ticket&select=data&order=created_at.asc`
  )
  return (jobs ?? []).map((j: { data: Record<string, unknown> }) => ({
    guest: j.data.guestName ?? null,
    total: Number(j.data.total),
    items: (j.data.items as { name: string }[]).map((i) => i.name),
  }))
}

test.beforeEach(async ({ page }) => {
  await rest(`print_jobs?data->>orderId=eq.${orderId}`, { method: 'DELETE' })

  await page.setViewportSize({ width: 1500, height: 900 })
  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)

  // El POS no deja llegar a las mesas sin una caja abierta: es lo primero que
  // pide la pantalla, y sin esto el test se queda esperando una pestaña que
  // todavia no existe.
  await page.goto('/admin/caja')
  await page.waitForTimeout(1500)
  const abrirCaja = page.getByRole('button', { name: 'Abrir Caja', exact: true })
  if (await abrirCaja.count()) {
    await page.getByPlaceholder('0').fill('0')
    await abrirCaja.click()
    await page.waitForTimeout(2500)
  }
})

test('el ticket de un comensal trae solo lo suyo', async ({ page }) => {
  await page.getByRole('button', { name: /Mesas/i }).first().click()
  await page.waitForTimeout(1200)
  await page.getByText('Mesa de prueba').first().click()
  await page.waitForTimeout(1500)

  // La seccion aparece dos veces --panel y vista de cobro-- segun el ancho.
  const seccion = page.getByText('Imprimir Tickets').first().locator('xpath=../..')
  await expect(seccion).toBeVisible()
  await seccion.getByRole('button', { name: ANA, exact: true }).first().click()
  await page.waitForTimeout(1500)

  const tickets = await ticketsEncolados()
  expect(tickets).toHaveLength(1)
  expect(tickets[0].guest).toBe(ANA)
  expect(tickets[0].items).toEqual(['Burger de Ana'])
  expect(tickets[0].total).toBe(5000)
})

test('los tres papeles juntos suman lo que debe la mesa', async ({ page }) => {
  await page.getByRole('button', { name: /Mesas/i }).first().click()
  await page.waitForTimeout(1200)
  await page.getByText('Mesa de prueba').first().click()
  await page.waitForTimeout(1500)

  const seccion = page.getByText('Imprimir Tickets').first().locator('xpath=../..')
  await seccion.getByRole('button', { name: ANA, exact: true }).first().click()
  await page.waitForTimeout(800)
  await seccion.getByRole('button', { name: BETO, exact: true }).first().click()
  await page.waitForTimeout(800)
  await seccion.getByRole('button', { name: 'Sin asignar', exact: true }).first().click()
  await page.waitForTimeout(1200)

  const tickets = await ticketsEncolados()
  expect(tickets.map((t) => t.guest)).toEqual([ANA, BETO, 'Sin asignar'])
  expect(tickets[1].items).toEqual(['Papas de Beto'])
  expect(tickets[2].items).toEqual(['Gaseosa compartida'])

  // Lo que se buscaba: los papeles cierran contra lo que debe la mesa.
  // Antes eran dos botones para tres grupos y sumaban $8.000 contra $9.000.
  const sumado = tickets.reduce((acc, t) => acc + t.total, 0)
  const [orden] = await rest(`orders?id=eq.${orderId}&select=total`)
  expect(sumado).toBe(Number(orden.total))
})

test('la vista de cobro si agrupa lo compartido en "Sin asignar"', async ({ page }) => {
  await page.getByRole('button', { name: /Mesas/i }).first().click()
  await page.waitForTimeout(1200)
  await page.getByText('Mesa de prueba').first().click()
  await page.waitForTimeout(1500)

  await page.getByRole('button', { name: /Cobrar/i }).first().click()
  await page.waitForTimeout(2000)

  // La vista abre en "Cuenta unica": hay que pedir la division.
  await page.getByRole('button', { name: /Dividir por comensal/i }).click()
  await page.waitForTimeout(1200)

  // Ahi si aparece el grupo de lo que no tiene dueño.
  await expect(page.getByText('Sin asignar').first()).toBeVisible()
  await expect(page.getByText('Gaseosa compartida').first()).toBeVisible()
})
