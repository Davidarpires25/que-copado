/**
 * Lo que comparten la pantalla del reporte de costos y su accion de servidor.
 *
 * Vive aca y no en `app/actions/reporte-costos.ts` porque ese archivo es
 * `'use server'`, y un archivo asi solo puede exportar funciones async: una
 * constante exportada pasa `tsc` y rompe el build de Next (leccion 16).
 */

export type GrupoDeCosto = 'elaborado' | 'combo' | 'reventa' | 'insumo'

export const GRUPOS_DE_COSTO: GrupoDeCosto[] = ['elaborado', 'combo', 'reventa', 'insumo']

/**
 * Que entra en el reporte: por grupo, que categorias.
 *
 * `'*'` es el grupo entero; una lista de ids es solo esas categorias; un grupo
 * ausente no entra. Una seleccion vacia trae todo, como la planilla de conteo.
 *
 * Por categoria y no solo por grupo porque el pedido fue mas fino que eso.
 * David: *"poder dentro de insumos elegir la categoria carnes por ejemplo"*.
 * Los insumos solos son mas de cien renglones, y quien revisa lo que se pago
 * de carne no necesita los descartables.
 */
export type SeleccionDeCostos = Partial<Record<GrupoDeCosto, string[] | '*'>>

/** El id con el que viaja "sin categoria", que no tiene fila propia. */
export const SIN_CATEGORIA_ID = 'sin'
export const SIN_CATEGORIA_NOMBRE = 'Sin categoría'

/**
 * La seleccion viaja por la URL: `?elaborado=*&insumo=<id>,<id>`.
 *
 * Asi un reporte armado --"solo las carnes"-- se guarda como favorito y se
 * reimprime cuando llega la factura, sin volver a elegir.
 */
export function seleccionAQuery(sel: SeleccionDeCostos): string {
  const partes: string[] = []
  for (const g of GRUPOS_DE_COSTO) {
    const v = sel[g]
    if (!v) continue
    if (v === '*') partes.push(`${g}=*`)
    else if (v.length > 0) partes.push(`${g}=${v.map(encodeURIComponent).join(',')}`)
  }
  return partes.length > 0 ? `?${partes.join('&')}` : ''
}

export function queryASeleccion(
  params: Partial<Record<string, string | undefined>>
): SeleccionDeCostos {
  const sel: SeleccionDeCostos = {}
  for (const g of GRUPOS_DE_COSTO) {
    const v = params[g]
    if (!v) continue
    sel[g] = v === '*' ? '*' : v.split(',').map(decodeURIComponent).filter(Boolean)
  }
  return sel
}
