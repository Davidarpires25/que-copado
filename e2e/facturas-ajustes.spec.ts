import { test, expect, type Browser, type Page } from '@playwright/test'
import { SUPABASE, SERVICE, rest, asegurarUsuario } from './local'
import { entrar, abrir } from './panel'
import { levantarArcaSimulado, PUERTO_ARCA_SIMULADO, type ArcaSimulado } from './arca-simulado'

/**
 * Ajustes → Facturación (change la-caja-emite-factura-c, tarea 5.1): probar la
 * conexión contra el ARCA simulado, guardar los datos, encender, y que se lea
 * en los dos temas. Los datos fiscales y el ticket de ARCA que hubiera en la
 * base local se guardan aparte y se devuelven.
 */

test.setTimeout(120_000)
test.describe.configure({ mode: 'serial' })

const AXE = require.resolve('axe-core/axe.min.js')
const CAJERO = { email: 'cajero-ajustes@local.test', password: 'cajero1234' }
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }
let arca: ArcaSimulado
let respaldoDatos: unknown[] = []
let respaldoTicket: unknown[] = []
let cajeroId = ''

async function contexto(browser: Browser, tema: 'light' | 'dark') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, bypassCSP: true })
  await ctx.addInitScript((t) => {
    try { localStorage.setItem('admin-theme', JSON.stringify({ state: { theme: t }, version: 0 })) } catch { /* sin storage */ }
  }, tema)
  return { ctx, page: await ctx.newPage() }
}

async function abrirFacturacion(page: Page) {
  await entrar(page)
  await abrir(page, '/admin/settings')
  await page.getByRole('button', { name: 'Facturación' }).click()
  await expect(page.getByRole('heading', { name: 'Facturación' })).toBeVisible()
}

test.beforeAll(async () => {
  await asegurarUsuario()
  arca = await levantarArcaSimulado(PUERTO_ARCA_SIMULADO)
  respaldoDatos = await rest('datos_fiscales?select=*')
  respaldoTicket = await rest('arca_ticket_de_acceso?select=*')
  await rest('datos_fiscales?id=eq.true', { method: 'DELETE' })
  await rest('arca_ticket_de_acceso?servicio=neq.x', { method: 'DELETE' })

  const lista = await fetch(`${SUPABASE}/auth/v1/admin/users`, { headers: admin }).then((r) => r.json())
  const viejo = (lista.users ?? []).find((u: { email?: string }) => u.email === CAJERO.email)
  if (viejo) await fetch(`${SUPABASE}/auth/v1/admin/users/${viejo.id}`, { method: 'DELETE', headers: admin })
  const creado = await fetch(`${SUPABASE}/auth/v1/admin/users`, {
    method: 'POST', headers: admin, body: JSON.stringify({ ...CAJERO, email_confirm: true }),
  }).then((r) => r.json())
  cajeroId = creado.id
})

test.afterAll(async () => {
  try {
    await rest('datos_fiscales?id=eq.true', { method: 'DELETE' })
    if (respaldoDatos.length) await rest('datos_fiscales', { method: 'POST', body: JSON.stringify(respaldoDatos) })
    await rest('arca_ticket_de_acceso?servicio=neq.x', { method: 'DELETE' })
    if (respaldoTicket.length) await rest('arca_ticket_de_acceso', { method: 'POST', body: JSON.stringify(respaldoTicket) })
    if (cajeroId) await fetch(`${SUPABASE}/auth/v1/admin/users/${cajeroId}`, { method: 'DELETE', headers: admin })
  } finally {
    await arca?.cerrar()
  }
})

test('probar la conexión dice en castellano si ARCA acepta la CUIT y el punto de venta', async ({ page }) => {
  await abrirFacturacion(page)
  await page.getByLabel('CUIT').fill('20111111112')
  await page.getByLabel('Punto de venta').fill('7')

  await page.getByRole('button', { name: 'Probar conexión' }).click()
  await expect(page.getByText('Conectado. El punto de venta 7 todavía no emitió facturas C.')).toBeVisible({ timeout: 15_000 })

  arca.modo = 'sin-delegacion'
  await page.getByRole('button', { name: 'Probar conexión' }).click()
  await expect(page.getByText('ARCA no reconoce la delegación de esta CUIT: falta el paso 2 de la guía de alta.')).toBeVisible({ timeout: 15_000 })
  arca.modo = 'normal'

  await page.getByLabel('CUIT').fill('20111111113')
  await page.getByRole('button', { name: 'Probar conexión' }).click()
  await expect(page.getByText('Cargá una CUIT válida para probar.')).toBeVisible()
})

test('encender pide los datos que el comprobante necesita, y con ellos se enciende', async ({ page }) => {
  await abrirFacturacion(page)
  await page.getByRole('button', { name: 'Encender facturación' }).click()
  await expect(page.locator('[data-sonner-toast]').first()).toContainText('Para encender la facturación falta: razón social, CUIT, punto de venta')

  await page.getByLabel('Razón social').fill('ZZ Local SRL')
  await page.getByLabel('CUIT').fill('20111111112')
  await page.getByLabel('Punto de venta').fill('7')
  await page.getByLabel('Domicilio comercial').fill('Calle Falsa 123')
  await page.getByLabel('Inicio de actividades').fill('2020-03-01')
  await page.getByLabel('Efectivo').uncheck()
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Datos fiscales guardados')).toBeVisible()

  await page.getByRole('button', { name: 'Encender facturación' }).click()
  await expect(page.getByText('Se emiten facturas', { exact: true })).toBeVisible()
  const [d] = await rest('datos_fiscales?select=activa,cuit,punto_venta,medios_automaticos,razon_social')
  expect(d).toEqual({ activa: true, cuit: '20111111112', punto_venta: 7, medios_automaticos: ['card', 'transfer', 'mercadopago'], razon_social: 'ZZ Local SRL' })

  // Recargada, la página muestra lo guardado.
  await page.reload()
  await page.getByRole('button', { name: 'Facturación' }).click()
  await expect(page.getByLabel('Razón social')).toHaveValue('ZZ Local SRL')
  await expect(page.getByLabel('Efectivo')).not.toBeChecked()
})

for (const tema of ['light', 'dark'] as const) {
  test(`se lee en el tema ${tema === 'light' ? 'claro' : 'oscuro'} (axe)`, async ({ browser }) => {
    const { ctx, page } = await contexto(browser, tema)
    await abrirFacturacion(page)
    await page.getByRole('button', { name: 'Probar conexión' }).click()
    await page.waitForTimeout(1500)
    await page.addScriptTag({ path: AXE })
    const violaciones = await page.evaluate(async () => {
      // @ts-expect-error axe queda en window al inyectarlo
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })
      return r.violations.map((v: { id: string; nodes: { target: string[] }[] }) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
    })
    await page.screenshot({ path: `test-results/facturacion-ajustes-${tema}.png`, fullPage: true })
    await ctx.close()
    expect(violaciones).toEqual([])
  })
}

test('un cajero no ve la facturación de Ajustes', async ({ page }) => {
  await entrar(page, CAJERO)
  await page.goto('/admin/settings')
  await expect(page.getByRole('button', { name: 'Facturación' })).toHaveCount(0)
})
