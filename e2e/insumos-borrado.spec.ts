import { test, expect, type Page } from '@playwright/test'
import { rest, asegurarUsuario, USUARIO } from './local'

/**
 * El boton de Eliminar de un insumo hace tres cosas distintas segun el caso, y
 * las tres importan: la que bloquea, la que desactiva y la que borra.
 *
 * La del medio es la que motivo el arreglo. Antes fallaba con un `23514` que no
 * le dice nada a nadie: la clave de `stock_movements` es `ON DELETE SET NULL`, y
 * al dejar el movimiento sin insumo choca contra el CHECK que exige que apunte
 * a un insumo o a un producto.
 *
 * Los datos los arma el test y se los lleva al terminar, asi que puede correr
 * sobre una base local con cosas adentro sin ensuciarla.
 */

const ID = {
  conHistorial: 'aaaa0000-0000-0000-0000-00000000e2e1',
  hijo: 'aaaa0000-0000-0000-0000-00000000e2e2',
  padre: 'aaaa0000-0000-0000-0000-00000000e2e3',
  limpio: 'aaaa0000-0000-0000-0000-00000000e2e4',
  enReceta: 'aaaa0000-0000-0000-0000-00000000e2e5',
}

const NOMBRE = {
  conHistorial: 'ZZ Test Con Historial',
  hijo: 'ZZ Test Hijo',
  padre: 'ZZ Test Padre',
  limpio: 'ZZ Test Limpio',
  enReceta: 'ZZ Test En Receta',
}

let recetaId: string

async function limpiar() {
  const ids = Object.values(ID)
  const lista = `(${ids.join(',')})`
  await rest(`ingredient_sub_recipes?child_ingredient_id=in.${lista}`, { method: 'DELETE' })
  await rest(`ingredient_sub_recipes?parent_ingredient_id=in.${lista}`, { method: 'DELETE' })
  await rest(`recipe_ingredients?ingredient_id=in.${lista}`, { method: 'DELETE' })
  await rest(`stock_movements?ingredient_id=in.${lista}`, { method: 'DELETE' })
  await rest(`recipes?name=eq.ZZ Test Receta`, { method: 'DELETE' })
  await rest(`ingredients?id=in.${lista}`, { method: 'DELETE' })
}

test.beforeAll(async () => {
  await asegurarUsuario()
  await limpiar()

  await rest('ingredients', {
    method: 'POST',
    body: JSON.stringify(
      Object.entries(NOMBRE).map(([clave, name]) => ({
        id: ID[clave as keyof typeof ID],
        name,
        unit: 'kg',
        cost_per_unit: 100,
      }))
    ),
  })

  // Caso 1: usado por la receta de un producto.
  const [receta] = await rest('recipes', {
    method: 'POST',
    body: JSON.stringify([{ name: 'ZZ Test Receta' }]),
  })
  recetaId = receta.id
  await rest('recipe_ingredients', {
    method: 'POST',
    body: JSON.stringify([
      { recipe_id: recetaId, ingredient_id: ID.enReceta, quantity: 1, unit: 'kg' },
    ]),
  })

  // Caso 1b: usado como hijo de un insumo compuesto.
  await rest('ingredient_sub_recipes', {
    method: 'POST',
    body: JSON.stringify([
      { parent_ingredient_id: ID.padre, child_ingredient_id: ID.hijo, quantity: 1, unit: 'kg' },
    ]),
  })

  // Caso 2: con historial de stock y ninguna receta.
  await rest('stock_movements', {
    method: 'POST',
    body: JSON.stringify([
      {
        ingredient_id: ID.conHistorial,
        movement_type: 'purchase',
        quantity: 5,
        previous_stock: 0,
        new_stock: 5,
      },
    ]),
  })
})

test.afterAll(limpiar)

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/login')

  // El formulario manda una server action, asi que un click antes de que
  // hidrate no hace nada y el test se queda esperando una navegacion que nunca
  // sale. Esperar al boton no alcanza: existe desde el HTML del servidor.
  const entrar = page.getByRole('button', { name: /Iniciar Sesion/i })
  await entrar.waitFor()
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', USUARIO.email)
  await page.fill('input[type="password"]', USUARIO.password)
  await entrar.click()
  await page.waitForURL(/\/admin\/(?!login)/)
})

/** Busca el insumo, aprieta el tacho y confirma. */
async function pedirEliminar(page: Page, nombre: string) {
  await page.goto('/admin/ingredients')
  await page.getByPlaceholder(/Buscar ingrediente/i).fill(nombre)
  await page.getByRole('button', { name: `Eliminar ${nombre}` }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click()
}

/** El estado en la base, que es lo unico que no miente. */
async function enLaBase(id: string): Promise<{ existe: boolean; activo?: boolean }> {
  const filas = await rest(`ingredients?id=eq.${id}&select=is_active`)
  return filas.length === 0 ? { existe: false } : { existe: true, activo: filas[0].is_active }
}

test('un insumo usado en una receta no se elimina, y dice en cual', async ({ page }) => {
  await pedirEliminar(page, NOMBRE.enReceta)

  await expect(page.locator('[data-sonner-toast]')).toContainText('ZZ Test Receta')
  await expect(page.locator('[data-sonner-toast]')).toContainText('No se puede eliminar')

  expect(await enLaBase(ID.enReceta)).toEqual({ existe: true, activo: true })
})

test('un insumo usado dentro de otro insumo tampoco, y nombra al padre', async ({ page }) => {
  await pedirEliminar(page, NOMBRE.hijo)

  await expect(page.locator('[data-sonner-toast]')).toContainText(NOMBRE.padre)

  expect(await enLaBase(ID.hijo)).toEqual({ existe: true, activo: true })
})

test('un insumo con movimientos de stock se desactiva y no se pierde el historial', async ({
  page,
}) => {
  await pedirEliminar(page, NOMBRE.conHistorial)

  await expect(page.locator('[data-sonner-toast]')).toContainText('desactivado')

  // Sigue estando, apagado: es lo que permite reconstruir un faltante despues.
  expect(await enLaBase(ID.conHistorial)).toEqual({ existe: true, activo: false })

  const movimientos = await rest(`stock_movements?ingredient_id=eq.${ID.conHistorial}&select=id`)
  expect(movimientos).toHaveLength(1)
})

test('un insumo sin recetas ni movimientos se elimina de verdad', async ({ page }) => {
  await pedirEliminar(page, NOMBRE.limpio)

  await expect(page.locator('[data-sonner-toast]')).toContainText('eliminado')

  expect(await enLaBase(ID.limpio)).toEqual({ existe: false })
})
