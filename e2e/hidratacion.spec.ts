import { test, expect } from '@playwright/test'
import { asegurarUsuario } from './local'
import { resolverRutas, entrar, abrir } from './panel'

/**
 * Lo que el servidor renderiza tiene que coincidir con lo que dibuja el
 * navegador al hidratar.
 *
 * En produccion el servidor corre en UTC y el local esta en Argentina: un
 * texto que dependa de la hora o de la zona horaria sale distinto en cada
 * lado, y React descarta el arbol y lo vuelve a armar en el cliente. En la
 * maquina de desarrollo los dos comparten zona y el error se esconde; aparecia
 * solo cuando el minuto cambiaba justo entre el render del servidor y la
 * hidratacion.
 *
 * Para que se vea siempre, el navegador de la prueba corre en UTC+14: lejos de
 * cualquier zona en la que pueda estar el servidor.
 */

test.setTimeout(300_000)
test.beforeAll(asegurarUsuario)

test('ninguna pantalla del panel falla al hidratar en otra zona horaria', async ({ browser }) => {
  const { rutas } = await resolverRutas()
  const ctx = await browser.newContext({ timezoneId: 'Pacific/Kiritimati' })
  const page = await ctx.newPage()
  const errores: string[] = []
  let donde = ''
  page.on('pageerror', (e) => errores.push(`${donde}: ${e.message.slice(0, 120)}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && /hydrat/i.test(m.text())) errores.push(`${donde}: ${m.text().slice(0, 120)}`)
  })

  await entrar(page)
  for (const ruta of rutas) {
    donde = ruta
    await abrir(page, ruta)
  }
  await ctx.close()
  expect(errores).toEqual([])
})
