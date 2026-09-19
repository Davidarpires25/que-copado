import { test, expect } from '@playwright/test'
import { rest, asegurarUsuario, USUARIO } from './local'

/**
 * La pantalla de una receta no desborda a lo ancho en ninguna pantalla.
 *
 * Medido antes del arreglo: 44px de sobra a 1100, 120px a 1024, y con **tres**
 * ingredientes, no con dieciocho. Dos causas distintas:
 *
 * 1. Las dos columnas estaban clavadas en `flex` con la izquierda en 380px
 *    fijos y no se apilaban nunca.
 * 2. La grilla de cada fila tiene cinco columnas que suman 400px, y una pista
 *    `px` de grilla no se achica: en un telefono la ultima se salia de la
 *    pantalla.
 */

const PREFIJO = 'ZZ Ancho'
const nombres = [1, 2, 3].map((i) => `${PREFIJO} ${i}`)

const limpiar = () =>
  rest(`ingredients?name=like.${encodeURIComponent(PREFIJO + '%')}`, { method: 'DELETE' })

test.beforeAll(async () => {
  await asegurarUsuario()
  await limpiar()
  await rest('ingredients', {
    method: 'POST',
    body: JSON.stringify(nombres.map((name) => ({ name, unit: 'g', cost_per_unit: 10 }))),
  })
})

test.afterAll(limpiar)

test('no desborda a lo ancho, del monitor al telefono', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
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
  for (const n of nombres) {
    await page.getByRole('button', { name: 'Agregar ingrediente' }).click({ force: true })
    await page.getByPlaceholder('Buscar ingrediente...').fill(n)
    await page.getByRole('button', { name: n, exact: false }).first().click()
  }

  const anchos = [1600, 1366, 1280, 1200, 1180, 1100, 1024, 900, 768, 640, 500, 390, 320]
  const desbordan: string[] = []

  for (const width of anchos) {
    await page.setViewportSize({ width, height: 900 })
    await page.waitForTimeout(150)
    const exceso = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    if (exceso > 0) desbordan.push(`${width}px se pasa ${exceso}px`)
  }

  expect(desbordan).toEqual([])
})
