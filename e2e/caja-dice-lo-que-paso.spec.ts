import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { rest, asegurarUsuario } from './local'
import { entrar, abrir } from './panel'

/**
 * La caja dice lo que paso: lo que no se cobro no figura como cobrado, el
 * vuelto se ve mientras se tipea, y el turno no se cierra con cosas sin cobrar.
 *
 * Cada test arma el turno que necesita por REST —un pedido de mostrador sin
 * cobrar, uno cobrado, una mesa abierta, un pedido de WhatsApp— sobre una
 * sesion propia.
 *
 * La base local puede tener datos de alguien que esta probando la caja a mano:
 * su sesion con pedidos, mesas ocupadas. Nada de eso se borra. La sesion
 * abierta se estaciona (se marca cerrada) y las mesas ocupadas se liberan
 * mientras corre el test; al final vuelven con sus valores exactos. Antes de
 * tocar nada se escribe un respaldo en disco: en la auditoria que abrio este
 * cambio, una corrida cortada dejo la base sin la sesion original, asi que si
 * el respaldo existe al arrancar, primero se restaura.
 */

test.setTimeout(120_000)

const RESPALDO = path.join(os.tmpdir(), 'que-copado-caja-respaldo.json')
const MESA = 1

type Respaldo = {
  sesiones: Record<string, unknown>[]
  mesas: { id: string; status: string; current_order_id: string | null }[]
}
let sesion = ''
let perfil = ''
let producto = { id: '', name: '', price: 0 }
const creados: string[] = []

type Turno = {
  mostrador?: boolean // un pedido de mostrador enviado a cocina, sin cobrar
  cobrado?: boolean // un pedido de mostrador cobrado en efectivo
  mesa?: boolean // la mesa MESA abierta con un pedido
  remoto?: boolean // un pedido de WhatsApp recibido, sin cobrar
}

const TOTAL_PENDIENTE = 17_000
const TOTAL_COBRADO = 42_000
const TOTAL_MESA = 2 * 16_500

async function limpiarPedidos() {
  // Sin sesion propia no se llego a estacionar nada: no hay nada nuestro que
  // limpiar, y lo que hay en las mesas es de otro.
  if (!sesion) return
  await rest(`restaurant_tables?number=eq.${MESA}`, {
    method: 'PATCH',
    body: JSON.stringify({ current_order_id: null, status: 'libre' }),
  })
  // Solo lo de esta prueba: los pedidos que creo y los de su propia sesion.
  const deLaSesion: { id: string }[] = sesion
    ? await rest(`orders?cash_register_session_id=eq.${sesion}&select=id`)
    : []
  const ids = [...new Set([...creados, ...deLaSesion.map((o) => o.id)])]
  for (const id of ids) {
    const comandas: { id: string }[] = await rest(`comandas?order_id=eq.${id}&select=id`)
    for (const c of comandas) await rest(`comanda_items?comanda_id=eq.${c.id}`, { method: 'DELETE' })
    await rest(`comandas?order_id=eq.${id}`, { method: 'DELETE' })
    await rest(`print_jobs?data->>orderId=eq.${id}`, { method: 'DELETE' })
    await rest(`payment_splits?order_id=eq.${id}`, { method: 'DELETE' })
    await rest(`order_items?order_id=eq.${id}`, { method: 'DELETE' })
    await rest(`orders?id=eq.${id}`, { method: 'DELETE' })
  }
  creados.length = 0
  if (sesion) await rest(`cash_movements?session_id=eq.${sesion}`, { method: 'DELETE' })
}

const item = (precio: number, cantidad = 1) => ({
  id: producto.id, name: producto.name, price: precio, quantity: cantidad, notes: null, metadata: null,
})

/** Deja el turno exactamente como se pide: sin nada de lo anterior. */
async function prepararTurno(t: Turno, sesionExtra: Record<string, number> = {}) {
  await limpiarPedidos()
  const base = { order_source: 'pos', cash_register_session_id: sesion, payment_method: 'cash' }
  const numeros: Record<string, number> = {}

  if (t.mostrador) {
    const [o] = await rest('orders', {
      method: 'POST',
      body: JSON.stringify({ ...base, order_type: 'mostrador', status: 'abierto',
        total: TOTAL_PENDIENTE, items: [item(TOTAL_PENDIENTE)] }),
    })
    creados.push(o.id)
    numeros.mostrador = o.order_number
    // Como uno real: el cobro recalcula el total desde estas filas.
    await rest('order_items', {
      method: 'POST',
      body: JSON.stringify({ order_id: o.id, product_id: producto.id, product_name: producto.name,
        product_price: TOTAL_PENDIENTE, quantity: 1 }),
    })
  }
  if (t.cobrado) {
    const [o] = await rest('orders', {
      method: 'POST',
      body: JSON.stringify({ ...base, order_type: 'mostrador', status: 'pagado',
        total: TOTAL_COBRADO, items: [item(TOTAL_COBRADO)] }),
    })
    creados.push(o.id)
  }
  if (t.mesa) {
    const [o] = await rest('orders', {
      method: 'POST',
      body: JSON.stringify({ ...base, order_type: 'mesa', status: 'abierto', table_number: MESA,
        total: TOTAL_MESA, items: [item(16_500, 2)] }),
    })
    creados.push(o.id)
    await rest('order_items', {
      method: 'POST',
      body: JSON.stringify({ order_id: o.id, product_id: producto.id, product_name: producto.name,
        product_price: 16_500, quantity: 2 }),
    })
    await rest(`restaurant_tables?number=eq.${MESA}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ocupada', current_order_id: o.id }),
    })
  }
  if (t.remoto) {
    const [o] = await rest('orders', {
      method: 'POST',
      body: JSON.stringify({ order_source: 'whatsapp', status: 'recibido', payment_method: 'cash',
        customer_name: 'Cliente de prueba', total: TOTAL_PENDIENTE, items: [item(TOTAL_PENDIENTE)] }),
    })
    creados.push(o.id)
  }

  // Los totales de la sesion los mueve el cobro; aca se ponen a mano para que
  // coincidan con lo sembrado.
  const vendido = t.cobrado ? TOTAL_COBRADO : 0
  await rest(`cash_register_sessions?id=eq.${sesion}`, {
    method: 'PATCH',
    body: JSON.stringify({
      opening_balance: 20_000, total_sales: vendido, total_cash_sales: vendido,
      total_orders: t.cobrado ? 1 : 0, total_card_sales: 0, total_transfer_sales: 0,
      total_deposits: 0, total_withdrawals: 0, status: 'open', closed_at: null,
      ...sesionExtra,
    }),
  })
  return numeros
}

const estadoDeLaSesion = async () =>
  ((await rest(`cash_register_sessions?id=eq.${sesion}&select=status`)) as { status: string }[])[0]?.status

async function abrirCaja(page: Page) {
  await entrar(page)
  await abrir(page, '/admin/caja')
  await expect(page.getByRole('button', { name: /^Mostrador/ })).toBeVisible({ timeout: 20_000 })
}

async function abrirCierre(page: Page) {
  await page.getByRole('button', { name: 'Cerrar caja' }).click()
  await expect(page.getByText('Efectivo esperado')).toBeVisible()
}

const campoContado = (page: Page) => page.locator('input[inputmode="decimal"]').filter({ visible: true }).first()

/** Devuelve la base a como estaba: la sesion estacionada y las mesas. */
async function restaurar(r: Respaldo) {
  for (const m of r.mesas) {
    await rest(`restaurant_tables?id=eq.${m.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: m.status, current_order_id: m.current_order_id }),
    })
  }
  for (const s of r.sesiones) {
    const { id, ...valores } = s
    await rest(`cash_register_sessions?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(valores) })
  }
}

test.beforeAll(async () => {
  await asegurarUsuario()
  // Un respaldo que quedo es de una corrida cortada: primero se deshace.
  if (fs.existsSync(RESPALDO)) {
    await rest('cash_register_sessions?status=eq.open', { method: 'DELETE' }).catch(() => {})
    await restaurar(JSON.parse(fs.readFileSync(RESPALDO, 'utf8')))
    fs.rmSync(RESPALDO)
  }

  const respaldo: Respaldo = {
    sesiones: await rest('cash_register_sessions?status=eq.open&select=*'),
    mesas: await rest('restaurant_tables?status=neq.libre&select=id,status,current_order_id'),
  }
  fs.writeFileSync(RESPALDO, JSON.stringify(respaldo))

  // Estacionar: la sesion abierta pasa a cerrada, las mesas a libres.
  await rest('cash_register_sessions?status=eq.open', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'closed', closed_at: new Date().toISOString() }),
  })
  await rest('restaurant_tables?status=neq.libre', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'libre', current_order_id: null }),
  })

  ;[{ id: perfil }] = await rest('profiles?select=id&role=eq.admin&limit=1')
  ;[{ id: sesion }] = await rest('cash_register_sessions', {
    method: 'POST',
    body: JSON.stringify({ opened_by: perfil, opening_balance: 20_000, status: 'open' }),
  })
  // Un producto propio: cobrar descuenta stock, y el de la base es de otro.
  const [categoria] = await rest('categories?select=id&limit=1')
  ;[producto] = await rest('products', {
    method: 'POST',
    body: JSON.stringify({ name: 'ZZ Caja prueba', price: 16_500, product_type: 'elaborado',
      category_id: categoria.id, is_active: true, stock_tracking_enabled: false }),
  })
})

test.afterAll(async () => {
  try {
    await limpiarPedidos()
    if (sesion) await rest(`cash_register_sessions?id=eq.${sesion}`, { method: 'DELETE' })
    if (producto.id) {
      await rest(`stock_movements?product_id=eq.${producto.id}`, { method: 'DELETE' }).catch(() => {})
      await rest(`products?id=eq.${producto.id}`, { method: 'DELETE' })
    }
  } finally {
    if (fs.existsSync(RESPALDO)) {
      await restaurar(JSON.parse(fs.readFileSync(RESPALDO, 'utf8')))
      fs.rmSync(RESPALDO)
    }
  }
})

test.describe.configure({ mode: 'serial' })

// ─── Historial ──────────────────────────────────────────────────────────────

test('el Historial no muestra como cobrado lo que no se cobro', async ({ page }) => {
  await prepararTurno({ mostrador: true, cobrado: true, mesa: true })
  await abrirCaja(page)
  await page.getByRole('button', { name: /^Historial/ }).click()

  const filas = page.locator('tbody tr')
  const pendiente = filas.filter({ hasText: `$ ${TOTAL_PENDIENTE.toLocaleString('es-AR')}` }).first()
  const mesa = filas.filter({ hasText: `Mesa ${MESA}` }).first()
  const cobrado = filas.filter({ hasText: `$ ${TOTAL_COBRADO.toLocaleString('es-AR')}` }).first()

  for (const [nombre, fila] of [['pendiente', pendiente], ['mesa', mesa]] as const) {
    await expect(fila, `${nombre}: dice Sin cobrar`).toContainText('Sin cobrar')
    await expect(fila, `${nombre}: no muestra un medio de pago`).not.toContainText('Efectivo')
    await expect(fila, `${nombre}: no dice Pagado`).not.toContainText('Pagado')
  }
  await expect(cobrado).toContainText('Pagado')
  await expect(cobrado).toContainText('Efectivo')

  // El total de la sesion es solo lo cobrado, y es el "Vendido" de la barra.
  const total = page.getByText('Total sesión').locator('..')
  await expect(total).toContainText('$ 42.000')
  await expect(page.getByText('Vendido').locator('..')).toContainText('$ 42.000')

  await page.getByRole('button', { name: /^Sin cobrar/ }).click()
  await expect(filas, 'el filtro deja solo los dos que faltan cobrar').toHaveCount(2)
})

// ─── Cobro ──────────────────────────────────────────────────────────────────

test('el vuelto se ve mientras se tipea', async ({ page }) => {
  const { mostrador } = await prepararTurno({ mostrador: true })
  await abrirCaja(page)
  await page.getByRole('button', { name: new RegExp(`^#${mostrador}\\b`) }).click()
  await page.getByRole('button', { name: /^Efectivo/ }).click()

  const monto = page.locator('input').filter({ visible: true }).last()
  await monto.fill('20000')
  // Sin salir del campo: el foco sigue ahi.
  await expect(monto).toBeFocused()
  await expect(page.getByText('Recibís').locator('..')).toContainText('$ 20.000')
  await expect(page.getByText('Vuelto').locator('..')).toContainText('$ 3.000')
})

test('se cobra lo que se estaba viendo', async ({ page }) => {
  const { mostrador } = await prepararTurno({ mostrador: true })
  await abrirCaja(page)
  await page.getByRole('button', { name: new RegExp(`^#${mostrador}\\b`) }).click()
  await page.getByRole('button', { name: /^Efectivo/ }).click()
  await page.locator('input').filter({ visible: true }).last().fill('20000')
  await expect(page.getByText('Vuelto').locator('..')).toContainText('$ 3.000')

  // Sin salir del campo, directo a cobrar.
  await page.getByRole('button', { name: /^Cobrar \$/ }).click()
  await expect.poll(async () => {
    const [o] = await rest(`orders?order_number=eq.${mostrador}&cash_register_session_id=eq.${sesion}&select=status,payment_method,total`)
    return o
  }, { timeout: 15_000 }).toMatchObject({ status: 'pagado', payment_method: 'cash', total: TOTAL_PENDIENTE })
  const [s] = await rest(`cash_register_sessions?id=eq.${sesion}&select=total_cash_sales`)
  expect(s.total_cash_sales, 'entra el total, no lo recibido').toBe(TOTAL_PENDIENTE)
})

// ─── Cierre ─────────────────────────────────────────────────────────────────

test('Enter en el contado no cierra con una mesa abierta', async ({ page }) => {
  await prepararTurno({ mesa: true })
  await abrirCaja(page)
  await abrirCierre(page)
  await campoContado(page).fill('20000')
  await campoContado(page).press('Enter')
  await page.waitForTimeout(2_000)

  expect(await estadoDeLaSesion(), 'el turno sigue abierto').toBe('open')
  const bloqueos = page.getByRole('region', { name: 'Lo que impide cerrar' })
  await expect(bloqueos).toContainText(`Mesa ${MESA}`)
  await expect(bloqueos).toContainText('$ 33.000')
})

test('un pedido de mostrador sin cobrar bloquea el cierre y figura junto al boton', async ({ page }) => {
  const { mostrador } = await prepararTurno({ mostrador: true })
  await abrirCaja(page)
  await abrirCierre(page)
  await campoContado(page).fill('20000')

  const bloqueos = page.getByRole('region', { name: 'Lo que impide cerrar' })
  await expect(bloqueos).toContainText(`#${mostrador}`)
  await expect(bloqueos).toContainText('$ 17.000')
  await expect(page.getByRole('button', { name: /Confirmar Cierre/ })).toBeDisabled()
  await campoContado(page).press('Enter')
  await page.waitForTimeout(1_500)
  expect(await estadoDeLaSesion()).toBe('open')
})

test('el servidor rechaza el cierre aunque la pantalla no lo impida', async ({ page }) => {
  await prepararTurno({})
  await abrirCaja(page)
  await abrirCierre(page)
  // La pantalla ya esta abierta cuando se abre la mesa: no se entera.
  await prepararTurno({ mesa: true })
  await campoContado(page).fill('20000')
  await page.getByRole('button', { name: /Confirmar Cierre/ }).click()
  await page.waitForTimeout(2_000)

  expect(await estadoDeLaSesion(), 'el turno sigue abierto').toBe('open')
  await expect(page.getByRole('alert').filter({ hasText: 'No se puede cerrar' })).toContainText(`Mesa ${MESA}`)
})

test('el efectivo esperado muestra de donde sale', async ({ page }) => {
  await prepararTurno({}, { total_cash_sales: 26_000, total_sales: 26_000, total_withdrawals: 5_000 })
  await abrirCaja(page)
  await abrirCierre(page)

  const desglose = page.getByRole('region', { name: 'Efectivo esperado' })
  await expect(desglose.getByText('Apertura').locator('..')).toContainText('$ 20.000')
  await expect(desglose.getByText('Ventas en efectivo').locator('..')).toContainText('$ 26.000')
  await expect(desglose.getByText('Retiros').locator('..')).toContainText('$ 5.000')
  await expect(desglose, 'lo que no hubo no ocupa lugar').not.toContainText('Ingresos')
  await expect(desglose.getByText('Efectivo esperado').locator('..')).toContainText('$ 41.000')
})

test('un pedido de WhatsApp sin cobrar avisa pero no bloquea', async ({ page }) => {
  await prepararTurno({ remoto: true })
  await abrirCaja(page)
  await abrirCierre(page)
  await expect(page.getByText(/pedido.* de WhatsApp o web sin cobrar/i)).toBeVisible()
  await campoContado(page).fill('20000')
  await page.getByRole('button', { name: /Confirmar Cierre/ }).click()
  await expect.poll(estadoDeLaSesion, { timeout: 10_000 }).toBe('closed')
})
