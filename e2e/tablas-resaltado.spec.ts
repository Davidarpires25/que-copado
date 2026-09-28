import { test, expect } from '@playwright/test'
import { asegurarUsuario, USUARIO } from './local'
import { resaltadosDeLaTabla } from './panel'

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

/**
 * Los textos que si merecen resaltado: **los que son la excepcion**.
 *
 * La primera version de esta lista incluia `OK`, `Sin tracking`, `A la venta`
 * y `Disponible`, y por eso el test daba verde con una pantalla donde de diez
 * filas nueve tenian pildora. David: *"sigue habiendo pildoras"*, dos veces.
 *
 * El error no estaba en como se medía sino en la lista: si lo normal tambien
 * se resalta, el resalte no señala nada. Un estado que aparece en casi todas
 * las filas no es una alerta, es el fondo.
 */
const ESTADOS = [
  'Bajo', 'Agotado', 'Negativo', 'En rojo', 'Critico', 'Crítico',
  'No disponible', 'Auto-deshabilitado', 'Inactiva',
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
