/** "Factura C 0007-00000012": como se escribe un comprobante en Argentina. */

export const NOMBRE_TIPO: Record<number, string> = {
  11: 'Factura C',
  13: 'Nota de crédito C',
}

export function numeroDeComprobante(puntoVenta: number, numero: number) {
  return `${String(puntoVenta).padStart(4, '0')}-${String(numero).padStart(8, '0')}`
}

export function nombreDeComprobante(f: { tipo: number; punto_venta: number | null; numero: number | null }) {
  const tipo = NOMBRE_TIPO[f.tipo] ?? `Comprobante ${f.tipo}`
  return f.punto_venta && f.numero ? `${tipo} ${numeroDeComprobante(f.punto_venta, f.numero)}` : tipo
}
