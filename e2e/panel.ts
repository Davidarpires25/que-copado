import { type Page, type Browser } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { rest, USUARIO } from './local'

/**
 * Lo que comparten los recorridos del panel (celular, accesibilidad): que
 * rutas hay, como se entra y como se espera a que una pantalla se asiente.
 * Una sola copia: dos recorridos con listas de rutas distintas dejarian una
 * pantalla nueva medida por uno y no por el otro.
 */

export const CELULAR = { width: 390, height: 844 }

// ─── Rutas ──────────────────────────────────────────────────────────────────

export function rutasDelPanel(): string[] {
  const raiz = path.join(__dirname, '..', 'app', 'admin')
  const rutas: string[] = []
  const recorrer = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) recorrer(p)
      else if (e.name === 'page.tsx') {
        rutas.push('/admin' + path.relative(raiz, dir).split(path.sep).map((s) => (s ? '/' + s : '')).join(''))
      }
    }
  }
  recorrer(raiz)
  return rutas
    .map((r) => r.replace(/\/$/, ''))
    .filter((r) => !r.endsWith('/print') && r !== '/admin/login')
    .sort()
}

/** Con que registro se completa cada segmento dinamico. */
const PARAMETROS: Record<string, { tabla: string; columna: string }> = {
  '/admin/products/[id]': { tabla: 'products', columna: 'id' },
  '/admin/categories/[id]': { tabla: 'categories', columna: 'id' },
  '/admin/ingredients/[id]': { tabla: 'ingredients', columna: 'id' },
  '/admin/recipes/[id]': { tabla: 'recipes', columna: 'id' },
  '/admin/stock/ficha/[productId]': { tabla: 'products', columna: 'id' },
  '/admin/empleados/roles/[key]': { tabla: 'roles', columna: 'key' },
}

export async function resolverRutas(): Promise<{ rutas: string[]; sinDatos: string[] }> {
  const rutas: string[] = []
  const sinDatos: string[] = []
  for (const ruta of rutasDelPanel()) {
    const m = ruta.match(/^(.*?\/\[[^\]]+\])/)
    if (!m) { rutas.push(ruta); continue }
    const p = PARAMETROS[m[1]]
    if (!p) { sinDatos.push(`${ruta} (segmento sin registro asignado en PARAMETROS)`); continue }
    const [fila] = await rest(`${p.tabla}?select=${p.columna}&limit=1`)
    if (!fila) { sinDatos.push(`${ruta} (no hay ${p.tabla} en la base local)`); continue }
    rutas.push(ruta.replace(/\[[^\]]+\]/, String(fila[p.columna])))
  }
  return { rutas, sinDatos }
}

// ─── Sesion ─────────────────────────────────────────────────────────────────

export async function entrar(page: Page, usuario = USUARIO) {
  await page.goto('/admin/login')
  const boton = page.getByRole('button', { name: /Iniciar Sesion/i })
  await boton.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', usuario.email)
  await page.fill('input[type="password"]', usuario.password)
  await boton.click()
  await page.waitForURL(/\/admin\/(?!login)/)
}

/** `networkidle` no llega nunca en las pantallas con realtime: se espera acotado. */
export async function abrir(page: Page, ruta: string) {
  await page.goto(ruta, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
  await page.waitForTimeout(400)
}

/**
 * Mide despues de que la pantalla dejo de navegar. Algunas rutas redirigen del
 * lado del cliente (movimientos de caja va a arqueos con su pestaña) y una
 * medicion a mitad del salto pierde el contexto.
 */
export async function medir<T>(page: Page, fn: () => Promise<T>): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await fn()
    } catch (e) {
      if (intento >= 3 || !String(e).includes('Execution context was destroyed')) throw e
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(600)
    }
  }
}

export async function paginaTactil(browser: Browser, ancho = CELULAR.width) {
  // isMobile + hasTouch es lo que hace que Chromium reporte `pointer: coarse`.
  const ctx = await browser.newContext({ viewport: { width: ancho, height: CELULAR.height }, hasTouch: true, isMobile: true })
  return { ctx, page: await ctx.newPage() }
}

