import { convertToBaseUnit, convertFromBaseUnit, getBaseUnit } from '@/lib/server/unit-conversion'

/**
 * Lo que cuesta una línea de receta, una sola vez para todo el sistema.
 *
 * Estaba escrita **siete veces**: dos en el servidor —el costo de un producto y
 * el de un insumo compuesto—, una en la ficha técnica, y tres en el navegador
 * —el armador de recetas, el selector de recetas y el formulario de producto—.
 *
 * Las del navegador ni siquiera convertían unidades ni aplicaban merma, y eso
 * costó un número absurdo a la vista: una receta con 500 g de papa a $1.500 el
 * kilo mostraba **$763.510** cuando cuesta **$14.260**. La papa sola aportaba
 * $750.000, porque multiplicaba 500 por el precio de un kilo.
 *
 * Dos cosas hay que hacer para que la cuenta cierre, y las dos se olvidaban:
 *
 * 1. **Convertir a una unidad común** para poder comparar: una receta puede
 *    pedir gramos de algo cargado en kilos.
 * 2. **Volver a la unidad del insumo** antes de multiplicar por su precio,
 *    porque `cost_per_unit` es por gramo para un insumo en gramos y por kilo
 *    para uno en kilos.
 *
 * Vive en `lib/utils` y no en `lib/server` justamente porque la usan los dos
 * lados. Es una función pura: números adentro, número afuera.
 */

/** Lo mínimo que hace falta saber de un insumo para costearlo. */
export interface InsumoParaCostear {
  unit: string
  cost_per_unit: number | null
  waste_percentage?: number | null
}

/**
 * Lo que cuesta usar `cantidad` de un insumo en una receta.
 *
 * `unidadDeLaReceta` puede venir vacía: entonces se entiende en la unidad del
 * insumo. Si las unidades son de familias distintas —gramos contra litros— no
 * hay forma de compararlas y devuelve 0, que es lo mismo que hace el descuento
 * de stock con ese caso.
 */
export function costoDeLinea(
  cantidad: number,
  unidadDeLaReceta: string | null | undefined,
  insumo: InsumoParaCostear
): number {
  const precio = Number(insumo.cost_per_unit) || 0
  if (!precio || !Number.isFinite(cantidad)) return 0

  const unidad = unidadDeLaReceta || insumo.unit
  if (getBaseUnit(unidad) !== getBaseUnit(insumo.unit)) return 0

  const enBase = convertToBaseUnit(cantidad, unidad)

  const merma = Number(insumo.waste_percentage) || 0
  const factor = 1 - merma / 100
  const conMerma = factor > 0 ? enBase / factor : enBase

  return convertFromBaseUnit(conMerma, insumo.unit) * precio
}

/** Una línea de receta, como la ven tanto el servidor como el navegador. */
export interface LineaDeReceta {
  quantity: number
  unit?: string | null
  ingredients?: InsumoParaCostear | null
}

/** Lo que cuesta una receta entera, sumando sus líneas. */
export function costoDeReceta(lineas: LineaDeReceta[]): number {
  return lineas.reduce((suma, linea) => {
    if (!linea.ingredients) return suma
    return suma + costoDeLinea(linea.quantity, linea.unit, linea.ingredients)
  }, 0)
}
