import { test, expect, type Page, type Browser } from '@playwright/test'
import { rest, asegurarUsuario } from './local'
import { entrar, abrir } from './panel'
import { estacionarTurno, devolverTurno } from './turno'

/**
 * La caja se usa de memoria: cada producto en el mismo lugar, las categorias a
 * la vista, nada que tape la pantalla, el carrito que se lee entero, y el
 * cierre de un vistazo.
 *
 * Siembra un menu realista —el de la auditoria de diseño: 6 categorias mas las
 * que haya, unos 30 productos, una mitad y mitad— con ids de prefijo propio,
 * y lo borra al final. El turno que haya se estaciona y se devuelve intacto
 * (`e2e/turno.ts`).
 */

test.setTimeout(120_000)
test.describe.configure({ mode: 'serial' })

const TURNO = 'caja-de-memoria'
let sesion = ''

const cat = (n: number) => `ac000000-0000-0000-0000-00000000000${n}`
const CATEGORIAS = [
  { id: cat(1), name: 'ZZ Combos', slug: 'zz-combos', sort_order: 0, color: '#E4572E' },
  { id: cat(2), name: 'ZZ Lomos', slug: 'zz-lomos', sort_order: 4, color: '#A1674A' },
  { id: cat(3), name: 'ZZ Pizzas', slug: 'zz-pizzas', sort_order: 5, color: '#D1495B' },
  { id: cat(4), name: 'ZZ Empanadas', slug: 'zz-empanadas', sort_order: 6, color: '#EDAE49' },
  { id: cat(5), name: 'ZZ Postres', slug: 'zz-postres', sort_order: 7, color: '#C08497' },
  { id: cat(6), name: 'ZZ Cervezas', slug: 'zz-cervezas', sort_order: 8, color: '#00798C' },
]
const COMBO_CLASICO = 'Combo Clásico (burger + papas + gaseosa)'
const PRODUCTOS: [string, number, string, Record<string, unknown>?][] = [
  [COMBO_CLASICO, 14_500, cat(1)],
  ['Combo Doble Cheddar', 17_900, cat(1)],
  ['Combo Familiar 4 personas', 42_000, cat(1)],
  ['Combo Kids', 9_800, cat(1)],
  ['Lomo completo', 16_500, cat(2)],
  ['Lomo simple', 13_000, cat(2)],
  ['Pizza muzzarella', 11_500, cat(3)],
  ['Pizza napolitana', 13_500, cat(3)],
  ['Fugazzeta rellena', 15_500, cat(3)],
  ['Pizza mitad y mitad', 0, cat(3), { product_type: 'mitad' }],
  ['Empanada carne cortada a cuchillo', 1_800, cat(4)],
  ['Docena de empanadas', 19_000, cat(4)],
  ['Flan con dulce de leche', 4_500, cat(5)],
  ['Brownie con helado', 6_200, cat(5)],
  ['Cerveza Quilmes 1L', 6_000, cat(6)],
  ['Cerveza IPA tirada pinta', 5_500, cat(6)],
]
const pid = (i: number) => `ad000000-0000-0000-0000-${String(i).padStart(12, '0')}`
const MITAD = pid(PRODUCTOS.findIndex(([n]) => n === 'Pizza mitad y mitad') + 1)
const AGREGADO = pid(99)

test.beforeAll(async () => {
  await asegurarUsuario()
  await limpiarMenu()
  sesion = await estacionarTurno(TURNO)
  await rest('categories', { method: 'POST', body: JSON.stringify(CATEGORIAS) })
  await rest('products', {
    method: 'POST',
    body: JSON.stringify(PRODUCTOS.map(([name, price, category_id, extra], i) => ({
      id: pid(i + 1), name, price, category_id, is_active: true, product_type: 'elaborado',
      station: 'cocina', stock_tracking_enabled: false, ...(extra ?? {}),
    }))),
  })
  await rest('product_half_configs', { method: 'POST', body: JSON.stringify({ product_id: MITAD, pricing_method: 'max' }) })
})

async function limpiarMenu() {
  await rest(`product_half_configs?product_id=eq.${MITAD}`, { method: 'DELETE' })
  for (let i = 1; i <= PRODUCTOS.length; i++) await rest(`products?id=eq.${pid(i)}`, { method: 'DELETE' })
  await rest(`products?id=eq.${AGREGADO}`, { method: 'DELETE' })
  await rest('categories?slug=like.zz-*', { method: 'DELETE' })
}

/** Los pedidos que haya abierto el test en su turno (abrir una mesa crea uno). */
async function limpiarPedidos() {
  if (!sesion) return
  await rest('restaurant_tables?status=neq.libre', { method: 'PATCH', body: JSON.stringify({ status: 'libre', current_order_id: null }) })
  const pedidos: { id: string }[] = await rest(`orders?cash_register_session_id=eq.${sesion}&select=id`)
  for (const { id } of pedidos) {
    const comandas: { id: string }[] = await rest(`comandas?order_id=eq.${id}&select=id`)
    for (const c of comandas) await rest(`comanda_items?comanda_id=eq.${c.id}`, { method: 'DELETE' })
    await rest(`comandas?order_id=eq.${id}`, { method: 'DELETE' })
    await rest(`print_jobs?data->>orderId=eq.${id}`, { method: 'DELETE' })
    await rest(`order_items?order_id=eq.${id}`, { method: 'DELETE' })
    await rest(`orders?id=eq.${id}`, { method: 'DELETE' })
  }
}

test.afterAll(async () => {
  try {
    await limpiarPedidos()
    await limpiarMenu()
  } finally {
    await devolverTurno(TURNO, sesion)
  }
})

async function pagina(browser: Browser, ancho: number, alto: number, tactil = false) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, hasTouch: tactil, isMobile: tactil })
  const page = await ctx.newPage()
  await entrar(page)
  await abrir(page, '/admin/caja')
  await expect(page.getByRole('button', { name: /^Mostrador/ })).toBeVisible({ timeout: 20_000 })
  return { ctx, page }
}

/** La tarjeta de un producto, por su nombre (la insignia de cantidad va antes). */
const tarjeta = (page: Page, nombre: string) =>
  page.locator('[data-grilla-productos] > button')
    .filter({ has: page.locator('p').getByText(nombre, { exact: true }) })
    .first()

/** Los nombres de las tarjetas de la grilla, en el orden en que se ven. */
const nombresDeLaGrilla = (page: Page) =>
  page.locator('[data-grilla-productos] > button').evaluateAll((bs) =>
    bs.map((b) => (b.querySelector('p')?.textContent ?? '').trim()))

// ─── Orden ──────────────────────────────────────────────────────────────────

test('en Todos los productos van agrupados en el orden de las categorias', async ({ browser }) => {
  const { ctx, page } = await pagina(browser, 1366, 768)
  const nombres = await nombresDeLaGrilla(page)

  const productos: { name: string; category_id: string }[] = await rest('products?select=name,category_id&is_active=eq.true&is_out_of_stock=eq.false')
  const categorias: { id: string; sort_order: number }[] = await rest('categories?select=id,sort_order')
  const orden = Object.fromEntries(categorias.map((c) => [c.id, c.sort_order]))
  const deCategoria = Object.fromEntries(productos.map((p) => [p.name, orden[p.category_id] ?? 999]))
  const secuencia = nombres.map((n) => deCategoria[n])

  expect(secuencia, 'la categoria nunca vuelve atras').toEqual([...secuencia].sort((a, b) => a - b))
  await ctx.close()
})

test('un producto nuevo no mueve de lugar a los de otra categoria', async ({ browser }) => {
  const { ctx, page } = await pagina(browser, 1366, 768)
  const antes = await nombresDeLaGrilla(page)
  const combos = antes.filter((n) => n.startsWith('Combo'))
  const posiciones = combos.map((c) => antes.indexOf(c))

  // Una bebida que alfabeticamente va antes que todos los combos.
  await rest('products', {
    method: 'POST',
    body: JSON.stringify({ id: AGREGADO, name: 'Agua con gas', price: 2_000, category_id: CATEGORIAS[5].id,
      is_active: true, product_type: 'reventa' }),
  })
  await abrir(page, '/admin/caja')
  await expect(page.getByRole('button', { name: /^Mostrador/ })).toBeVisible({ timeout: 20_000 })
  const despues = await nombresDeLaGrilla(page)
  expect(combos.map((c) => despues.indexOf(c))).toEqual(posiciones)

  await rest(`products?id=eq.${AGREGADO}`, { method: 'DELETE' })
  await ctx.close()
})

// ─── Categorias ─────────────────────────────────────────────────────────────

test('en la netbook se ven todas las categorias sin deslizar', async ({ browser }) => {
  const { ctx, page } = await pagina(browser, 1366, 768)
  const fila = page.locator('[data-categorias]')
  const afuera = await fila.locator('button').evaluateAll((bs) =>
    bs.filter((b) => {
      const r = b.getBoundingClientRect()
      const f = b.parentElement!.getBoundingClientRect()
      return r.right > f.right + 1 || r.left < f.left - 1 || r.right > window.innerWidth
    }).map((b) => b.textContent?.trim()))
  expect(afuera, 'categorias fuera de la vista').toEqual([])
  await ctx.close()
})

test('en el celular la fila avisa que hay mas categorias', async ({ browser }) => {
  const { ctx, page } = await pagina(browser, 390, 844, true)
  await expect(page.locator('[data-categorias]')).toHaveAttribute('data-hay-mas', 'true')
  await ctx.close()
})

// ─── Avisos ─────────────────────────────────────────────────────────────────

test('agregar un producto no tira un aviso', async ({ browser }) => {
  const { ctx, page } = await pagina(browser, 1366, 768)
  await tarjeta(page, 'Combo Kids').click()
  await tarjeta(page, 'Combo Kids').click()
  // Una sola medicion, enseguida: `toHaveCount(0)` reintenta y el aviso dura
  // un segundo, asi que esperaria a que se vaya y pasaria igual.
  await page.waitForTimeout(300)
  expect(await page.locator('[data-sonner-toast]').count(), 'ningun aviso en pantalla').toBe(0)
  await expect(tarjeta(page, 'Combo Kids'), 'la tarjeta muestra la cantidad').toContainText('2')
  await ctx.close()
})

// ─── Carrito ────────────────────────────────────────────────────────────────

test('el carrito se lee entero en la netbook', async ({ browser }) => {
  const { ctx, page } = await pagina(browser, 1366, 768)
  await tarjeta(page, COMBO_CLASICO).click()
  await tarjeta(page, COMBO_CLASICO).click()
  await tarjeta(page, 'Lomo simple').click()

  const renglon = page.locator('[data-renglon-carrito]').filter({ hasText: COMBO_CLASICO })
  const monto = await renglon.getByText('$ 29.000', { exact: true }).boundingBox()
  const quitar = await renglon.getByRole('button', { name: 'Eliminar producto' }).boundingBox()
  const cruzan = !!monto && !!quitar &&
    monto.x < quitar.x + quitar.width && quitar.x < monto.x + monto.width &&
    monto.y < quitar.y + quitar.height && quitar.y < monto.y + monto.height
  expect(cruzan, 'el monto no se monta sobre el boton de quitar').toBe(false)

  const cortado = await renglon.getByText(COMBO_CLASICO, { exact: true }).evaluate((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
  expect(cortado, 'el nombre se lee completo').toBe(false)
  await ctx.close()
})

test('en tablet vertical la grilla usa todo el ancho y el pedido va en la hoja', async ({ browser }) => {
  const { ctx, page } = await pagina(browser, 820, 1180, true)
  await expect(page.getByRole('heading', { name: /^(Sin pedido|Pedido actual)$/ })).toBeHidden()
  await tarjeta(page, 'Combo Kids').click()
  await expect(page.getByRole('button', { name: /productos? ·/ })).toBeVisible()
  await ctx.close()
})

// ─── Media pizza ────────────────────────────────────────────────────────────

test('la mitad y mitad dice desde cuanto sale', async ({ browser }) => {
  const { ctx, page } = await pagina(browser, 1366, 768)
  const t = tarjeta(page, 'Pizza mitad y mitad')
  // Precio "el mayor de las dos": lo mas barato es muzzarella + napolitana.
  await expect(t).toContainText('desde')
  await expect(t).toContainText('$ 13.500')
  await expect(t).not.toContainText('$ 0')
  await ctx.close()
})

// ─── Cierre ─────────────────────────────────────────────────────────────────

test('el cierre se ve entero de un vistazo en la netbook', async ({ browser }) => {
  await rest(`cash_register_sessions?id=eq.${sesion}`, {
    method: 'PATCH',
    body: JSON.stringify({ total_sales: 41_500, total_orders: 3, total_cash_sales: 26_000, total_card_sales: 15_500 }),
  })
  const { ctx, page } = await pagina(browser, 1366, 768)
  await page.getByRole('button', { name: 'Cerrar caja' }).click()
  const panel = page.getByRole('region', { name: 'Cierre de caja' })
  await expect(panel).toBeVisible()
  await page.locator('input[inputmode="decimal"]').filter({ visible: true }).first().fill('40000')

  const dentro = async (l: ReturnType<Page['locator']>, que: string) => {
    const b = await l.boundingBox()
    expect(b, `${que}: se ve`).not.toBeNull()
    expect(b!.y + b!.height, `${que}: sin desplazar`).toBeLessThanOrEqual(768)
  }
  await dentro(panel.getByText('Faltante'), 'la diferencia')
  await dentro(panel.getByRole('button', { name: /Confirmar Cierre/ }), 'el boton')
  await dentro(panel.getByText('Ticket promedio'), 'el resumen del turno')

  await expect(panel).not.toContainText('p. m.')
  await expect(panel).not.toContainText('a. m.')
  await expect(panel.getByText('Ticket promedio').locator('..')).toContainText('$ 13.833')
  await expect(panel.getByText('Ticket promedio').locator('..')).not.toContainText(',')
  await ctx.close()
})

// ─── Controles ──────────────────────────────────────────────────────────────

test('el mas y el menos miden lo mismo en el mostrador y en la mesa', async ({ browser }) => {
  // Las mesas quedan libres al estacionar: la que se abre es del test.
  const { ctx, page } = await pagina(browser, 1366, 768)
  await tarjeta(page, 'Combo Kids').click()
  const mostrador = await page.getByRole('button', { name: 'Aumentar' }).first().boundingBox()

  await page.getByRole('button', { name: /^Mesas/ }).click()
  await page.getByRole('button', { name: /Mesa 1\b/ }).first().click()
  await page.getByRole('button', { name: /Agregar Items/ }).click()
  await tarjeta(page, 'Lomo simple').click()
  const mesa = await page.getByRole('button', { name: 'Aumentar' }).filter({ visible: true }).last().boundingBox()

  expect(mostrador && mesa, 'los dos se ven').toBeTruthy()
  expect(mesa!.height).toBe(mostrador!.height)
  expect(mesa!.width).toBe(mostrador!.width)
  await ctx.close()
})

test('los textos de la escala miden lo que dicen aunque pasen por cn()', async ({ browser }) => {
  // tailwind-merge tomaba `text-panel-sm` por un color y, junto a otro color,
  // lo borraba: el chip de pendientes y los medios de pago salian a 16px.
  const [o] = await rest('orders', {
    method: 'POST',
    body: JSON.stringify({ order_source: 'pos', cash_register_session_id: sesion, payment_method: 'cash',
      order_type: 'mostrador', status: 'abierto', total: 9_800,
      items: [{ id: pid(4), name: 'Combo Kids', price: 9_800, quantity: 1, notes: null, metadata: null }] }),
  })
  await rest('order_items', {
    method: 'POST',
    body: JSON.stringify({ order_id: o.id, product_id: pid(4), product_name: 'Combo Kids', product_price: 9_800, quantity: 1 }),
  })
  const { ctx, page } = await pagina(browser, 1366, 768)
  const chip = page.getByRole('button', { name: new RegExp(`^#${o.order_number}\\b`) })
  expect(await chip.evaluate((e) => getComputedStyle(e).fontSize), 'el chip de pendientes').toBe('13px')
  await chip.click()
  const efectivo = page.getByRole('button', { name: /^Efectivo/ }).getByText('Efectivo', { exact: true })
  expect(await efectivo.evaluate((e) => getComputedStyle(e).fontSize), 'el medio de pago').toBe('13px')
  await ctx.close()
})

// ─── Tipografia ─────────────────────────────────────────────────────────────

test('los dialogos usan la letra del panel', async ({ browser }) => {
  const { ctx, page } = await pagina(browser, 1366, 768)
  const delPanel = await page.getByRole('button', { name: /^Mostrador/ }).evaluate((e) => getComputedStyle(e).fontFamily)
  await page.getByRole('button', { name: /Movimiento/ }).first().click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo).toBeVisible()
  const delDialogo = await dialogo.evaluate((e) => getComputedStyle(e).fontFamily)
  expect(delDialogo).toBe(delPanel)
  await ctx.close()
})
