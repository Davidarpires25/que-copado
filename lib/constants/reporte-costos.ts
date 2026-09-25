/**
 * El reporte de costos: lo que comparten la pantalla y la hoja impresa.
 *
 * La regla del reporte es "se imprime lo que se ve". Para que eso sea cierto
 * siempre, el filtro y el orden viven **una sola vez**, aca: la pantalla los
 * usa para dibujar la tabla y la pagina de impresion para armar la hoja. Si
 * cada una tuviera los suyos, tarde o temprano divergirian --un orden distinto
 * para los que no tienen costo, una busqueda que ignora mayusculas en un lado
 * y no en el otro-- y el papel diria algo que la pantalla no.
 *
 * Es un modulo comun y no parte de `app/actions/reporte-costos.ts` porque ese
 * archivo es `'use server'`, y un archivo asi solo puede exportar funciones
 * async: una constante exportada pasa `tsc` y rompe el build (leccion 16).
 */

export type TipoDeProducto = 'elaborado' | 'combo' | 'reventa'
export type Pestana = 'productos' | 'insumos'

export interface FilaDeProducto {
  id: string
  nombre: string
  tipo: TipoDeProducto
  categoriaId: string
  categoria: string
  /** `null` cuando no esta cargado: se muestra `sin costo`, no en blanco. */
  costo: number | null
  precio: number
  /** En porcentaje, con un decimal. `null` si no hay costo o no hay precio. */
  margen: number | null
}

export interface FilaDeInsumo {
  id: string
  nombre: string
  categoriaId: string
  categoria: string
  unidad: string
  costo: number | null
  /**
   * Lo mismo por kilo o por litro, para los que estan en gramos o mililitros.
   *
   * Es donde se esconde el error de mil veces: `Cereales` a $200 el gramo no
   * llama la atencion; a $200.000 el kilo, si.
   */
  equivalente: { valor: number; unidad: string } | null
}

export interface Categoria {
  id: string
  nombre: string
}

export const COLUMNAS_DE_PRODUCTO = ['nombre', 'categoria', 'tipo', 'costo', 'precio', 'margen'] as const
export const COLUMNAS_DE_INSUMO = ['nombre', 'categoria'] as const
export type ColumnaDeProducto = (typeof COLUMNAS_DE_PRODUCTO)[number]
export type ColumnaDeInsumo = (typeof COLUMNAS_DE_INSUMO)[number]

/** Lo que se esta viendo, y por lo tanto lo que se imprime. */
export interface VistaDeCostos {
  pestana: Pestana
  /** `null` es "Todas". */
  categoria: string | null
  busqueda: string
  orden: string
  asc: boolean
}

export const VISTA_INICIAL: VistaDeCostos = {
  pestana: 'productos',
  categoria: null,
  busqueda: '',
  orden: 'categoria',
  asc: true,
}

export const SIN_CATEGORIA_ID = 'sin'
export const SIN_CATEGORIA_NOMBRE = 'Sin categoría'

export const NOMBRE_DEL_TIPO: Record<TipoDeProducto, string> = {
  elaborado: 'Elaborado',
  combo: 'Combo',
  reventa: 'Reventa',
}

/** El margen sobre el precio de venta, en porcentaje con un decimal. */
export function margenDe(costo: number | null, precio: number): number | null {
  if (!costo || costo <= 0 || !precio || precio <= 0) return null
  return Math.round(((precio - costo) / precio) * 1000) / 10
}

/** Una unidad chica y su equivalente grande. */
export function equivalenteDe(costo: number | null, unidad: string): FilaDeInsumo['equivalente'] {
  if (!costo || costo <= 0) return null
  if (unidad === 'g') return { valor: costo * 1000, unidad: 'kg' }
  if (unidad === 'ml') return { valor: costo * 1000, unidad: 'litro' }
  return null
}

// ── La vista en la URL ──────────────────────────────────────────────────────

/**
 * La vista viaja por la URL: `?vista=insumos&cat=<id>&q=carne&orden=margen&dir=desc`.
 *
 * Asi "las carnes, ordenadas por nombre" se guarda como favorito y se reimprime
 * cuando llega la factura, sin volver a elegir. Y es lo que usa el boton de
 * imprimir para pasarle a la hoja exactamente lo que hay en pantalla.
 */
export function vistaAQuery(v: VistaDeCostos): string {
  const p = new URLSearchParams()
  if (v.pestana !== VISTA_INICIAL.pestana) p.set('vista', v.pestana)
  if (v.categoria) p.set('cat', v.categoria)
  if (v.busqueda.trim()) p.set('q', v.busqueda.trim())
  if (v.orden !== VISTA_INICIAL.orden) p.set('orden', v.orden)
  if (!v.asc) p.set('dir', 'desc')
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function queryAVista(params: Partial<Record<string, string | undefined>>): VistaDeCostos {
  const pestana: Pestana = params.vista === 'insumos' ? 'insumos' : 'productos'
  const columnas: readonly string[] =
    pestana === 'productos' ? COLUMNAS_DE_PRODUCTO : COLUMNAS_DE_INSUMO
  const orden = params.orden && columnas.includes(params.orden) ? params.orden : VISTA_INICIAL.orden

  return {
    pestana,
    categoria: params.cat || null,
    busqueda: params.q ?? '',
    orden,
    asc: params.dir !== 'desc',
  }
}

// ── Filtrar y ordenar: una sola vez ─────────────────────────────────────────

/** Sin distinguir mayusculas ni tildes: "napolitana" encuentra "Napolitana". */
function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

type Comparable = string | number | null

/**
 * Compara dos valores. **Lo que falta va al final en los dos sentidos.**
 *
 * Ordenar por margen de menor a mayor es para encontrar lo que menos deja; si
 * los que no tienen costo quedaran arriba, taparian justo eso. Y de mayor a
 * menor tampoco tienen lugar arriba: no es que dejen mucho, es que no se sabe.
 */
function comparar(a: Comparable, b: Comparable, asc: boolean): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  const r = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'es')
  return asc ? r : -r
}

function filtrar<F extends { nombre: string; categoriaId: string }>(filas: F[], v: VistaDeCostos): F[] {
  const q = normalizar(v.busqueda.trim())
  return filas.filter(
    (f) => (!v.categoria || f.categoriaId === v.categoria) && (!q || normalizar(f.nombre).includes(q))
  )
}

export function filtrarProductos(filas: FilaDeProducto[], v: VistaDeCostos): FilaDeProducto[] {
  const orden = (COLUMNAS_DE_PRODUCTO as readonly string[]).includes(v.orden)
    ? (v.orden as ColumnaDeProducto)
    : 'categoria'

  const valor = (f: FilaDeProducto): Comparable =>
    orden === 'tipo' ? NOMBRE_DEL_TIPO[f.tipo] : f[orden]

  return filtrar(filas, v).sort(
    (a, b) => comparar(valor(a), valor(b), v.asc) || a.nombre.localeCompare(b.nombre, 'es')
  )
}

export function filtrarInsumos(filas: FilaDeInsumo[], v: VistaDeCostos): FilaDeInsumo[] {
  const orden: ColumnaDeInsumo = v.orden === 'nombre' ? 'nombre' : 'categoria'
  return filtrar(filas, v).sort(
    (a, b) => comparar(a[orden], b[orden], v.asc) || a.nombre.localeCompare(b.nombre, 'es')
  )
}

// ── El pie ──────────────────────────────────────────────────────────────────

export interface ResumenDeProductos {
  cantidad: number
  sinCosto: number
  /** Promedio simple de los margenes que se pudieron calcular. */
  margenPromedio: number | null
}

export function resumirProductos(filas: FilaDeProducto[]): ResumenDeProductos {
  const margenes = filas.map((f) => f.margen).filter((m): m is number => m !== null)
  return {
    cantidad: filas.length,
    sinCosto: filas.filter((f) => f.costo === null).length,
    margenPromedio:
      margenes.length > 0
        ? Math.round((margenes.reduce((s, m) => s + m, 0) / margenes.length) * 10) / 10
        : null,
  }
}

export function resumirInsumos(filas: FilaDeInsumo[]): { cantidad: number; sinCosto: number } {
  return { cantidad: filas.length, sinCosto: filas.filter((f) => f.costo === null).length }
}

/** Como se nombra lo que se esta viendo, para el encabezado de la hoja. */
export function describirVista(v: VistaDeCostos, categorias: Categoria[]): string {
  const partes = [v.pestana === 'productos' ? 'Productos' : 'Insumos']
  partes.push(v.categoria ? (categorias.find((c) => c.id === v.categoria)?.nombre ?? 'Categoría') : 'Todas las categorías')
  if (v.busqueda.trim()) partes.push(`"${v.busqueda.trim()}"`)
  return partes.join(' · ')
}

// ── Como se escriben los numeros ────────────────────────────────────────────

/**
 * Pesos sin decimales de mas: `$ 9.000` se lee, `$ 9.000,00` no agrega nada.
 * Los montos chicos --un insumo a $2,50 el gramo-- si llevan decimales.
 *
 * Vive aca para que la pantalla y la hoja escriban el mismo numero igual.
 */
export function formatearPesos(n: number): string {
  return '$ ' + n.toLocaleString('es-AR', { maximumFractionDigits: n < 100 ? 2 : 0 })
}

export function formatearMargen(m: number): string {
  return `${m.toLocaleString('es-AR')} %`
}

export const ABREVIATURA_DE_UNIDAD: Record<string, string> = {
  kg: 'kg', g: 'g', litro: 'l', ml: 'ml', unidad: 'u',
}
