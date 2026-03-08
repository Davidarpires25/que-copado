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
 * Checks whether two units belong to the same family and can be converted.
 */
export function areUnitsCompatible(a: string, b: string): boolean {
  const familyA = UNIT_FAMILIES[a]
  const familyB = UNIT_FAMILIES[b]
  if (!familyA || !familyB) return false
  return familyA === familyB
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
 * Converts a quantity between two units.
 * Returns null if the units are not compatible (different families).
 */
export function convertBetweenUnits(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  if (fromUnit === toUnit) return quantity
  if (!areUnitsCompatible(fromUnit, toUnit)) return null

  // Convert to base first, then from base to target
  const baseQty = convertToBaseUnit(quantity, fromUnit)
  const targetFactor = TO_BASE_FACTOR[toUnit]
  if (targetFactor === undefined || targetFactor === 0) return null

  return baseQty / targetFactor
}
