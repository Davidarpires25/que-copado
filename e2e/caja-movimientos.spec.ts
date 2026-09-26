import { test, expect } from '@playwright/test'
import { asegurarUsuario } from './local'
import { entrar } from './panel'

/**
 * `/admin/caja/movimientos` es una direccion vieja: los movimientos viven en
 * Arqueos, en su pestaña. Se sigue redirigiendo por los favoritos y los links
 * que hayan quedado.
 *
 * La redireccion estaba en la pagina (`redirect()` en el componente), debajo
 * de `app/admin/caja/loading.tsx`. Con el Suspense del loading la respuesta ya
 * habia salido con 200 cuando se ejecutaba el redirect, asi que Next lo mandaba
 * dentro del stream y el Router del cliente lo procesaba en plena hidratacion:
 * "Rendered more hooks than during the previous render". Llegaba igual, pero
 * rompiendo.
 */

test.beforeAll(asegurarUsuario)

test('la direccion vieja de movimientos redirige antes de renderizar', async ({ page }) => {
  await entrar(page)
  const r = await page.request.get('/admin/caja/movimientos?session=abc', { maxRedirects: 0 })
  expect(r.status(), 'un 307 de verdad, no un 200 con la redireccion adentro').toBe(307)
  const destino = new URL(r.headers()['location'], 'http://x')
  expect(destino.pathname).toBe('/admin/caja/arqueos')
  expect(destino.searchParams.get('tab')).toBe('movimientos')
  expect(destino.searchParams.get('session'), 'el parametro de la URL vieja llega al destino').toBe('abc')
})

test('llega a arqueos sin errores en el navegador', async ({ page }) => {
  const errores: string[] = []
  page.on('pageerror', (e) => errores.push(e.message))
  await entrar(page)
  await page.goto('/admin/caja/movimientos?session=abc')
  await page.waitForURL((u) => u.pathname === '/admin/caja/arqueos' && u.searchParams.get('tab') === 'movimientos')
  await page.waitForTimeout(1500)
  expect(errores).toEqual([])
})
