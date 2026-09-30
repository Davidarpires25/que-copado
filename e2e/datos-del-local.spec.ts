import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import { rest, asegurarUsuario } from './local'
import { entrar } from './panel'
import { generateWhatsAppMessage } from '@/lib/services/order-formatter'

/**
 * Los datos del local se configuran en un solo lugar (spec datos-del-local).
 *
 * El nombre, el rubro y la ciudad estaban escritos a mano en trece archivos.
 * Para instalar el sistema en otro local sin tocar código, todo sale de
 * `lib/negocio.ts`, y sin variables cargadas Que Copado se ve igual que antes.
 *
 * Solo lee: el ticket usa un pedido que ya existe.
 */

test.setTimeout(90_000)

const RAIZ = join(__dirname, '..')

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.(ts|tsx)$/.test(nombre) ? [ruta] : []
  })
}

/** El código sin comentarios: los comentarios cuentan por qué, y pueden nombrar el local. */
function sinComentarios(fuente: string) {
  // Los bloques se vacían conservando sus saltos, para que los números de línea sigan valiendo.
  return fuente.replace(/\/\*[\s\S]*?\*\//g, (bloque) => bloque.replace(/[^\n]/g, '')).replace(/(?<![:'"`])\/\/.*$/gm, '')
}

test('ningún archivo fuera de lib/negocio.ts escribe a mano los datos del local', () => {
  const PROHIBIDO = [/Copado/i, /Hamburgueser[ií]a/, /-28\.4696|-65\.7795/]
  const encontrados: string[] = []
  for (const dir of ['app', 'components', 'lib']) {
    for (const ruta of archivos(join(RAIZ, dir))) {
      if (ruta.endsWith(join('lib', 'negocio.ts'))) continue
      const lineas = sinComentarios(readFileSync(ruta, 'utf8'))
        // La clave del carrito en el navegador: cambiarla vaciaría los carritos armados.
        .replaceAll("'que-copado-cart'", '')
        .split('\n')
      lineas.forEach((linea, i) => {
        if (PROHIBIDO.some((re) => re.test(linea))) {
          encontrados.push(`${ruta.slice(RAIZ.length + 1)}:${i + 1}  ${linea.trim()}`)
        }
      })
    }
  }
  expect(encontrados).toEqual([])
})

test('next.config.ts toma el Supabase de su variable', () => {
  const config = readFileSync(join(RAIZ, 'next.config.ts'), 'utf8')
  expect(config).not.toContain('yyphmsxxzgjdvblfrfpv')
})

test('el mensaje de WhatsApp nombra al local y no a un dominio ajeno', () => {
  const mensaje = generateWhatsAppMessage({
    orderId: '00000000-0000-0000-0000-000000000001',
    orderNumber: 7,
    customerName: 'Ana',
    customerPhone: '3834000000',
    address: 'Sarmiento 123',
    items: [],
    subtotal: 10_000,
    shipping: 0,
    isFreeShipping: true,
    total: 10_000,
    paymentMethod: 'cash',
  })

  expect(mensaje).toContain('NUEVO PEDIDO - QUE COPADO')
  // quecopado.com es de otro negocio (una tienda de artículos para fiestas).
  expect(mensaje.toLowerCase()).not.toContain('quecopado.com')
})

test('sin variables cargadas, la tienda, la hoja A4 y el ticket dicen Que Copado', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Que Copado - Las mejores hamburguesas')
  await expect(page.locator('header').getByText('Que Copado', { exact: true }).first()).toBeVisible()
  await expect(page.locator('header img').first()).toHaveAttribute('src', '/logo.svg')

  await asegurarUsuario()
  await entrar(page)
  await page.addInitScript(() => { window.print = () => {} })

  await page.goto('/admin/stock/planilla/print')
  await expect(page.locator('.hdr-brand')).toHaveText('Que Copado', { timeout: 20_000 })
  await expect(page.locator('.hdr-sub')).toHaveText('Hamburguesería')

  const [pedido] = await rest('orders?select=id&limit=1')
  test.skip(!pedido, 'No hay pedidos en la base local para imprimir un ticket')
  await page.goto(`/admin/caja/ticket/${pedido.id}/print`)
  await expect(page.locator('#ticket-root').getByText('QUE COPADO', { exact: true })).toBeVisible({ timeout: 20_000 })
})
