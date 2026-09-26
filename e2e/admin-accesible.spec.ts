import { test, expect, type Page, type Browser } from '@playwright/test'
import { asegurarUsuario, rest } from './local'
import { CELULAR, resolverRutas, entrar, abrir, medir } from './panel'

/**
 * El panel sin ver y sin mouse: con lector de pantalla y con teclado.
 *
 * La auditoria que abrio este cambio encontro 178 botones sin nombre —un
 * lector de pantalla decia "boton" y nada mas— y controles a los que no se
 * llegaba con Tab. axe-core mide lo primero; lo segundo, lo que solo se nota
 * usando el teclado, se prueba aparte, abajo.
 *
 * El contraste se mide en los dos temas: el panel tiene claro y oscuro, y un
 * gris que se lee en uno puede no leerse en el otro (el terciario daba 2,33:1
 * en claro y 2,74:1 en oscuro).
 */

test.setTimeout(300_000)
test.beforeAll(asegurarUsuario)

const ESCRITORIO = { width: 1280, height: 800 }
const AXE = require.resolve('axe-core/axe.min.js')

type Violacion = { id: string; nodos: string[] }

/**
 * La app tiene una CSP que no deja inyectar scripts. El contexto la saltea
 * (`bypassCSP`): es el navegador de la prueba, la app no cambia.
 */
type Tema = 'light' | 'dark'

async function contexto(browser: Browser, tactil: boolean, tema: Tema = 'light') {
  const viewport = tactil ? CELULAR : ESCRITORIO
  const ctx = await browser.newContext({ viewport, hasTouch: tactil, isMobile: tactil, bypassCSP: true })
  // El tema se fija antes de cargar, igual que lo recuerda el panel.
  await ctx.addInitScript((t) => {
    try { localStorage.setItem('admin-theme', JSON.stringify({ state: { theme: t }, version: 0 })) } catch { /* sin storage */ }
  }, tema)
  return { ctx, page: await ctx.newPage() }
}

async function axe(page: Page): Promise<Violacion[]> {
  await page.addScriptTag({ path: AXE })
  return page.evaluate(async () => {
    // @ts-expect-error axe queda en window al inyectarlo
    const r = await window.axe.run(
      { exclude: [['.leaflet-container']] },
      {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
      }
    )
    return r.violations.map((v: { id: string; nodes: { target: string[] }[] }) => ({
      id: v.id,
      nodos: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    }))
  })
}

// ─── Recorrido con axe ──────────────────────────────────────────────────────

for (const tactil of [true, false]) for (const tema of ['light', 'dark'] as const) {
  const ancho = tactil ? CELULAR.width : ESCRITORIO.width
  test(`axe no encuentra violaciones en el panel a ${ancho}px, tema ${tema === 'light' ? 'claro' : 'oscuro'}`, async ({ browser }) => {
    const { rutas } = await resolverRutas()
    const { ctx, page } = await contexto(browser, tactil, tema)
    const fallas: string[] = []
    const anotar = (donde: string, vs: Violacion[]) => {
      for (const v of vs) fallas.push(`${donde}: ${v.id} — ${v.nodos.join(' | ')}`)
    }

    await abrir(page, '/admin/login')
    anotar('/admin/login', await axe(page))

    await entrar(page)
    for (const ruta of rutas) {
      await abrir(page, ruta)
      anotar(ruta, await medir(page, () => axe(page)))
    }

    if (tactil) {
      await abrir(page, '/admin/dashboard')
      await page.getByRole('button', { name: 'Abrir menú' }).click()
      await page.waitForTimeout(500)
      anotar('menu lateral abierto', await axe(page))
    }

    await ctx.close()
    expect(fallas, `${fallas.length} violaciones`).toEqual([])
  })
}

// ─── Con el teclado ─────────────────────────────────────────────────────────

test('el menu del celular se abre, atrapa el foco y se cierra con el teclado', async ({ browser }) => {
  const { ctx, page } = await contexto(browser, true)
  await entrar(page)
  await abrir(page, '/admin/dashboard')

  const boton = page.getByRole('button', { name: 'Abrir menú' })
  await boton.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('dialog', { name: /Menú/ })
  await expect(menu, 'el menu se anuncia como dialogo').toBeVisible()

  // Veinte Tabs: ninguno saca el foco del menu.
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    const adentro = await menu.evaluate((m) => m.contains(document.activeElement))
    expect(adentro, `Tab ${i + 1} sigue dentro del menu`).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(boton, 'el foco vuelve al boton que lo abrio').toBeFocused()
  await ctx.close()
})

test('el margen plegado de mitad y mitad no recibe el foco', async ({ browser }) => {
  const { ctx, page } = await contexto(browser, false)
  await entrar(page)
  await abrir(page, '/admin/products/new')
  await page.getByRole('button', { name: /^Mitad y Mitad/ }).click()

  // El metodo por defecto no es "Costo + margen": el campo esta plegado.
  const margen = page.locator('input[placeholder="Ej: 40"]')
  await margen.evaluate((el: HTMLElement) => el.focus())
  const enfocado = await margen.evaluate((el) => document.activeElement === el)
  expect(enfocado, 'un campo que no se ve no puede tener el foco').toBe(false)
  await ctx.close()
})

test.describe('la caja y los pedidos con el teclado', () => {
  // Una sesion propia y un pedido de mostrador de prueba, sin cobrar. Todo se
  // borra al final y la sesion de antes vuelve, pase lo que pase.
  let previas: Record<string, unknown>[] = []
  let sesion = ''

  test.beforeAll(async () => {
    previas = await rest('cash_register_sessions?status=eq.open&select=*')
    await rest('cash_register_sessions?status=eq.open', { method: 'DELETE' })
    const [perfil] = await rest('profiles?select=id&role=eq.admin&limit=1')
    ;[{ id: sesion }] = await rest('cash_register_sessions', {
      method: 'POST',
      body: JSON.stringify({ opened_by: perfil.id, opening_balance: 0, status: 'open' }),
    })
  })

  test.afterAll(async () => {
    try {
      const pedidos: { id: string }[] = await rest(`orders?cash_register_session_id=eq.${sesion}&select=id`)
      for (const { id } of pedidos) {
        const comandas: { id: string }[] = await rest(`comandas?order_id=eq.${id}&select=id`)
        for (const c of comandas) await rest(`comanda_items?comanda_id=eq.${c.id}`, { method: 'DELETE' })
        await rest(`comandas?order_id=eq.${id}`, { method: 'DELETE' })
        await rest(`print_jobs?data->>orderId=eq.${id}`, { method: 'DELETE' })
        await rest(`order_items?order_id=eq.${id}`, { method: 'DELETE' })
        await rest(`orders?id=eq.${id}`, { method: 'DELETE' })
      }
    } finally {
      await rest(`cash_register_sessions?id=eq.${sesion}`, { method: 'DELETE' })
      if (previas.length) await rest('cash_register_sessions', { method: 'POST', body: JSON.stringify(previas) })
    }
  })

  test('se elige el medio de pago y se abre un pedido sin mouse', async ({ browser }) => {
    const { ctx, page } = await contexto(browser, false)
    await entrar(page)
    await abrir(page, '/admin/caja')

    // Un pedido en el cobro: con mouse se arma, lo que se prueba es el cobro.
    await page.getByText('Hamburguesa simple').first().click()
    await page.getByRole('button', { name: /^(Cobrar|Enviar a cocina)/ }).last().click()

    const tarjeta = page.getByRole('button', { name: /^Tarjeta/ })
    await expect(tarjeta, 'Tarjeta es un control al que se llega con el teclado').toBeVisible({ timeout: 15_000 })
    await tarjeta.focus()
    await expect(tarjeta).toBeFocused()
    await page.keyboard.press('Space')
    await expect(tarjeta, 'Espacio la marca, y se anuncia marcada').toHaveAttribute('aria-pressed', 'true')

    // El pedido recien creado, en Pedidos.
    await abrir(page, '/admin/orders')
    const ver = page.getByRole('button', { name: /^Ver pedido/ }).first()
    await expect(ver, 'cada fila tiene un boton para abrirla con el teclado').toBeVisible()
    await ver.focus()
    await page.keyboard.press('Enter')
    const detalle = page.getByRole('dialog', { name: /^Pedido/ })
    await expect(detalle, 'Enter abre el detalle, y se anuncia como dialogo').toBeVisible()
    expect(await detalle.evaluate((d) => d.contains(document.activeElement)), 'el foco entra al detalle').toBe(true)
    await page.keyboard.press('Escape')
    await expect(detalle).toBeHidden()
    await expect(ver, 'el foco vuelve a la fila del pedido').toBeFocused()
    await ctx.close()
  })
})
