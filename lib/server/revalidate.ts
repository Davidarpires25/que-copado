import { revalidatePath } from 'next/cache'

/** Revalida catálogo público + dashboard admin (productos y categorías) */
export function revalidateStorefront() {
  revalidatePath('/')
  revalidatePath('/admin/dashboard')
}

/** Revalida listado de órdenes + dashboard admin */
export function revalidateOrders() {
  revalidatePath('/admin/orders')
  revalidatePath('/admin/dashboard')
}

/** Revalida zonas de delivery + checkout */
export function revalidateDeliveryZones() {
  revalidatePath('/admin/delivery-zones')
  revalidatePath('/checkout')
}

/** Revalida configuración del negocio + checkout + home */
export function revalidateBusinessSettings() {
  revalidatePath('/admin/settings')
  revalidatePath('/checkout')
  revalidatePath('/')
}

/** Revalida caja POS + dashboard */
export function revalidateCaja() {
  revalidatePath('/admin/caja')
  revalidatePath('/admin/dashboard')
}

/** Revalida gestión de mesas + caja */
export function revalidateTables() {
  revalidatePath('/admin/tables')
  revalidatePath('/admin/caja')
}

/** Revalida ingredientes + recetas + productos (cost recalc) + analytics */
export function revalidateIngredients() {
  revalidatePath('/admin/ingredients')
  revalidatePath('/admin/recipes')
  revalidatePath('/admin/products')
  revalidatePath('/admin/analytics')
  revalidatePath('/admin/dashboard')
}

/** Revalida recetas + productos (cost recalc) + analytics */
export function revalidateRecipes() {
  revalidatePath('/admin/recipes')
  revalidatePath('/admin/products')
  revalidatePath('/admin/analytics')
  revalidatePath('/admin/dashboard')
}
