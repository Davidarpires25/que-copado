import { test, expect } from '@playwright/test'
import { rest, asegurarUsuario, USUARIO } from './local'

/**
 * Armar una receta larga no tiene que costar mas que armar una corta.
 *
 * David: *"cuando se agregan muchos ingredientes a una receta es dificil seguir
 * agregando mas por que la pantalla no se adapta"*.
 *
 * Medido antes del arreglo, en una notebook de 1366x768: el boton de agregar
 * bajaba 58px por ingrediente, la pagina empezaba a scrollear en el sexto y el
 * total se iba de pantalla en el septimo. No estaba roto —se llegaba
 * scrolleando— pero lo unico que se repite era lo unico que se movia.
 */

const CUANTOS = 14
const PREFIJO = 'ZZ Ing'
const nombres = Array.from({ length: CUANTOS }, (_, i) => `${PREFIJO} ${i + 1}`)

async function limpiar() {
  await rest(`ingredients?name=like.${encodeURIComponent(PREFIJO + '%')}`, { method: 'DELETE' })
}

test.beforeAll(async () => {
  await asegurarUsuario()
  await limpiar()
  await rest('ingredients', {
    method: 'POST',
    body: JSON.stringify(nombres.map((name) => ({ name, unit: 'g', cost_per_unit: 10 }))),
  })
})

test.afterAll(limpiar)

test('el boton de agregar no se mueve y el total no se esconde', async ({ page }) => {
  // La pantalla de David. En una mas grande el problema tarda mas en aparecer.
  await page.setViewportSize({ width: 1366, height: 768 })

  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)

  // La receta se arma y se abandona: no se guarda nada.
  await page.goto('/admin/recipes/new')

  const agregar = page.getByRole('button', { name: 'Agregar ingrediente' })
  const posicionDelBoton = () => agregar.evaluate((b) => Math.round(b.getBoundingClientRect().top))

  const alPrincipio = await posicionDelBoton()

  for (const nombre of nombres) {
    // `force`: sin esto Playwright scrollea antes de clickear y tapa justamente
    // lo que se quiere medir.
    await agregar.click({ force: true })
    await page.getByPlaceholder('Buscar ingrediente...').fill(nombre)
    await page.getByRole('button', { name: nombre, exact: false }).first().click()
  }

  await expect(page.getByText(`Total (${CUANTOS} ingredientes)`)).toBeVisible()

  // 1. El boton quedo donde estaba, con los catorce ingredientes cargados.
  expect(await posicionDelBoton()).toBe(alPrincipio)

  // 2. Todo lo que importa entra en pantalla sin scrollear la pagina.
  await page.evaluate(() => window.scrollTo(0, 0))
  const medida = await page.evaluate(() => {
    const dentro = (el: Element) => {
      const r = el.getBoundingClientRect()
      return r.top >= 0 && r.bottom <= window.innerHeight
    }
    const boton = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Agregar ingrediente')
    )!
    const total = [...document.querySelectorAll('span')].find((s) =>
      s.textContent?.startsWith('Total (')
    )!
    return {
      botonDentro: dentro(boton),
      totalDentro: dentro(total),
      // El <select> escondido de cada fila se ancla al documento si la lista no
      // esta posicionada, y deja cientos de px de scroll vacio.
      sobraDePagina: document.documentElement.scrollHeight - window.innerHeight,
    }
  })

  expect(medida.botonDentro).toBe(true)
  expect(medida.totalDentro).toBe(true)
  expect(medida.sobraDePagina).toBeLessThan(120)

  // 3. Las filas scrollean adentro de su caja, no arrastrando la pagina.
  const lista = page.locator('div.overflow-y-auto').first()
  const caja = await lista.evaluate((el) => ({ ve: el.clientHeight, tiene: el.scrollHeight }))
  expect(caja.tiene).toBeGreaterThan(caja.ve)
})
