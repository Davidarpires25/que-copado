import { test, expect } from '@playwright/test'
import { rest, SUPABASE, SERVICE, asegurarUsuario, USUARIO } from './local'

/**
 * La reventa también se compra.
 *
 * David: *"añadir la opción de registro de compra de productos en reventa, hoy
 * solo se registran insumos"*. Las gaseosas entraban como ajuste —que en el
 * historial se lee como una corrección— y su costo no tenía por dónde entrar.
 */

const P = 'ZZ Compra'
const NOTA = `${P} prueba`
let categoriaId = ''

const limpiar = async () => {
  await rest(`stock_movements?reason=eq.${encodeURIComponent(NOTA)}`, { method: 'DELETE' })
  // El combo primero: sus componentes no se pueden borrar mientras los use.
  await rest(`products?name=like.${encodeURIComponent(P + '%')}&product_type=eq.combo`, { method: 'DELETE' })
  await rest(`products?name=like.${encodeURIComponent(P + '%')}`, { method: 'DELETE' })
  await rest(`ingredients?name=like.${encodeURIComponent(P + '%')}`, { method: 'DELETE' })
}

const uno = async (ruta: string) => (await rest(ruta))[0]

test.beforeAll(async () => {
  await asegurarUsuario()
  await limpiar()
  categoriaId = (await uno('categories?select=id&limit=1')).id
})

test.beforeEach(async ({ page }) => {
  await limpiar()

  await rest('ingredients', {
    method: 'POST',
    body: JSON.stringify({ name: `${P} Harina`, unit: 'kg', current_stock: 2, cost_per_unit: 100, is_active: true }),
  })
  const [gaseosa] = await rest('products', {
    method: 'POST',
    body: JSON.stringify([
      // Sin costo, sin seguimiento y apagada por el sistema: todo lo que la
      // compra tiene que arreglar.
      { name: `${P} Gaseosa`, price: 2500, cost: null, product_type: 'reventa', category_id: categoriaId,
        is_active: true, stock_tracking_enabled: false, current_stock: 0,
        is_out_of_stock: true, auto_disabled: true },
    ]),
  })
  await rest('products', {
    method: 'POST',
    body: JSON.stringify({ name: `${P} Elaborado`, price: 8000, cost: 2000, product_type: 'elaborado',
      category_id: categoriaId, is_active: true }),
  })
  const [combo] = await rest('products', {
    method: 'POST',
    body: JSON.stringify({ name: `${P} Combo`, price: 6000, cost: null, product_type: 'combo',
      category_id: categoriaId, is_active: true }),
  })
  await rest('product_components', {
    method: 'POST',
    body: JSON.stringify({ parent_id: combo.id, component_id: gaseosa.id, quantity: 2 }),
  })

  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)
})

test.afterAll(limpiar)

test('el buscador ofrece insumos y reventa, y nada que se produzca', async ({ page }) => {
  await page.goto('/admin/stock/compras/nueva')
  await page.getByPlaceholder('Buscar ingrediente o producto...').fill(P)

  await expect(page.getByRole('button', { name: new RegExp(`^${P} Harina`) })).toContainText('2 kg en stock')
  // La reventa se marca; el insumo, que es lo común, no.
  await expect(page.getByRole('button', { name: new RegExp(`^${P} Gaseosa`) })).toContainText('Reventa · sin seguimiento')
  await expect(page.getByRole('button', { name: new RegExp(`^${P} Harina`) })).not.toContainText('Reventa')

  await expect(page.getByRole('button', { name: new RegExp(`^${P} Elaborado`) })).toHaveCount(0)
  await expect(page.getByRole('button', { name: new RegExp(`^${P} Combo`) })).toHaveCount(0)
})

test('una compra mixta: los dos suman, la gaseosa toma costo y seguimiento, y el combo se recalcula', async ({ page }) => {
  await page.goto('/admin/stock/compras/nueva')
  const buscar = page.getByPlaceholder('Buscar ingrediente o producto...')
  // Cada linea de la compra es una fila de la grilla con sus dos campos.
  const linea = (nombre: string) => page.locator('div.grid.py-4', { hasText: nombre })

  await buscar.fill(`${P} Harina`)
  await page.getByRole('button', { name: new RegExp(`^${P} Harina`) }).click()
  await linea(`${P} Harina`).getByPlaceholder('Cantidad').fill('5')
  await linea(`${P} Harina`).getByPlaceholder('Opcional').fill('120')

  await buscar.fill(`${P} Gaseosa`)
  await page.getByRole('button', { name: new RegExp(`^${P} Gaseosa`) }).click()
  await linea(`${P} Gaseosa`).getByPlaceholder('Cantidad').fill('24')
  await linea(`${P} Gaseosa`).getByPlaceholder('Opcional').fill('1900')

  await page.locator('#purchase-reason').fill(NOTA)
  await page.getByRole('button', { name: /Registrar compra \(2\)/ }).click()
  await page.waitForURL(/\/admin\/stock$/)

  const harina = await uno(`ingredients?name=eq.${encodeURIComponent(`${P} Harina`)}&select=current_stock,cost_per_unit`)
  expect(Number(harina.current_stock)).toBe(7)
  expect(Number(harina.cost_per_unit)).toBe(120)

  const gaseosa = await uno(
    `products?name=eq.${encodeURIComponent(`${P} Gaseosa`)}&select=id,current_stock,cost,stock_tracking_enabled,is_out_of_stock`
  )
  expect(Number(gaseosa.current_stock)).toBe(24)
  expect(Number(gaseosa.cost)).toBe(1900)
  expect(gaseosa.stock_tracking_enabled).toBe(true)
  // El sistema la había apagado por falta: con stock vuelve a venderse.
  expect(gaseosa.is_out_of_stock).toBe(false)

  const movimientos = await rest(
    `stock_movements?reason=eq.${encodeURIComponent(NOTA)}&select=movement_type,ingredient_id,product_id`
  )
  expect(movimientos).toHaveLength(2)
  expect(movimientos.every((m: { movement_type: string }) => m.movement_type === 'purchase')).toBe(true)
  expect(movimientos.filter((m: { product_id: string | null }) => m.product_id === gaseosa.id)).toHaveLength(1)

  // Dos gaseosas a $1.900.
  const combo = await uno(`products?name=eq.${encodeURIComponent(`${P} Combo`)}&select=cost`)
  expect(Number(combo.cost)).toBe(3800)
})

test('un elaborado en la compra hace que no entre nada', async () => {
  // La pantalla no lo ofrece, pero la regla vive en la base: si alguna vez
  // otro camino lo manda, la compra entera se rechaza.
  const harina = await uno(`ingredients?name=eq.${encodeURIComponent(`${P} Harina`)}&select=id`)
  const elaborado = await uno(`products?name=eq.${encodeURIComponent(`${P} Elaborado`)}&select=id`)

  const r = await fetch(`${SUPABASE}/rest/v1/rpc/registrar_compra_de_stock`, {
    method: 'POST',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_items: [
        { id: harina.id, cantidad: 5 },
        { tipo: 'producto', id: elaborado.id, cantidad: 3 },
      ],
      p_motivo: NOTA,
    }),
  })
  expect(r.ok).toBe(false)
  expect(await r.text()).toContain('No existe el producto de reventa')

  const despues = await uno(`ingredients?name=eq.${encodeURIComponent(`${P} Harina`)}&select=current_stock`)
  expect(Number(despues.current_stock)).toBe(2)
})
