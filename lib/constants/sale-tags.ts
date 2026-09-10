/**
 * Grupo de cobro para lo que no tiene comensal asignado.
 *
 * Los items sin `sale_tag` no son un error: una picada o la gaseosa de la mesa
 * no tienen dueño, y ademas todo lo cargado antes de crear el primer comensal
 * queda asi para siempre —`sale_tag` solo se escribe al insertar el item—.
 *
 * Es una clave interna: nunca se guarda. Los payment_splits registran monto y
 * medio de pago, no la etiqueta.
 */
export const SIN_ASIGNAR = '__sin_asignar__'

/** Lo que ve la persona. */
export function etiquetaComensal(tag: string | null | undefined): string {
  if (!tag) return 'Sin asignar'
  return tag === SIN_ASIGNAR ? 'Sin asignar' : tag
}
