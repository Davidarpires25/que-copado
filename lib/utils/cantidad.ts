/**
 * Una cantidad de insumo para leer: 0,25 kg → "250 g", 0,5 litro → "500 ml",
 * 2,5 unidades → "2,5 u". En formato argentino.
 *
 * La ficha técnica formateaba con `toFixed(3)`, que usa punto decimal: 20 g
 * de orégano salían "20.000 g", y en castellano eso se lee veinte mil. Se tomó
 * por un dato mal cargado cuando era el formato (2026-09-28).
 */
export function cantidadLegible(cantidad: number, unidad: string): string {
  const num = (n: number, decimales: number) =>
    n.toLocaleString('es-AR', { maximumFractionDigits: decimales })
  if (unidad === 'kg') return Math.abs(cantidad) < 1 ? `${num(cantidad * 1000, 1)} g` : `${num(cantidad, 3)} kg`
  if (unidad === 'litro') return Math.abs(cantidad) < 1 ? `${num(cantidad * 1000, 1)} ml` : `${num(cantidad, 3)} L`
  if (unidad === 'g') return Math.abs(cantidad) >= 1000 ? `${num(cantidad / 1000, 3)} kg` : `${num(cantidad, 1)} g`
  if (unidad === 'ml') return Math.abs(cantidad) >= 1000 ? `${num(cantidad / 1000, 3)} L` : `${num(cantidad, 1)} ml`
  if (unidad === 'unidad') return `${num(cantidad, 2)} u`
  return `${num(cantidad, 3)} ${unidad}`
}
