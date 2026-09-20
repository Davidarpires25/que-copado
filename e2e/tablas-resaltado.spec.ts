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

/**
 * Un dato **encerrado**: con fondo propio y, ademas, borde o esquinas redondas.
 *
 * La primera version buscaba solo pildoras --`border-radius` enorme-- y se le
 * escapo el contador de ingredientes de la tabla de recetas, que iba en una
 * caja cuadrada con borde. Lo encontro David mirando. Lo que molesta es que el
 * dato este *encerrado*, no la forma del encierro.
 *
 * Los controles quedan afuera: un `<select>` o un interruptor se tocan, y su
 * color es parte de como se ve que estan. Encerrar no es lo mismo que pintar
 * algo con lo que se interactua.
 */
async function resaltadosDeLaTabla(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const encontrados: string[] = []
    document.querySelectorAll('tbody tr').forEach((fila) =>
      fila.querySelectorAll('span, div, p').forEach((el) => {
        if (el.closest('button, a, select, input, [role="switch"], [role="button"]')) return
        const cs = getComputedStyle(el)
        const conFondo =
          cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent'
        const encerrado = parseFloat(cs.borderRadius) > 0 || parseFloat(cs.borderTopWidth) > 0
        const texto = (el.textContent ?? '').trim()

        // Interesa la caja, no el contenedor que la envuelve. La primera
        // version pedia `children.length === 0`, y eso dejaba afuera cualquier
        // badge con un icono adentro --el tipo de movimiento del historial de
        // stock, por ejemplo--. Lo noto David mirando la pantalla. Ahora la
        // condicion es la correcta: que no contenga otra caja adentro.
        const contieneOtraCaja = [...el.querySelectorAll('span, div, p')].some((hijo) => {
          const ch = getComputedStyle(hijo)
          const hijoConFondo =
            ch.backgroundColor !== 'rgba(0, 0, 0, 0)' && ch.backgroundColor !== 'transparent'
          return (
            hijoConFondo &&
            (parseFloat(ch.borderRadius) > 0 || parseFloat(ch.borderTopWidth) > 0)
          )
        })

        if (conFondo && encerrado && texto && texto.length < 34 && !contieneOtraCaja)
          encontrados.push(texto)
      })
    )
    return [...new Set(encontrados)]
  })
}

/**
 * Las pantallas del panel que tienen tabla y datos con los que probar.
 *
 * Faltan las que en la base local estan vacias --pedidos, arqueos, analytics,
 * mesas, zonas-- donde este test no puede concluir nada: esas se revisaron
 * leyendo el codigo. Si alguna vez hay datos de prueba, van aca.
 */
/** Las pestañas de Stock, que no se ven hasta que se las abre. */
const PESTANAS_DE_STOCK = ['Stock Actual', 'Alertas', 'Movimientos', 'Consumo Histórico']

for (const [ruta, nombre] of [
  ['/admin/ingredients', 'insumos'],
  ['/admin/stock', 'stock'],
  ['/admin/products', 'productos'],
  ['/admin/categories', 'categorias'],
  ['/admin/recipes', 'recetas'],
  ['/admin/empleados', 'equipo'],
]) {
  test(`en ${nombre} solo el estado va resaltado`, async ({ page }) => {
    await page.goto(ruta)
    await page.waitForTimeout(1200)

    // Stock esconde cuatro tablas detras de pestañas. Mirar solo la primera
    // fue exactamente el agujero que dejo pasar el tipo de movimiento.
    const resaltados: string[] = []
    if (nombre === 'stock') {
      for (const pestana of PESTANAS_DE_STOCK) {
        const boton = page.getByRole('button', { name: pestana, exact: false }).first()
        if (await boton.count()) {
          await boton.click()
          await page.waitForTimeout(1300)
        }
        resaltados.push(...(await resaltadosDeLaTabla(page)))
      }
    } else {
      resaltados.push(...(await resaltadosDeLaTabla(page)))
    }

    const queNoSonEstado = resaltados.filter(
      (t) => !ESTADOS.some((e) => t.toLowerCase().includes(e.toLowerCase()))
    )

    // Si esto falla, el texto del error dice cual se colo.
    expect(queNoSonEstado).toEqual([])
  })
}
