import { test, expect } from '@playwright/test'
import { asegurarUsuario, USUARIO } from './local'

/**
 * En una tabla del panel, lo unico resaltado es el estado.
 *
 * La regla, en una linea: *si no cambia segun lo que pase, no lleva color.*
 *
 * David: *"el dato descartable y unidad los cierran circulos con colores, me
 * hace sentir que es muy IA y no se ve bien"*. Tenia razon, y el costo no era
 * estetico: en la fila de un insumo agotado convivian el badge rojo del estado,
 * el de la categoria y el circulo de la unidad, y solo uno de los tres
 * importaba. Cuando todo esta resaltado, nada lo esta.
 *
 * Este test existe porque una convencion sin quien la vigile se erosiona sola,
 * igual que pasó con los esqueletos de carga. Mide lo que se ve --el estilo ya
 * calculado por el navegador-- y no que componente se uso.
 */

/** Los textos que si son estado y por eso pueden ir resaltados. */
const ESTADOS = [
  'OK', 'Bajo', 'Agotado', 'Negativo', 'Sin seguimiento', 'Sin tracking',
  'Critico', 'Crítico', 'A la venta', 'No disponible', 'Auto-deshabilitado',
  'Inactiva', 'Disponible', 'En rojo',
]

test.beforeAll(asegurarUsuario)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/admin/login')
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)
})

/** Lo que el navegador dibuja como pildora: fondo propio y esquinas redondas. */
async function resaltadosDeLaTabla(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const encontrados: string[] = []
    document.querySelectorAll('tbody tr').forEach((fila) =>
      fila.querySelectorAll('span, div').forEach((el) => {
        const cs = getComputedStyle(el)
        const conFondo =
          cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent'
        // `rounded-full` en Tailwind 4 es `calc(infinity * 1px)`, y el
        // navegador lo calcula como un numero enorme --3.3e7px-- no como
        // "9999px". Buscar la cadena "9999" no encontraba nada y el test
        // pasaba contra cualquier codigo, que es no probar nada.
        const redondo = parseFloat(cs.borderRadius) >= 9999
        const texto = (el.textContent ?? '').trim()
        // Sin hijos: interesa la pildora, no el contenedor que la envuelve.
        if (conFondo && redondo && texto && el.children.length === 0) encontrados.push(texto)
      })
    )
    return [...new Set(encontrados)]
  })
}

for (const [ruta, nombre] of [
  ['/admin/ingredients', 'insumos'],
  ['/admin/stock', 'stock'],
  ['/admin/products', 'productos'],
]) {
  test(`en ${nombre} solo el estado va resaltado`, async ({ page }) => {
    await page.goto(ruta)
    await page.waitForTimeout(1200)

    const resaltados = await resaltadosDeLaTabla(page)
    const queNoSonEstado = resaltados.filter(
      (t) => !ESTADOS.some((e) => t.toLowerCase().includes(e.toLowerCase()))
    )

    // Si esto falla, el texto del error dice cual se colo.
    expect(queNoSonEstado).toEqual([])
  })
}
