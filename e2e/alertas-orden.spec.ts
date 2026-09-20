import { test, expect } from '@playwright/test'
import { rest, asegurarUsuario, USUARIO } from './local'

/**
 * La pestaña Alertas se lee de arriba hacia abajo por urgencia.
 *
 * David: *"debería mostrar primero las que están en alerta, luego las que
 * están ok y por último las que no están en seguimiento"*. En orden
 * alfabetico hay que recorrer dieciocho filas para encontrar las tres que
 * importan, que es justo lo contrario de para que existe una pestaña que se
 * llama Alertas.
 *
 * Y la cantidad y el estado viven en columnas distintas: decia "2 · crítico"
 * en una sola celda, y una columna que mezcla dos cosas no deja escanear
 * ninguna.
 */

/**
 * Sin datos en alerta el orden se cumple solo y el test no prueba nada: con la
 * base local limpia, `[2,2,2]` ya esta ordenado. Se siembran los cuatro casos.
 */
const PREFIJO = 'ZZ Orden'

const limpiar = async () => {
  await rest(`ingredients?name=like.${encodeURIComponent(PREFIJO + '%')}`, { method: 'DELETE' })
  await rest(`products?name=like.${encodeURIComponent(PREFIJO + '%')}`, { method: 'DELETE' })
}

test.beforeAll(async () => {
  await asegurarUsuario()
  await limpiar()
  await rest('ingredients', {
    method: 'POST',
    body: JSON.stringify([
      // Alfabeticamente al final, para que solo el orden por urgencia los suba.
      { name: `${PREFIJO} Z negativo`, unit: 'kg', cost_per_unit: 10,
        current_stock: -4, min_stock: 2, stock_tracking_enabled: true },
      { name: `${PREFIJO} Y bajo`, unit: 'kg', cost_per_unit: 10,
        current_stock: 1, min_stock: 5, stock_tracking_enabled: true },
      // Todas las claves iguales: PostgREST rechaza un insert masivo donde un
      // objeto trae campos que otro no ("All object keys must match").
      { name: `${PREFIJO} A sin seguimiento`, unit: 'kg', cost_per_unit: 10,
        current_stock: 0, min_stock: null, stock_tracking_enabled: false },
      { name: `${PREFIJO} B bien`, unit: 'kg', cost_per_unit: 10,
        current_stock: 50, min_stock: 2, stock_tracking_enabled: true },
    ]),
  })

  // Y productos de reventa, para que la tabla de abajo tambien tenga los
  // cuatro casos: sin esto tiene una sola fila y el orden se cumple solo.
  const [categoria] = await rest('categories?select=id&limit=1')
  await rest('products', {
    method: 'POST',
    body: JSON.stringify([
      // Auto-deshabilitado a proposito: es lo que dispara el aviso amarillo.
      { name: `${PREFIJO} Z reventa negativo`, price: 100, product_type: 'reventa',
        category_id: categoria.id, current_stock: -3, min_stock: 2,
        stock_tracking_enabled: true, is_out_of_stock: true, auto_disabled: true },
      { name: `${PREFIJO} Y reventa bajo`, price: 100, product_type: 'reventa',
        category_id: categoria.id, current_stock: 1, min_stock: 5,
        stock_tracking_enabled: true, is_out_of_stock: false, auto_disabled: false },
      { name: `${PREFIJO} A reventa sin seguimiento`, price: 100, product_type: 'reventa',
        category_id: categoria.id, current_stock: 0, min_stock: null,
        stock_tracking_enabled: false, is_out_of_stock: false, auto_disabled: false },
      { name: `${PREFIJO} B reventa bien`, price: 100, product_type: 'reventa',
        category_id: categoria.id, current_stock: 80, min_stock: 2,
        stock_tracking_enabled: true, is_out_of_stock: false, auto_disabled: false },
    ]),
  })
})

test.afterAll(limpiar)

test('primero lo urgente, y cada dato en su columna', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 })
  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)

  await page.goto('/admin/stock')
  await page.getByRole('button', { name: 'Alertas', exact: false }).first().click()
  await page.waitForTimeout(1600)

  // En esta pestaña hay dos tablas --elaborados y reventa--; la de elaborados
  // es la primera y es la que tiene el stock teorico.
  const tabla = page.locator('table').first()

  // Columnas separadas: la cantidad no comparte celda con la palabra.
  await expect(tabla.getByRole('columnheader', { name: 'Stock teórico' })).toBeVisible()
  await expect(tabla.getByRole('columnheader', { name: 'Estado', exact: true })).toBeVisible()
  await expect(page.getByText(/^\d+ · crítico$/)).toHaveCount(0)

  // El orden: ningun estado urgente aparece despues de uno menos urgente.
  const orden = await page.evaluate(() => {
    const peso = (t: string) =>
      t.includes('Agotado') ? 0 : t.includes('Crítico') ? 1 : t.trim() === '—' ? 3 : 2
    const primera = document.querySelector('table')!
    return [...primera.querySelectorAll('tbody tr')]
      .map((f) => f.querySelectorAll('td')[2]?.textContent ?? '')
      .filter((t) => t !== '')
      .map(peso)
  })

  expect(orden).toEqual([...orden].sort((a, b) => a - b))
})

test('la tabla de reventa tambien se ordena por urgencia', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 })
  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)

  await page.goto('/admin/stock')
  await page.getByRole('button', { name: 'Alertas', exact: false }).first().click()
  await page.waitForTimeout(1600)

  // La segunda tabla de la pestaña es la de productos de reventa.
  const orden = await page.evaluate(() => {
    const tablas = document.querySelectorAll('table')
    const reventa = tablas[tablas.length - 1]
    const peso = (t: string) =>
      t.includes('En rojo') ? 0 : t.includes('Agotado') ? 1 : t.includes('Bajo') ? 2 : t.trim() === '—' ? 4 : 3
    return [...reventa.querySelectorAll('tbody tr')]
      .map((f) => [...f.querySelectorAll('td')].map((c) => c.textContent ?? '').join('|'))
      .filter((t) => t !== '')
      .map(peso)
  })

  expect(orden).toEqual([...orden].sort((a, b) => a - b))
})

test('Stock Actual se ordena por urgencia', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 })
  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)

  await page.goto('/admin/stock')
  await page.waitForTimeout(1600)

  const orden = await page.evaluate(() => {
    const peso = (t: string) =>
      t.includes('En rojo') ? 0 : t.includes('Bajo') ? 1 : t.includes('OK') ? 2 : 3
    return [...document.querySelectorAll('table')[0].querySelectorAll('tbody tr')]
      .map((f) => f.querySelectorAll('td')[4]?.textContent ?? '')
      .filter((t) => t !== '')
      .map(peso)
  })

  expect(orden.length).toBeGreaterThan(0)
  expect(orden).toEqual([...orden].sort((a, b) => a - b))
})

test('el aviso de productos sin ofrecer viene plegado', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 })
  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)
  await page.goto('/admin/stock')
  await page.waitForTimeout(1600)

  // El renglon se ve siempre; la lista y la explicacion solo si se abre.
  await expect(page.getByText(/Dejamos de ofrecer/)).toBeVisible()
  await expect(page.getByText(/En el mostrador se siguen pudiendo vender/)).toBeHidden()

  await page.locator('details').first().locator('summary').click()
  await expect(page.getByText(/En el mostrador se siguen pudiendo vender/)).toBeVisible()
})
