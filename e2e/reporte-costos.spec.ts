import { test, expect } from '@playwright/test'
import { rest, asegurarUsuario, USUARIO } from './local'

/**
 * El reporte de costos para imprimir.
 *
 * Pedido por el cliente para revisar precios. David: *"tiene que mostrar los
 * costos y dar la opción de elegir productos tanto elaborados como de reventa
 * e ingredientes"*.
 *
 * Se comprueba contra datos sembrados, no contra lo que haya en la base: los
 * números del margen se verifican contra la cuenta hecha a mano.
 */

const P = 'ZZ Costo'

const limpiar = async () => {
  await rest(`products?name=like.${encodeURIComponent(P + '%')}`, { method: 'DELETE' })
  await rest(`ingredients?name=like.${encodeURIComponent(P + '%')}`, { method: 'DELETE' })
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
      { name: `${P} Reventa sin costo`, price: 2500, cost: null, product_type: 'reventa',
        category_id: categoria.id, is_active: true },
      { name: `${P} Inactivo`, price: 5000, cost: 1000, product_type: 'elaborado',
        category_id: categoria.id, is_active: false },
    ]),
  })

  await rest('ingredients', {
    method: 'POST',
    body: JSON.stringify([
      // $22 el gramo son $22.000 el kilo.
      { name: `${P} Insumo en gramos`, unit: 'g', cost_per_unit: 22, is_active: true },
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

/** La fila de la hoja que contiene este nombre. */
const fila = (page: import('@playwright/test').Page, nombre: string) =>
  page.locator('tr', { hasText: nombre }).first()

test('trae costo, precio y margen, y el margen cierra', async ({ page }) => {
  await page.goto('/admin/products/costos/print')
  await page.waitForTimeout(1200)

  const f = fila(page, `${P} Elaborado`)
  await expect(f).toContainText('$ 2.000')
  await expect(f).toContainText('$ 8.000')
  // (8000 − 2000) / 8000 = 75%
  await expect(f).toContainText('75 %')
})

test('lo que no tiene costo sale marcado, no en blanco', async ({ page }) => {
  await page.goto('/admin/products/costos/print')
  await page.waitForTimeout(1200)

  const f = fila(page, `${P} Reventa sin costo`)
  await expect(f).toContainText('sin costo')
})

test('un producto inactivo no aparece', async ({ page }) => {
  await page.goto('/admin/products/costos/print')
  await page.waitForTimeout(1200)
  await expect(page.getByText(`${P} Inactivo`)).toHaveCount(0)
})

test('un insumo en gramos muestra tambien lo que sale el kilo', async ({ page }) => {
  await page.goto('/admin/products/costos/print?grupos=insumo')
  await page.waitForTimeout(1200)

  const f = fila(page, `${P} Insumo en gramos`)
  await expect(f).toContainText('$ 22 / g')
  // Donde se esconde el error de mil veces: leído por kilo salta a la vista.
  await expect(f).toContainText('$ 22.000 / kg')
})

test('elegir un grupo trae solo ese grupo', async ({ page }) => {
  await page.goto('/admin/products/costos/print?grupos=reventa')
  await page.waitForTimeout(1200)

  await expect(fila(page, `${P} Reventa sin costo`)).toBeVisible()
  await expect(page.getByText(`${P} Elaborado`)).toHaveCount(0)
  await expect(page.getByText(`${P} Insumo en gramos`)).toHaveCount(0)
})

test('se llega desde Productos eligiendo los grupos', async ({ page, context }) => {
  await page.goto('/admin/products')
  await page.waitForTimeout(1200)

  await page.getByRole('button', { name: /Reporte de costos/ }).click()
  await page.getByRole('button', { name: /Insumos/ }).click()

  const [hoja] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Imprimir' }).click(),
  ])
  await hoja.waitForLoadState()
  expect(hoja.url()).toContain('/admin/products/costos/print?grupos=insumo')
})
