import { test, expect } from '@playwright/test'
import { asegurarUsuario, USUARIO } from './local'

/**
 * La cantidad de un ingrediente se tiene que poder borrar.
 *
 * David: *"cuando estoy configurando un ingrediente de una receta este se marca
 * en 1 automaticamente pero no me deja borrar el 1 para poner lo que yo quiera,
 * lo que me obliga poner un numero por delante del 1 para borrarlo"*.
 *
 * Un `<input type="number">` controlado por un numero no se puede vaciar: al
 * borrar el ultimo digito el campo vale `''`, eso no es numero, y el codigo de
 * arriba lo reemplazaba antes de que la persona escribiera.
 */

const INGREDIENTE = 'Cheddar'

test.beforeAll(asegurarUsuario)

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)

  // Nada se guarda: la receta se arma y se abandona.
  await page.goto('/admin/recipes/new')
  await page.getByRole('button', { name: 'Agregar ingrediente' }).click()
  await page.getByPlaceholder('Buscar ingrediente...').fill(INGREDIENTE)
  await page.getByRole('button', { name: new RegExp(INGREDIENTE, 'i') }).first().click()
})

test('el 1 de arranque se puede borrar y queda el campo vacio', async ({ page }) => {
  const cantidad = page.getByLabel(`Cantidad de ${INGREDIENTE}`)
  await expect(cantidad).toHaveValue('1')

  await cantidad.press('ControlOrMeta+a')
  await cantidad.press('Backspace')

  // El sintoma exacto del reporte: antes acá volvía a aparecer un valor solo.
  await expect(cantidad).toHaveValue('')
})

test('escribir despues de borrar deja el numero tal cual, sin el 1 adelante', async ({ page }) => {
  const cantidad = page.getByLabel(`Cantidad de ${INGREDIENTE}`)

  await cantidad.press('ControlOrMeta+a')
  await cantidad.press('Backspace')
  await cantidad.pressSequentially('250')

  await expect(cantidad).toHaveValue('250')
})

test('entrar al campo selecciona lo que hay, asi escribir lo pisa', async ({ page }) => {
  const cantidad = page.getByLabel(`Cantidad de ${INGREDIENTE}`)

  // Sin seleccionar al entrar, esto escribiria "3" pegado al "1" que ya estaba.
  await cantidad.click()
  await cantidad.pressSequentially('3')

  await expect(cantidad).toHaveValue('3')
})

test('si se deja vacio y se sale del campo, vuelve el ultimo valor bueno', async ({ page }) => {
  const cantidad = page.getByLabel(`Cantidad de ${INGREDIENTE}`)

  await cantidad.press('ControlOrMeta+a')
  await cantidad.pressSequentially('7')
  await expect(cantidad).toHaveValue('7')

  await cantidad.press('ControlOrMeta+a')
  await cantidad.press('Backspace')
  await cantidad.blur()

  await expect(cantidad).toHaveValue('7')
})

test('la rueda del mouse suelta el campo en vez de cambiar el numero', async ({ page }) => {
  const cantidad = page.getByLabel(`Cantidad de ${INGREDIENTE}`)

  // Un `type="number"` con foco cambia de valor al scrollear la pagina, y una
  // receta larga se desconfigura sola sin que nadie toque nada. Se comprueba
  // que el campo pierda el foco, que es lo que lo evita: el valor solo no
  // alcanza como prueba porque la rueda sintetica no dispara el incremento
  // nativo del navegador.
  await cantidad.click()
  await expect(cantidad).toBeFocused()

  await page.mouse.wheel(0, 120)

  await expect(cantidad).not.toBeFocused()
  await expect(cantidad).toHaveValue('1')
})
