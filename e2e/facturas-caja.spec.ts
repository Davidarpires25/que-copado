import { test, expect, type Page } from '@playwright/test'
import { rest, asegurarUsuario } from './local'
import { entrar, abrir, resaltadosDeLaTabla } from './panel'
import { estacionarTurno, devolverTurno } from './turno'
import { levantarArcaSimulado, PUERTO_ARCA_SIMULADO, type ArcaSimulado } from './arca-simulado'

/**
 * La caja factura al cobrar (change la-caja-emite-factura-c, tareas 4.2, 4.3
 * y 5.0), contra el ARCA simulado que el servidor de los tests tiene
 * configurado (playwright.config.ts).
 *
 * Lo que haya en la base local —la sesión y las mesas de quien esté probando
 * la caja a mano— se estaciona y se devuelve intacto (`e2e/turno.ts`). Los
 * datos fiscales y el ticket de ARCA que hubiera también se guardan aparte.
 */

test.setTimeout(120_000)
test.describe.configure({ mode: 'serial' })

const TURNO = 'facturas-caja'
const CUIT_LOCAL = '20111111112'
const PV = 7
const TOTAL = 12_500
let sesion = ''
let producto = { id: '', name: '' }
let arca: ArcaSimulado
let respaldoDatos: unknown[] = []
let respaldoTicket: unknown[] = []
const creados: string[] = []

async function limpiarPedidos() {
  if (!sesion) return
  const deLaSesion: { id: string }[] = await rest(`orders?cash_register_session_id=eq.${sesion}&select=id`)
  const ids = [...new Set([...creados, ...deLaSesion.map((o) => o.id)])]
  for (const id of ids) {
    await rest(`facturas?order_id=eq.${id}&tipo=eq.13`, { method: 'DELETE' })
    await rest(`facturas?order_id=eq.${id}`, { method: 'DELETE' })
    const comandas: { id: string }[] = await rest(`comandas?order_id=eq.${id}&select=id`)
    for (const c of comandas) await rest(`comanda_items?comanda_id=eq.${c.id}`, { method: 'DELETE' })
    await rest(`comandas?order_id=eq.${id}`, { method: 'DELETE' })
    await rest(`print_jobs?data->>orderId=eq.${id}`, { method: 'DELETE' })
    await rest(`payment_splits?order_id=eq.${id}`, { method: 'DELETE' })
    await rest(`order_items?order_id=eq.${id}`, { method: 'DELETE' })
    await rest(`orders?id=eq.${id}`, { method: 'DELETE' })
  }
  creados.length = 0
}

/** Un pedido de mostrador enviado a cocina, sin cobrar. Devuelve su número. */
async function pedidoPendiente(): Promise<{ id: string; numero: number }> {
  await limpiarPedidos()
  const [o] = await rest('orders', {
    method: 'POST',
    body: JSON.stringify({
      order_source: 'pos', cash_register_session_id: sesion, payment_method: 'cash', order_type: 'mostrador',
      status: 'abierto', total: TOTAL,
      items: [{ id: producto.id, name: producto.name, price: TOTAL, quantity: 1, notes: null, metadata: null }],
    }),
  })
  creados.push(o.id)
  await rest('order_items', {
    method: 'POST',
    body: JSON.stringify({ order_id: o.id, product_id: producto.id, product_name: producto.name, product_price: TOTAL, quantity: 1 }),
  })
  await rest(`cash_register_sessions?id=eq.${sesion}`, {
    method: 'PATCH',
    body: JSON.stringify({ opening_balance: 20_000, total_sales: 0, total_cash_sales: 0, total_orders: 0, total_card_sales: 0,
      total_transfer_sales: 0, status: 'open', closed_at: null }),
  })
  return { id: o.id, numero: o.order_number }
}

async function facturacion(cambios: Record<string, unknown>) {
  await rest('datos_fiscales?id=eq.true', { method: 'PATCH', body: JSON.stringify(cambios) })
}

async function cobrar(page: Page, numero: number, medio: 'Tarjeta' | 'Efectivo') {
  await entrar(page)
  await abrir(page, '/admin/caja')
  await expect(page.getByRole('button', { name: /^Mostrador/ })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: new RegExp(`^#${numero}\\b`) }).click()
  await page.getByRole('button', { name: new RegExp(`^${medio}`) }).click()
  if (medio === 'Efectivo') await page.locator('input').filter({ visible: true }).last().fill(String(TOTAL))
  await page.getByRole('button', { name: /^Cobrar \$/ }).click()
}

const aviso = (page: Page) => page.locator('[data-sonner-toast]').first()
const facturasDe = (id: string) => rest(`facturas?order_id=eq.${id}&select=tipo,estado,punto_venta,numero,cae,total,motivo,asociada_a&order=created_at`)

test.beforeAll(async () => {
  await asegurarUsuario()
  arca = await levantarArcaSimulado(PUERTO_ARCA_SIMULADO)
  respaldoDatos = await rest('datos_fiscales?select=*')
  respaldoTicket = await rest('arca_ticket_de_acceso?select=*')
  await rest('arca_ticket_de_acceso?servicio=neq.x', { method: 'DELETE' })
  await rest('datos_fiscales', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      id: true, activa: true, razon_social: 'ZZ Local', cuit: CUIT_LOCAL, punto_venta: PV,
      domicilio_comercial: 'Calle 1', inicio_actividades: '2020-01-01',
      // Efectivo sin tildar: se factura a mano.
      medios_automaticos: ['card', 'transfer', 'mercadopago'],
    }),
  })
  sesion = await estacionarTurno(TURNO)
  const [categoria] = await rest('categories?select=id&limit=1')
  ;[producto] = await rest('products', {
    method: 'POST',
    body: JSON.stringify({ name: 'ZZ Factura prueba', price: TOTAL, product_type: 'elaborado', category_id: categoria.id,
      is_active: true, stock_tracking_enabled: false }),
  })
})

test.afterAll(async () => {
  try {
    await limpiarPedidos()
    if (producto.id) {
      await rest(`stock_movements?product_id=eq.${producto.id}`, { method: 'DELETE' }).catch(() => {})
      await rest(`products?id=eq.${producto.id}`, { method: 'DELETE' })
    }
    await rest('datos_fiscales?id=eq.true', { method: 'DELETE' })
    if (respaldoDatos.length) await rest('datos_fiscales', { method: 'POST', body: JSON.stringify(respaldoDatos) })
    await rest('arca_ticket_de_acceso?servicio=neq.x', { method: 'DELETE' })
    if (respaldoTicket.length) await rest('arca_ticket_de_acceso', { method: 'POST', body: JSON.stringify(respaldoTicket) })
  } finally {
    await arca?.cerrar()
    await devolverTurno(TURNO, sesion)
  }
})

test.beforeEach(async () => {
  arca.modo = 'normal'
  arca.pedidos = {}
  arca.ultimos.clear()
  await facturacion({ activa: true })
})

test('5.0 con la facturación apagada, el cobro es el de siempre y no se habla con ARCA', async ({ page }) => {
  await facturacion({ activa: false })
  const { id, numero } = await pedidoPendiente()
  await cobrar(page, numero, 'Tarjeta')
  await expect(aviso(page)).toHaveText('Pago registrado')
  expect(await facturasDe(id)).toEqual([])
  expect(arca.pedidos).toEqual({})
})

test('4.2 cobrar con tarjeta factura, y el cajero ve el número', async ({ page }) => {
  const { id, numero } = await pedidoPendiente()
  await cobrar(page, numero, 'Tarjeta')
  await expect(aviso(page)).toHaveText('Pago registrado · Factura C 0007-00000001', { timeout: 15_000 })
  const [f] = await facturasDe(id)
  expect(f).toMatchObject({ tipo: 11, estado: 'emitida', punto_venta: PV, numero: 1, total: TOTAL })
})

test('4.2 cobrar en efectivo, que no está tildado, no factura', async ({ page }) => {
  const { id, numero } = await pedidoPendiente()
  await cobrar(page, numero, 'Efectivo')
  await expect(aviso(page)).toHaveText('Pago registrado')
  expect(await facturasDe(id)).toEqual([])
  expect(arca.pedidos.FECAESolicitar ?? 0).toBe(0)
})

test('4.2 ARCA no contesta: el pedido queda cobrado y la factura pendiente, a la vista', async ({ page }) => {
  const { id, numero } = await pedidoPendiente()
  arca.modo = 'no-contesta'
  await cobrar(page, numero, 'Tarjeta')
  await expect(aviso(page)).toContainText('Pago registrado. La factura quedó pendiente: ARCA no respondió a tiempo.', { timeout: 15_000 })
  const [o] = await rest(`orders?id=eq.${id}&select=status`)
  expect(o.status).toBe('pagado')
  const [f] = await facturasDe(id)
  expect(f).toMatchObject({ estado: 'pendiente', motivo: 'ARCA no respondió a tiempo.' })
})

test('4.3 anular un pedido facturado emite su nota de crédito', async ({ page }) => {
  const { id, numero } = await pedidoPendiente()
  await cobrar(page, numero, 'Tarjeta')
  await expect(aviso(page)).toContainText('Factura C 0007-00000001', { timeout: 15_000 })

  await page.getByRole('button', { name: /^Historial/ }).click()
  // La fila del pedido (el Historial no muestra el número): se abre para ver sus acciones.
  await page.getByText(`1x ${producto.name}`).first().click()
  await page.getByRole('button', { name: 'Anular' }).first().click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Anular' }).click()

  await expect(page.getByText('Pedido cancelado · Nota de crédito C 0007-00000001')).toBeVisible({ timeout: 15_000 })
  const [factura, nota] = await facturasDe(id)
  expect(nota).toMatchObject({ tipo: 13, estado: 'emitida', total: TOTAL })
  expect(nota.asociada_a).toBeTruthy()
  expect(factura.estado).toBe('emitida')
})

// ─── Historial (tarea 5.2) ──────────────────────────────────────────────────

async function abrirHistorial(page: Page) {
  await page.getByRole('button', { name: /^Historial/ }).click()
  await expect(page.getByText(`1x ${producto.name}`).first()).toBeVisible()
}

test('5.2 una factura pendiente se ve en el Historial, con su motivo, y se reintenta', async ({ page }) => {
  const { id, numero } = await pedidoPendiente()
  arca.modo = 'no-contesta'
  await cobrar(page, numero, 'Tarjeta')
  await expect(aviso(page)).toContainText('La factura quedó pendiente', { timeout: 15_000 })
  arca.modo = 'normal'

  await abrirHistorial(page)
  const fila = page.locator('tbody tr').filter({ hasText: `1x ${producto.name}` }).first()
  await expect(fila).toContainText('Factura pendiente')
  // Sin encerrar: el estado es texto (spec tablas-del-admin).
  expect(await resaltadosDeLaTabla(page)).toEqual([])

  await fila.click()
  await expect(page.locator('tbody').getByText('ARCA no respondió a tiempo.')).toBeVisible()
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('Factura C 0007-00000001').first()).toBeVisible({ timeout: 15_000 })
  const [f] = await facturasDe(id)
  expect(f.estado).toBe('emitida')
})

test('5.2 un cobro en efectivo, que no se factura solo, se factura desde el Historial', async ({ page }) => {
  const { id, numero } = await pedidoPendiente()
  await cobrar(page, numero, 'Efectivo')
  await expect(aviso(page)).toHaveText('Pago registrado')

  await abrirHistorial(page)
  await page.getByText(`1x ${producto.name}`).first().click()
  await page.getByRole('button', { name: 'Facturar' }).click()
  await expect(page.locator('tbody tr').first()).toContainText('Factura C 0007-00000001', { timeout: 15_000 })
  expect((await facturasDe(id))[0]).toMatchObject({ estado: 'emitida', numero: 1 })
})

test('5.2 con la facturación apagada, el Historial no ofrece facturar', async ({ page }) => {
  await facturacion({ activa: false })
  const { numero } = await pedidoPendiente()
  await cobrar(page, numero, 'Efectivo')
  await expect(aviso(page)).toHaveText('Pago registrado')
  await abrirHistorial(page)
  await page.getByText(`1x ${producto.name}`).first().click()
  await expect(page.getByRole('button', { name: 'Anular' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Facturar' })).toHaveCount(0)
})

// ─── Cierre (tarea 5.3) ─────────────────────────────────────────────────────

test('5.3 el cierre nombra las facturas sin emitir del turno, sin bloquearlo', async ({ page }) => {
  const { numero } = await pedidoPendiente()
  arca.modo = 'no-contesta'
  await cobrar(page, numero, 'Tarjeta')
  await expect(aviso(page)).toContainText('La factura quedó pendiente', { timeout: 15_000 })

  await page.getByRole('button', { name: 'Cerrar caja' }).click()
  await expect(page.getByText('Efectivo esperado')).toBeVisible()
  await expect(page.getByText('Hay 1 factura de este turno sin emitir. No impide cerrar: reintentala desde el Historial.')).toBeVisible()
  // Avisa, no impide: con el efectivo contado —que el cierre pide siempre—, se puede cerrar.
  await page.getByLabel('Efectivo contado').fill('20000')
  await expect(page.getByRole('button', { name: 'Confirmar Cierre' })).toBeEnabled()
})

// ─── El papel (tarea 5.4) ───────────────────────────────────────────────────

test('5.4 el ticket de un pedido facturado es la factura: al puente y en el navegador', async ({ page }) => {
  const { id, numero } = await pedidoPendiente()
  await cobrar(page, numero, 'Tarjeta')
  await expect(aviso(page)).toContainText('Factura C 0007-00000001', { timeout: 15_000 })

  // Al puente de impresión: el ticket lleva `factura`, con el QR de ARCA.
  await abrirHistorial(page)
  await page.getByText(`1x ${producto.name}`).first().click()
  await page.getByRole('button', { name: 'Ticket' }).click()
  await expect.poll(async () => (await rest(`print_jobs?data->>orderId=eq.${id}&select=data`)).length, { timeout: 10_000 }).toBe(1)
  const [{ data: ticket }] = await rest(`print_jobs?data->>orderId=eq.${id}&select=data`)
  expect(ticket.factura).toMatchObject({
    tipo: 'Factura C',
    codigo: '011',
    numero: '0007-00000001',
    receptor: 'Consumidor Final',
    emisor: { razonSocial: 'ZZ Local', cuit: '20-11111111-2', condicion: 'Responsable Monotributo' },
  })
  const json = JSON.parse(Buffer.from(ticket.factura.qr.split('?p=')[1], 'base64').toString('utf8'))
  expect(json).toMatchObject({ ver: 1, cuit: 20111111112, ptoVta: PV, tipoCmp: 11, nroCmp: 1, importe: TOTAL, tipoCodAut: 'E' })

  // En el navegador: "Ver factura" lleva al ticket con el bloque fiscal y el QR.
  const [factura] = await rest(`facturas?order_id=eq.${id}&select=id`)
  await page.addInitScript(() => { window.print = () => {} })
  await page.goto(`/admin/facturas/${factura.id}/print`)
  const bloque = page.locator('[data-bloque-fiscal]')
  await expect(bloque).toContainText('Factura C · Cód. 011', { timeout: 20_000 })
  await expect(bloque).toContainText('N° 0007-00000001')
  await expect(page.locator('#ticket-root')).toContainText('Comprobante autorizado por ARCA')
  await expect(page.locator('#ticket-root svg')).toHaveCount(1)
  await page.locator('#ticket-root').screenshot({ path: 'test-results/factura-ticket.png' })
})

test('5.4 el ticket de un pedido sin factura no lleva bloque fiscal', async ({ page }) => {
  await facturacion({ activa: false })
  const { id, numero } = await pedidoPendiente()
  await cobrar(page, numero, 'Tarjeta')
  await expect(aviso(page)).toHaveText('Pago registrado')
  await page.addInitScript(() => { window.print = () => {} })
  await page.goto(`/admin/caja/ticket/${id}/print`)
  await expect(page.locator('#ticket-root')).toContainText('TOTAL', { timeout: 20_000 })
  await expect(page.locator('[data-bloque-fiscal]')).toHaveCount(0)
})
