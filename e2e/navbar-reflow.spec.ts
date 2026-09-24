import { test, expect } from '@playwright/test'
import { asegurarUsuario, USUARIO } from './local'

/**
 * El contenido se corre cuando el menu se abre.
 *
 * David: *"no queda bien que se queden estáticas"*. Tenía razón y se pudo
 * medir: con el menú superpuesto, en la tabla de productos se leía "osa 500ml"
 * y "burguesa simple" —tapaba media columna de nombres, que es con la que se
 * busca la fila—.
 *
 * Lo que había que cuidar es lo contrario: que la página no se reacomode en
 * cada roce accidental del mouse contra el borde. De ahí la demora al abrir.
 */

const ANGOSTO = 72
const ANCHO = 256

test.beforeAll(asegurarUsuario)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)
})

const margen = (page: import('@playwright/test').Page) =>
  page.locator('.admin-contenido').first().evaluate((d) =>
    Math.round(parseFloat(getComputedStyle(d).marginLeft))
  )

test('el contenido acompaña al menu', async ({ page }) => {
  await page.goto('/admin/products')
  await page.waitForTimeout(1400)

  expect(await margen(page)).toBe(ANGOSTO)

  await page.locator('aside').hover()
  await expect.poll(() => margen(page)).toBe(ANCHO)

  await page.mouse.move(900, 400)
  await expect.poll(() => margen(page)).toBe(ANGOSTO)
})

test('nada queda tapado con el menu abierto', async ({ page }) => {
  await page.goto('/admin/products')
  await page.waitForTimeout(1400)

  await page.locator('aside').hover()
  await expect.poll(() => margen(page)).toBe(ANCHO)

  // Ninguna celda de la tabla empieza antes de donde termina el menu.
  const invadidas = await page.evaluate(() => {
    const aside = document.querySelector('aside')!.getBoundingClientRect()
    return [...document.querySelectorAll('tbody td')]
      .filter((c) => (c.textContent ?? '').trim().length > 0)
      .filter((c) => c.getBoundingClientRect().left < aside.right - 1)
      .map((c) => (c.textContent ?? '').trim().slice(0, 24))
  })
  expect(invadidas).toEqual([])
})

test('un roce rapido no reacomoda la pagina', async ({ page }) => {
  await page.goto('/admin/products')
  await page.waitForTimeout(1400)

  // Entra y sale antes de los 180ms de la demora.
  await page.mouse.move(30, 400)
  await page.waitForTimeout(90)
  await page.mouse.move(900, 400)
  await page.waitForTimeout(700)

  expect(await margen(page)).toBe(ANGOSTO)
})

test('la caja tambien acompaña, con padding', async ({ page }) => {
  await page.goto('/admin/caja')
  await page.waitForTimeout(1800)

  const padding = () =>
    page.locator('.admin-contenido--caja').first().evaluate((d) =>
      Math.round(parseFloat(getComputedStyle(d).paddingLeft))
    )

  expect(await padding()).toBe(ANGOSTO)
  await page.locator('aside').hover()
  await expect.poll(padding).toBe(ANCHO)
})
