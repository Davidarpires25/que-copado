import { test, expect } from '@playwright/test'
import { rest, asegurarUsuario, USUARIO } from './local'

/**
 * El minimo de stock se edita solo, y avisa cuando es absurdo.
 *
 * Dos problemas del mismo campo, los dos reportados por David.
 *
 * **No se podia tocar sin mover el stock.** El boton pedia `delta !== 0`, asi
 * que para cambiar el minimo habia que inventar un cambio de stock --y eso
 * dejaba un ajuste en el historial, que es el historial con el que se
 * reconstruyen los faltantes--. *"me obliga a cambiar el stock para hacerlo,
 * es eso correcto?"*. No lo era.
 *
 * **Y dejaba cargar cualquier numero.** `Queso muzzarela` tenia un minimo de
 * 1000 kg --mil kilos-- y avisaba "stock bajo" todos los dias. Una alerta
 * siempre encendida deja de ser una alerta.
 */

const NOMBRE = 'ZZ Minimo'

const limpiar = async () => {
  const filas = await rest(`ingredients?name=eq.${encodeURIComponent(NOMBRE)}&select=id`)
  for (const f of filas ?? []) {
    await rest(`stock_movements?ingredient_id=eq.${f.id}`, { method: 'DELETE' })
  }
  await rest(`ingredients?name=eq.${encodeURIComponent(NOMBRE)}`, { method: 'DELETE' })
}

test.beforeAll(async () => {
  await asegurarUsuario()
  await limpiar()
  const [ing] = await rest('ingredients', {
    method: 'POST',
    body: JSON.stringify([
      { name: NOMBRE, unit: 'kg', cost_per_unit: 100, current_stock: 8,
        min_stock: 2, stock_tracking_enabled: true },
    ]),
  })
  // Tres compras de ~6 kg: la referencia contra la que se mide el minimo.
  await rest('stock_movements', {
    method: 'POST',
    body: JSON.stringify(
      [6, 6, 7].map((q) => ({
        ingredient_id: ing.id, movement_type: 'purchase',
        quantity: q, previous_stock: 0, new_stock: q,
      }))
    ),
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

  await page.goto('/admin/stock')
  await page.getByPlaceholder('Buscar ingrediente...').fill(NOMBRE)
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: `Ajustar stock de ${NOMBRE}` }).click()
  await page.waitForTimeout(800)
})

test('el minimo se puede cambiar sin tocar el stock', async ({ page }) => {
  const minimo = page.getByLabel(/Stock mínimo/i)
  await minimo.fill('4')

  const guardar = page.getByRole('button', { name: 'Confirmar ajuste' })
  await expect(guardar).toBeEnabled()
  await guardar.click()

  await expect(page.locator('[data-sonner-toast]')).toContainText(/Mínimo actualizado/i)

  // Y no quedo un ajuste de cero en el historial.
  const filas = await rest(`ingredients?name=eq.${encodeURIComponent(NOMBRE)}&select=id,min_stock`)
  expect(Number(filas[0].min_stock)).toBe(4)
  const ajustes = await rest(
    `stock_movements?ingredient_id=eq.${filas[0].id}&movement_type=eq.adjustment&select=id`
  )
  expect(ajustes).toHaveLength(0)
})

test('avisa cuando el minimo es absurdo para lo que se compra', async ({ page }) => {
  const minimo = page.getByLabel(/Stock mínimo/i)

  await minimo.fill('12')
  await expect(page.getByText(/va a avisar siempre/)).toHaveCount(0)

  // Se compra de a ~6 kg: 1000 es mas de cien veces eso.
  await minimo.fill('1000')
  await expect(page.getByText(/va a avisar siempre/)).toBeVisible()
  await expect(page.getByText(/veces.*lo que solés comprar/)).toBeVisible()
})
