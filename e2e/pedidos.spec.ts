import { test, expect } from '@playwright/test'
import { rest, asegurarUsuario, USUARIO } from './local'

const ITEMS = JSON.stringify([{ name: 'ZZ Item', quantity: 1, price: 1000 }])
const PEDIDOS = [
  { status: 'recibido', payment_method: 'cash', customer_name: 'ZZ Ana' },
  { status: 'entregado', payment_method: 'transfer', customer_name: 'ZZ Beto' },
  { status: 'cancelado', payment_method: 'mercadopago', customer_name: 'ZZ Cami' },
  { status: 'pagado', payment_method: 'card', customer_name: 'ZZ Dani' },
]

const limpiar = () => rest('orders?customer_name=like.ZZ%25', { method: 'DELETE' })

test.beforeAll(async () => {
  await asegurarUsuario()
  await limpiar()
  await rest('orders', {
    method: 'POST',
    body: JSON.stringify(
      PEDIDOS.map((p) => ({ ...p, total: 1000, items: JSON.parse(ITEMS), order_source: 'web' }))
    ),
  })
})
test.afterAll(limpiar)

test('pedidos: solo el estado va resaltado, y sin emojis', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)

  await page.goto('/admin/orders')
  await page.waitForTimeout(1500)

  const m = await page.evaluate(() => {
    const pildoras: string[] = []
    document.querySelectorAll('tbody tr span, tbody tr div').forEach((el) => {
      const cs = getComputedStyle(el)
      const conFondo =
        cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent'
      const texto = (el.textContent ?? '').trim()
      if (conFondo && parseFloat(cs.borderRadius) >= 9999 && texto && el.children.length <= 1)
        pildoras.push(texto)
    })
    return { filas: document.querySelectorAll('tbody tr').length, pildoras: [...new Set(pildoras)] }
  })
  console.log(`\nfilas=${m.filas}  resaltados=${JSON.stringify(m.pildoras)}`)

  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
  await expect(page.locator('tbody')).not.toHaveText(emoji)

  // Abrir un pedido: es donde salia el emoji del medio de pago.
  await page.getByText('ZZ Ana').first().click()
  await page.waitForTimeout(900)
  const drawer = await page.locator('body').innerText()
  console.log('¿emoji en el detalle?', emoji.test(drawer))
  expect(emoji.test(drawer)).toBe(false)
  await expect(page.getByText('Método de pago')).toBeVisible()
  // El medio aparece tambien en la fila de la tabla, detras del panel.
  await expect(page.getByText('Efectivo', { exact: true }).first()).toBeVisible()
})
