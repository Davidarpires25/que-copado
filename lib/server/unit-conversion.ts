/**
 * Unit conversion utilities for the recipe/stock system.
 * NOT a Server Action -- pure functions only.
 *
 * Unit families:
 *   mass:   kg, g          (base: kg)
 *   volume: litro, ml      (base: litro)
 *   count:  unidad          (base: unidad)
 *
 * Conversion rules:
 *   g  -> kg:    * 0.001
 *   ml -> litro: * 0.001
 */

const UNIT_FAMILIES: Record<string, string> = {
  kg: 'mass',
  g: 'mass',
  litro: 'volume',
  ml: 'volume',
  unidad: 'count',
}

const BASE_UNITS: Record<string, string> = {
  mass: 'kg',
  volume: 'litro',
  count: 'unidad',
}

const TO_BASE_FACTOR: Record<string, number> = {
  kg: 1,
  g: 0.001,
  litro: 1,
  ml: 0.001,
  unidad: 1,
}

/**
 * Returns the base unit for a given unit.
 * g|kg -> 'kg', ml|litro -> 'litro', unidad -> 'unidad'
 */
export function getBaseUnit(unit: string): string {
  const family = UNIT_FAMILIES[unit]
  if (!family) return unit
  return BASE_UNITS[family] ?? unit
}

/**
 * Converts a quantity from `fromUnit` to the base unit of its family.
 * g -> kg: *0.001, ml -> litro: *0.001, rest: *1
 */
export function convertToBaseUnit(quantity: number, fromUnit: string): number {
  const factor = TO_BASE_FACTOR[fromUnit]
  if (factor === undefined) return quantity
  return quantity * factor
}

/**
 * Converts a quantity from the base unit of its family back to `toUnit`.
 * kg -> g: *1000, litro -> ml: *1000, rest: *1
 *
 * Es la vuelta de `convertToBaseUnit`, y falto desde el principio. La receta se
 * convertia a unidad base para poder comparar --30 g pasaban a 0,03 kg-- pero
 * ese numero se restaba tal cual a un stock guardado en gramos. Cada pizza se
 * comia 0,03 g de morron en vez de 30: los insumos cargados en gramos o
 * mililitros practicamente no bajaban nunca.
 */
export function convertFromBaseUnit(quantity: number, toUnit: string): number {
  const factor = TO_BASE_FACTOR[toUnit]
  if (factor === undefined || factor === 0) return quantity
  return quantity / factor
}
