import { test, expect } from '@playwright/test'
import { asegurarUsuario, USUARIO } from './local'

/**
 * La ayuda de un campo vive detras de un signo de pregunta.
 *
 * David: *"hay mensajes que podriamos dar cuando el mouse se posicione en ese
 * campo sin necesidad de mostrarlo abajo"*. La correccion al planteo es que el
 * icono tiene que verse: una ayuda que aparece solo al pasar por el campo no
 * la encuentra nadie, porque nada indica que exista.
 *
 * Y tiene que abrirse tambien con el teclado. Un tooltip que solo responde al
 * mouse no existe para quien tabula ni para quien usa el sistema con el dedo.
 */

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

test('el texto no ocupa lugar hasta que se lo pide', async ({ page }) => {
  await page.goto('/admin/ingredients/new')
  await page.waitForTimeout(900)

  await expect(page.getByText(/0 = sin merma/)).toHaveCount(0)

  const ayudas = page.getByRole('button', { name: 'Ver ayuda de este campo' })
  await expect(ayudas.first()).toBeVisible()

  await ayudas.first().hover()
  await expect(page.getByRole('tooltip')).toContainText(/0 = sin merma/)
})

test('tambien se abre con el teclado', async ({ page }) => {
  await page.goto('/admin/ingredients/new')
  await page.waitForTimeout(900)

  await page.getByRole('button', { name: 'Ver ayuda de este campo' }).first().focus()
  await expect(page.getByRole('tooltip')).toBeVisible()
})

test('la compra explica que pasa si no se pone nota', async ({ page }) => {
  await page.goto('/admin/stock/compras/nueva')
  await page.waitForTimeout(900)

  await expect(page.getByText(/Compra de mercadería/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Ver ayuda de este campo' }).first().hover()
  await expect(page.getByRole('tooltip')).toContainText(/Compra de mercadería/)
})
