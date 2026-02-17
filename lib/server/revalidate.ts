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
