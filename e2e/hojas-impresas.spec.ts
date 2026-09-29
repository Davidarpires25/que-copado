import { test, expect, type Page } from '@playwright/test'
import { rest, asegurarUsuario } from './local'
import { entrar } from './panel'

/**
 * Las hojas A4 del panel —planilla de conteo, reporte de costos, ficha
 * técnica— se imprimen con el mismo formato (spec hojas-impresas), y la ficha
 * trae solo lo que se usa en la cocina (spec seguimiento-de-stock).
 *
 * David: "un rediseño de la ficha técnica para que se parezca a las otras
 * planillas de conteo y costos". La ficha era de marzo y tenía otro idioma:
 * encabezados negros, un recuadro "LOGO" vacío, centavos, y el desglose y la
 * lista de compras con las mismas filas.
 *
 * Siembra dos productos propios —uno con insumos que se usan tal cual, otro
 * con una salsa que se prepara antes— con ids de prefijo propio, y los borra
 * al final. Las hojas solo leen.
 */

test.setTimeout(120_000)

const id = (prefijo: string, n: number) => `${prefijo}000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`
const ING = (n: number) => id('ae', n)
const REC = (n: number) => id('af', n)
const PROD = (n: number) => id('ad', 90 + n)
const SIMPLE = PROD(1)
const CON_PREVIA = PROD(2)

async function limpiar() {
  await rest(`product_recipes?product_id=in.(${SIMPLE},${CON_PREVIA})`, { method: 'DELETE' })
  await rest(`products?id=in.(${SIMPLE},${CON_PREVIA})`, { method: 'DELETE' })
  await rest(`recipe_ingredients?recipe_id=in.(${REC(1)},${REC(2)})`, { method: 'DELETE' })
  await rest(`recipes?id=in.(${REC(1)},${REC(2)})`, { method: 'DELETE' })
  await rest(`ingredient_sub_recipes?parent_ingredient_id=eq.${ING(3)}`, { method: 'DELETE' })
  await rest(`ingredients?id=in.(${[1, 2, 3, 4, 5].map(ING).join(',')})`, { method: 'DELETE' })
}

test.beforeAll(async () => {
  await asegurarUsuario()
  await limpiar()
  const [categoria] = await rest('categories?select=id&limit=1')
  await rest('ingredients', {
    method: 'POST',
    body: JSON.stringify([
      { id: ING(1), name: 'ZZ Medallón', unit: 'unidad', cost_per_unit: 1_234.5, is_active: true },
      { id: ING(2), name: 'ZZ Pan', unit: 'unidad', cost_per_unit: 450, is_active: true },
      { id: ING(3), name: 'ZZ Salsa de la casa', unit: 'kg', cost_per_unit: 0, is_active: true },
      { id: ING(4), name: 'ZZ Mayonesa', unit: 'kg', cost_per_unit: 3_000, is_active: true },
      { id: ING(5), name: 'ZZ Ajo', unit: 'kg', cost_per_unit: 5_000, is_active: true },
    ]),
  })
  await rest('ingredient_sub_recipes', {
    method: 'POST',
    body: JSON.stringify([
      { parent_ingredient_id: ING(3), child_ingredient_id: ING(4), quantity: 0.9, unit: 'kg' },
      { parent_ingredient_id: ING(3), child_ingredient_id: ING(5), quantity: 0.1, unit: 'kg' },
    ]),
  })
  await rest('recipes', { method: 'POST', body: JSON.stringify([{ id: REC(1), name: 'ZZ Receta simple' }, { id: REC(2), name: 'ZZ Receta con salsa' }]) })
  await rest('recipe_ingredients', {
    method: 'POST',
    body: JSON.stringify([
      { recipe_id: REC(1), ingredient_id: ING(1), quantity: 1 },
      { recipe_id: REC(1), ingredient_id: ING(2), quantity: 1 },
      { recipe_id: REC(2), ingredient_id: ING(1), quantity: 1 },
      { recipe_id: REC(2), ingredient_id: ING(3), quantity: 0.05 },
    ]),
  })
  await rest('products', {
    method: 'POST',
    body: JSON.stringify([
      { id: SIMPLE, name: 'ZZ Ficha simple', price: 9_000, category_id: categoria.id, product_type: 'elaborado', is_active: false },
      { id: CON_PREVIA, name: 'ZZ Ficha con salsa', price: 9_000, category_id: categoria.id, product_type: 'elaborado', is_active: false },
    ]),
  })
  await rest('product_recipes', {
    method: 'POST',
    body: JSON.stringify([
      { product_id: SIMPLE, recipe_id: REC(1), quantity: 1 },
      { product_id: CON_PREVIA, recipe_id: REC(2), quantity: 1 },
    ]),
  })
})

test.afterAll(limpiar)

// La ficha al final: las otras dos son la referencia, y si la ficha falla
// primero no se llega a ver que ellas cumplen.
const HOJAS: [string, string][] = [
  ['planilla', '/admin/stock/planilla/print'],
  ['costos', '/admin/reportes/costos/print'],
  ['ficha', `/admin/stock/ficha/${SIMPLE}/print?qty=10`],
]

/** La hoja abre el diálogo de imprimir al cargar: se anula para poder mirarla. */
async function abrirHoja(page: Page, ruta: string) {
  await page.addInitScript(() => { window.print = () => {} })
  await page.goto(ruta)
  await expect(page.getByRole('button', { name: 'Imprimir' })).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(500)
}

test('las tres hojas tienen el mismo encabezado y el mismo estilo de tabla', async ({ page }) => {
  await entrar(page)
  for (const [nombre, ruta] of HOJAS) {
    await abrirHoja(page, ruta)
    const encabezado = page.locator('.hdr')
    await expect(encabezado, `${nombre}: el local a la izquierda`).toContainText('Que Copado')
    await expect(encabezado, `${nombre}: el rubro`).toContainText('Hamburguesería')
    await expect(page.locator('.doc-meta'), `${nombre}: cuándo se imprimió`).toContainText(/Impres[ao] el/)

    // Encabezados sobre fondo claro. La planilla sombrea apenas las columnas
    // donde se escribe a mano, y eso es parte del formato; lo que no va es el
    // encabezado negro que tenia la ficha.
    const thOscuros = await page.locator('th').evaluateAll((ths) => ths
      .filter((th) => {
        const m = getComputedStyle(th).backgroundColor.match(/\d+(\.\d+)?/g)?.map(Number) ?? []
        const [r, g, b, a = 1] = m
        return a > 0.1 && (0.299 * r + 0.587 * g + 0.114 * b) < 200
      })
      .map((th) => th.textContent?.trim()))
    expect(thOscuros, `${nombre}: encabezados de tabla sobre fondo claro`).toEqual([])

    const conCentavos = await page.locator('.a4-page').innerText()
    expect(conCentavos.match(/\$\s?[\d.]+,\d+/g) ?? [], `${nombre}: montos sin centavos`).toEqual([])
  }
})

test('la barra de imprimir no sale en el papel', async ({ page }) => {
  await entrar(page)
  for (const [nombre, ruta] of HOJAS) {
    await abrirHoja(page, ruta)
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByRole('button', { name: 'Imprimir' }), nombre).toBeHidden()
    await page.emulateMedia({ media: 'screen' })
  }
})

test('sin preparaciones previas, la ficha es una sola tabla', async ({ page }) => {
  await entrar(page)
  await abrirHoja(page, `/admin/stock/ficha/${SIMPLE}/print?qty=10`)
  const hoja = page.locator('.a4-page')
  await expect(hoja.locator('table')).toHaveCount(1)
  await expect(hoja.locator('tbody tr')).toHaveCount(2)
  // Cada ingrediente con su casillero para tildar.
  await expect(hoja.locator('tbody tr [data-casillero]')).toHaveCount(2)
})

test('con una preparación previa, sale el desglose y la lista para juntar', async ({ page }) => {
  await entrar(page)
  await abrirHoja(page, `/admin/stock/ficha/${CON_PREVIA}/print?qty=10`)
  const hoja = page.locator('.a4-page')
  await expect(hoja.locator('table')).toHaveCount(2)
  await expect(hoja).toContainText('ZZ Salsa de la casa')
  await expect(hoja).toContainText('Para juntar')
  // En la lista van los insumos de la salsa, no la salsa.
  const lista = hoja.locator('table').last()
  await expect(lista).toContainText('ZZ Mayonesa')
  await expect(lista).not.toContainText('ZZ Salsa de la casa')
})

test('la ficha trae espacio para escribir y nada que se repita', async ({ page }) => {
  await entrar(page)
  await abrirHoja(page, `/admin/stock/ficha/${SIMPLE}/print?qty=10`)
  const hoja = page.locator('.a4-page')
  for (const t of ['Preparó', 'Fecha', 'Observaciones']) await expect(hoja).toContainText(t)
  for (const t of ['Receta base', 'Factor de escala', 'Versión', 'LOGO', 'Firma']) await expect(hoja).not.toContainText(t)
  // 10 unidades: 10 × (1.234,5 + 450) = 16.845.
  await expect(hoja).toContainText('$ 16.845')
})

test('las cantidades se escriben en castellano, en papel y en pantalla', async ({ page }) => {
  // La ficha formateaba con toFixed(3): 20 g de orégano salían "20.000 g", que
  // en castellano se lee veinte mil, y se tomó por un dato mal cargado.
  const puntoDecimal = /\b\d+\.\d{3}\s?(g|kg|ml|L|u)\b/g
  await entrar(page)
  await abrirHoja(page, `/admin/stock/ficha/${CON_PREVIA}/print?qty=10`)
  const papel = await page.locator('.a4-page').innerText()
  expect(papel.match(puntoDecimal) ?? [], 'en papel').toEqual([])
  expect(papel).toContain('450 g')

  await page.goto(`/admin/stock/ficha/${CON_PREVIA}`)
  await expect(page.getByText('ZZ Mayonesa').first()).toBeVisible({ timeout: 20_000 })
  const pantalla = await page.locator('main').innerText()
  expect(pantalla.match(puntoDecimal) ?? [], 'en pantalla').toEqual([])
})
