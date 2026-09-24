import { test, expect } from '@playwright/test'
import { asegurarUsuario, USUARIO } from './local'

/**
 * El menu del admin: angosto siempre, abierto mientras el puntero esta encima.
 *
 * Dos cosas que se rompieron antes y por eso se miden:
 *
 * 1. **"Cerrar Sesion" desaparecia.** El <nav> no tenia `overflow-y-auto`, y un
 *    hijo de un contenedor flex no baja de su alto de contenido: con los 15
 *    items de un administrador reclamaba 772px, empujaba el pie fuera de la
 *    pantalla y el `overflow-hidden` del <aside> lo cortaba. En una netbook de
 *    768px el boton de salir quedaba 122px por debajo del borde.
 *
 * 2. **El contenido no se corre.** Abierto, el menu se superpone. Si empujara,
 *    cada pasada del mouse reacomodaria la pagina entera.
 */

test.beforeAll(asegurarUsuario)

test.beforeEach(async ({ page }) => {
  // La netbook, que es donde aparecio el problema.
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

const anchoDelMenu = (page: import('@playwright/test').Page) =>
  page.locator('aside').evaluate((a) => Math.round(a.getBoundingClientRect().width))

test('se abre con el puntero y se cierra al salir', async ({ page }) => {
  expect(await anchoDelMenu(page)).toBe(72)

  await page.locator('aside').hover()
  await expect.poll(() => anchoDelMenu(page)).toBe(256)
  await expect(page.getByRole('button', { name: /Cerrar Sesión/i })).toBeVisible()

  await page.mouse.move(900, 400)
  await expect.poll(() => anchoDelMenu(page)).toBe(72)
})

test('abierto corre el contenido, no lo tapa', async ({ page }) => {
  const izquierda = () =>
    page.locator('main').evaluate((m) => Math.round(m.getBoundingClientRect().left))

  const antes = await izquierda()
  await page.locator('aside').hover()
  await expect.poll(() => anchoDelMenu(page)).toBe(256)

  // Este test decia lo contrario hasta el 2026-09-24.
  //
  // Cuando se hizo el menu desplegable se eligio que se superpusiera, para que
  // la pagina no se reacomodara en cada pasada del mouse. Medido despues, el
  // costo de esa eleccion era peor que el problema que evitaba: el menu tapaba
  // media columna de nombres --se leia "osa 500ml", "burguesa simple"-- que es
  // justo con la que se busca una fila.
  //
  // Correr el contenido no trajo el desborde horizontal que se temia: las
  // tablas se achican de 1228 a 1044px y no aparece scroll. Y el roce
  // accidental se resolvio con una demora al abrir, no superponiendo.
  await expect.poll(izquierda).toBeGreaterThan(antes)
})

test('el pie del menu entra en pantalla en una netbook', async ({ page }) => {
  await page.locator('aside').hover()
  await expect.poll(() => anchoDelMenu(page)).toBe(256)

  for (const nombre of [/Cerrar Sesión/i, /Mi cuenta|Admin de Prueba/i]) {
    const el = page.getByRole('button', { name: nombre }).or(page.getByRole('link', { name: nombre })).first()
    const dentro = await el.evaluate((n) => {
      const r = n.getBoundingClientRect()
      return r.top >= 0 && r.bottom <= window.innerHeight
    })
    expect(dentro).toBe(true)
  }

  // Y el menu scrollea en vertical, no en horizontal.
  const nav = page.locator('aside nav')
  expect(await nav.evaluate((n) => getComputedStyle(n).overflowY)).toBe('auto')
  expect(await nav.evaluate((n) => getComputedStyle(n).overflowX)).toBe('hidden')
})

test('la seccion donde uno esta parado queda a la vista', async ({ page }) => {
  // Ajustes es el ultimo item: sin traerlo a la vista queda fuera del scroll.
  await page.goto('/admin/settings')
  await page.locator('aside').hover()
  await expect.poll(() => anchoDelMenu(page)).toBe(256)

  const activo = page.locator('aside nav [aria-current="page"]')
  await expect(activo).toHaveText(/Ajustes/)
  expect(
    await activo.evaluate((n) => {
      const r = n.getBoundingClientRect()
      return r.top >= 0 && r.bottom <= window.innerHeight
    })
  ).toBe(true)
})
