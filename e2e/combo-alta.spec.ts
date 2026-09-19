import { test, expect } from '@playwright/test'
import { asegurarUsuario, USUARIO } from './local'

/**
 * El alta de un combo, sin la prosa que repetia y sin el catalogo entero
 * desplegado antes de buscar.
 *
 * David, sobre los tres mensajes: *"ocupan mucho espacio"*. Dos decian lo
 * mismo --compartian la frase "se descuenta del mismo stock que si se vendiera
 * suelto" palabra por palabra-- y el tercero explicaba algo que se lee una vez.
 *
 * Y sobre la lista: *"es correcto que se muestre si no estoy buscando nada?"*.
 * No: eran 250px de formulario con el catalogo en orden alfabetico, que nadie
 * navega para elegir un componente.
 */

test.beforeAll(asegurarUsuario)

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

  // Se arma y se abandona: no se guarda nada.
  await page.goto('/admin/products/new')
  await page.getByText('Combo', { exact: true }).click()
  await page.waitForTimeout(600)
})

test('el catalogo aparece recien cuando se busca', async ({ page }) => {
  const buscador = page.getByPlaceholder('Buscar producto para agregar...')
  await expect(buscador).toBeVisible()

  // Nada de la lista antes de escribir.
  await expect(page.getByRole('button', { name: /agregado|Reventa · \$/ })).toHaveCount(0)

  await buscador.fill('a')
  await expect(page.locator('button', { hasText: /\$/ }).first()).toBeVisible()

  await buscador.fill('')
  await expect(page.getByRole('button', { name: /Reventa · \$/ })).toHaveCount(0)
})

test('las explicaciones no ocupan renglon, pero se pueden leer', async ({ page }) => {
  // Las dos frases largas que se repetian ya no estan a la vista.
  await expect(page.getByText(/Cada componente es un producto del catálogo/)).toHaveCount(0)
  await expect(page.getByText(/el envase y la preparación que no coincide/)).toHaveCount(0)

  // Pero siguen disponibles detras del signo de pregunta.
  const ayudas = page.getByRole('button', { name: 'Ver ayuda de este campo' })
  await expect(ayudas).toHaveCount(2)
  await ayudas.last().hover()
  await expect(page.getByRole('tooltip')).toContainText(/Cada componente es un producto/)
})

test('el aviso de combo vacio dice lo suyo en un renglon', async ({ page }) => {
  const aviso = page.getByText(/Sin componentes, el combo solo descuenta sus recetas/)
  await expect(aviso).toBeVisible()
  // Lo que repetia al parrafo de arriba se fue.
  await expect(aviso).not.toContainText('mismo stock que si se vendiera suelto')
})
