/**
 * Regla unica de escalado de sub-recetas.
 *
 * Esta formula estaba repetida en cinco lugares (descuento de venta, dos
 * colectores de requerimientos, la ficha tecnica y el recalculo de costo). Esa
 * duplicacion fue lo que permitio que el sitio que ESCRIBE divergiera de los
 * que LEEN: los tres lectores resolvian el compuesto a sus componentes, y el
 * que descontaba bajaba el stock del compuesto ademas del de los componentes.
 * O sea, el sistema verificaba una cosa y ejecutaba otra.
 *
 * Cualquier cambio a como se escala una sub-receta va aca y en ningun otro
 * lado.
 */

/**
 * Rendimiento efectivo de una preparacion.
 *
 * Ausente, nulo o no positivo se trata como 1, que es el comportamiento previo
 * a la migracion 032: dividir por 1 no cambia nada.
 */
export function rendimientoEfectivo(yieldQuantity: number | null | undefined): number {
  const rinde = Number(yieldQuantity)
  return Number.isFinite(rinde) && rinde > 0 ? rinde : 1
}

/**
 * Cuanto componente hace falta para `cantidadPadre` del compuesto.
 *
 * `subQuantity` se carga tal como se cocina ("1 kg de mayonesa"), junto con el
 * rendimiento del compuesto ("rinde 1,5 kg"). El sistema hace la division, que
 * es lo que antes tenia que hacer el usuario antes de escribir el numero.
 *
 * Devuelve la cantidad en la unidad de la linea de sub-receta; convertirla a
 * unidad base sigue siendo responsabilidad de quien llama.
 */
export function escalarComponente(
  subQuantity: number,
  cantidadPadre: number,
  yieldPadre: number | null | undefined
): number {
  return (Number(subQuantity) / rendimientoEfectivo(yieldPadre)) * cantidadPadre
}
