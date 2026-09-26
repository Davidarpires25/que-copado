import { test, expect, type Page } from '@playwright/test'
import { rest, asegurarUsuario, USUARIO } from './local'

/**
 * Reportes → Costos: se mira en pantalla y se imprime lo que se ve.
 *
 * El test central es el de "lo que se ve es lo que se imprime": con una
 * categoría, una búsqueda y un orden elegidos, la hoja trae las mismas filas
 * en el mismo orden que la pantalla. Es la promesa del reporte, y lo que se
 * rompería si algún día la pantalla y la hoja filtraran cada una a su manera.
 */

const P = 'ZZ Costo'
let carnesId = ''

const limpiar = async () => {
  await rest(`products?name=like.${encodeURIComponent(P + '%')}`, { method: 'DELETE' })
  await rest(`ingredients?name=like.${encodeURIComponent(P + '%')}`, { method: 'DELETE' })
  await rest(`ingredient_categories?name=like.${encodeURIComponent(P + '%')}`, { method: 'DELETE' })
}

test.beforeAll(async () => {
  await asegurarUsuario()
  await limpiar()
  const [categoria] = await rest('categories?select=id&limit=1')

  await rest('products', {
    method: 'POST',
    body: JSON.stringify([
      // 8000 de precio y 2000 de costo: margen 75%.
      { name: `${P} Elaborado`, price: 8000, cost: 2000, product_type: 'elaborado',
        category_id: categoria.id, is_active: true },
      // 1000 y 900: margen 10%. El que menos deja.
      { name: `${P} Barato`, price: 1000, cost: 900, product_type: 'elaborado',
        category_id: categoria.id, is_active: true },
      { name: `${P} Reventa sin costo`, price: 2500, cost: null, product_type: 'reventa',
        category_id: categoria.id, is_active: true },
      { name: `${P} Inactivo`, price: 5000, cost: 1000, product_type: 'elaborado',
        category_id: categoria.id, is_active: false },
    ]),
  })

  const [carnes, descartables] = await rest('ingredient_categories', {
    method: 'POST',
    body: JSON.stringify([{ name: `${P} Carnes` }, { name: `${P} Descartables` }]),
  })
  carnesId = carnes.id

  await rest('ingredients', {
    method: 'POST',
    body: JSON.stringify([
      // $22 el gramo son $22.000 el kilo.
      { name: `${P} Insumo en gramos`, unit: 'g', cost_per_unit: 22, is_active: true,
        category_id: carnes.id },
      { name: `${P} Bandeja`, unit: 'unidad', cost_per_unit: 150, is_active: true,
        category_id: descartables.id },
    ]),
  })
})

test.afterAll(limpiar)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)
})

const fila = (page: Page, nombre: string) => page.locator('tr', { hasText: nombre }).first()

/**
 * Los nombres de la primera columna, en orden. El nombre es el primer <p> de
 * la celda: debajo va una segunda linea (categoria y tipo) que en escritorio
 * esta oculta por CSS pero igual esta en el texto.
 */
const nombresEnOrden = (page: Page) =>
  page.locator('tbody tr').evaluateAll((trs) =>
    trs.map((tr) => (tr.querySelector('td p')?.textContent ?? '').trim()).filter(Boolean)
  )

test('en pantalla: costo, precio y un margen que cierra', async ({ page }) => {
  await page.goto('/admin/reportes/costos')
  await page.waitForTimeout(1200)

  const f = fila(page, `${P} Elaborado`)
  await expect(f).toContainText('$ 2.000')
  await expect(f).toContainText('$ 8.000')
  // (8000 − 2000) / 8000 = 75%
  await expect(f).toContainText('75 %')
  await expect(f).toContainText('Elaborado')
})

test('lo que no tiene costo sale marcado, y un inactivo no sale', async ({ page }) => {
  await page.goto('/admin/reportes/costos')
  await page.waitForTimeout(1200)

  await expect(fila(page, `${P} Reventa sin costo`)).toContainText('sin costo')
  await expect(page.getByText(`${P} Inactivo`)).toHaveCount(0)
})

test('los insumos en gramos muestran también lo que sale el kilo', async ({ page }) => {
  await page.goto('/admin/reportes/costos')
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /^Insumos/ }).click()

  const f = fila(page, `${P} Insumo en gramos`)
  await expect(f).toContainText('$ 22')
  await expect(f).toContainText('$ 22.000 / kg')
})

test('dentro de insumos se filtra por categoría', async ({ page }) => {
  // David: "poder dentro de insumos elegir la categoría carnes por ejemplo".
  await page.goto('/admin/reportes/costos')
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /^Insumos/ }).click()
  await page.getByRole('button', { name: new RegExp(`^${P} Carnes`) }).click()

  await expect(fila(page, `${P} Insumo en gramos`)).toBeVisible()
  await expect(page.getByText(`${P} Bandeja`)).toHaveCount(0)
  expect(page.url()).toContain(`cat=${carnesId}`)
})

test('ordenado por margen, lo que menos deja arriba y lo sin costo al final', async ({ page }) => {
  await page.goto('/admin/reportes/costos')
  await page.waitForTimeout(1200)
  await page.getByPlaceholder('Buscar producto...').fill(P)
  await page.getByRole('button', { name: /^Margen/ }).click()

  expect(await nombresEnOrden(page)).toEqual([`${P} Barato`, `${P} Elaborado`, `${P} Reventa sin costo`])
})

test('se imprime exactamente lo que se ve', async ({ page, context }) => {
  await page.goto('/admin/reportes/costos')
  await page.waitForTimeout(1200)

  // Una búsqueda y un orden: la vista que hay que respetar.
  await page.getByPlaceholder('Buscar producto...').fill(P)
  await page.getByRole('button', { name: /^Margen/ }).click()
  await page.getByRole('button', { name: /^Margen/ }).click() // de mayor a menor

  const enPantalla = await nombresEnOrden(page)
  expect(enPantalla.length).toBe(3)

  const [hoja] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Imprimir' }).click(),
  ])
  await hoja.waitForLoadState()
  await hoja.waitForTimeout(800)

  const enPapel = await hoja
    .locator('.a4-page tbody tr')
    .evaluateAll((trs) => trs.map((tr) => (tr.querySelector('td')?.textContent ?? '').trim()))

  expect(enPapel).toEqual(enPantalla)
})

test('la hoja de una categoría dice de qué es', async ({ page }) => {
  await page.goto(`/admin/reportes/costos/print?vista=insumos&cat=${carnesId}`)
  await page.waitForTimeout(1000)

  await expect(page.locator('.doc-meta')).toContainText(`Insumos · ${P} Carnes`)
  await expect(page.getByText(`${P} Bandeja`)).toHaveCount(0)
})

test('está en Reportes y ya no en Productos', async ({ page }) => {
  await page.goto('/admin/products')
  await page.waitForTimeout(1200)
  await expect(page.getByRole('button', { name: /Reporte de costos/ })).toHaveCount(0)

  await expect(page.locator('aside a[href="/admin/reportes/costos"]')).toHaveCount(1)
})

test('cambiar de pestaña y de orden no rompe el render', async ({ page }) => {
  // cambiar() escribia la URL con history.replaceState DENTRO del updater de
  // setState. Next intercepta replaceState para sincronizar su Router, asi que
  // actualizaba el Router mientras React renderizaba la tabla: "Cannot update
  // a component while rendering a different component".
  const errores: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errores.push(e.message.slice(0, 160)))

  await page.goto('/admin/reportes/costos')
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /^Insumos/ }).click()
  await expect(page).toHaveURL(/vista=insumos/)
  await page.locator('thead').getByRole('button', { name: /^Insumo/ }).click()
  await expect(page).toHaveURL(/orden=nombre/)
  await page.waitForTimeout(500)
  expect(errores.filter((e) => /Cannot update a component/.test(e))).toEqual([])
})
