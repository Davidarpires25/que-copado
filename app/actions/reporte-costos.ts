'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { friendlyError } from '@/lib/server/error-messages'
import { requirePermission } from '@/lib/server/profile'

/**
 * El reporte de costos: que cuesta cada cosa, y cuanto deja lo que se vende.
 *
 * El costo ya existia y se calculaba bien, pero solo se veia de a uno --abriendo
 * la ficha de un producto--. Para revisar precios hace falta verlos todos
 * juntos, y el cliente lo pidio en papel.
 *
 * Hay dos formas de fila porque hay dos preguntas distintas. Un **producto** se
 * vende: tiene costo, precio y margen. Un **insumo** no se vende: tiene lo que
 * cuesta un kilo, un litro o una unidad, y nada mas. Forzarlos a la misma
 * tabla dejaria dos columnas vacias en cien renglones.
 */

import {
  GRUPOS_DE_COSTO,
  SIN_CATEGORIA_ID,
  SIN_CATEGORIA_NOMBRE,
  type GrupoDeCosto,
  type SeleccionDeCostos,
} from '@/lib/constants/reporte-costos'

export interface FilaDeProducto {
  id: string
  nombre: string
  /** `null` cuando no esta cargado: el reporte lo marca, no lo deja en blanco. */
  costo: number | null
  precio: number
  /** En porcentaje, con un decimal. `null` si no hay costo o no hay precio. */
  margen: number | null
}

export interface FilaDeInsumo {
  id: string
  nombre: string
  unidad: string
  costo: number | null
  /**
   * Lo mismo por kilo o por litro, para los que estan en gramos o mililitros.
   *
   * Es donde se esconde el error de mil veces: `Morrón` a $200 el gramo no
   * llama la atencion; a $200.000 el kilo, si.
   */
  equivalente: { valor: number; unidad: string } | null
}

export interface CategoriaDeCostos<F> {
  nombre: string
  filas: F[]
}

export type SeccionDeCostos =
  | { grupo: 'elaborado' | 'combo' | 'reventa'; categorias: CategoriaDeCostos<FilaDeProducto>[] }
  | { grupo: 'insumo'; categorias: CategoriaDeCostos<FilaDeInsumo>[] }

export interface ResumenDeCostos {
  productos: number
  productosSinCosto: number
  /** Promedio simple de los margenes que se pudieron calcular. */
  margenPromedio: number | null
  insumos: number
  insumosSinCosto: number
}


/** El margen sobre el precio de venta, en porcentaje con un decimal. */
function margenDe(costo: number | null, precio: number): number | null {
  if (!costo || costo <= 0 || !precio || precio <= 0) return null
  return Math.round(((precio - costo) / precio) * 1000) / 10
}

/** Una unidad chica y su equivalente grande. */
function equivalenteDe(costo: number | null, unidad: string): FilaDeInsumo['equivalente'] {
  if (!costo || costo <= 0) return null
  if (unidad === 'g') return { valor: costo * 1000, unidad: 'kg' }
  if (unidad === 'ml') return { valor: costo * 1000, unidad: 'litro' }
  return null
}

/** Agrupa por categoria respetando el orden dado, con "Sin categoria" al final. */
function agrupar<F extends { nombre: string }>(
  filas: (F & { categoria: string | null })[],
  orden: string[]
): CategoriaDeCostos<F>[] {
  const porCategoria = new Map<string, F[]>()
  for (const { categoria, ...fila } of filas) {
    const clave = categoria ?? SIN_CATEGORIA_NOMBRE
    const lista = porCategoria.get(clave) ?? []
    lista.push(fila as unknown as F)
    porCategoria.set(clave, lista)
  }

  const claves = [...porCategoria.keys()].sort((a, b) => {
    if (a === SIN_CATEGORIA_NOMBRE) return 1
    if (b === SIN_CATEGORIA_NOMBRE) return -1
    const ia = orden.indexOf(a)
    const ib = orden.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    return a.localeCompare(b, 'es')
  })

  return claves.map((nombre) => ({
    nombre,
    filas: (porCategoria.get(nombre) ?? []).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  }))
}

/** Una categoria elegible, con cuantos renglones aporta. */
export interface OpcionDeCategoria {
  id: string
  nombre: string
  cantidad: number
}

/** El nombre y el id de una relacion anidada, venga como objeto o como arreglo. */
function relacion(rel: unknown): { id: string; nombre: string } | null {
  const fila = Array.isArray(rel) ? rel[0] : rel
  const r = fila as { id?: unknown; name?: unknown } | null
  if (!r || typeof r.id !== 'string' || typeof r.name !== 'string') return null
  return { id: r.id, nombre: r.name }
}

/** Si esta fila entra, segun lo elegido para su grupo. */
function entra(sel: SeleccionDeCostos, grupo: GrupoDeCosto, categoriaId: string): boolean {
  const v = sel[grupo]
  if (!v) return false
  return v === '*' || v.includes(categoriaId)
}

/** Lo que el reporte cuenta como producto de cada grupo. */
const ES_PRODUCTO: GrupoDeCosto[] = ['elaborado', 'combo', 'reventa']

/**
 * Las opciones para armar el reporte: cada grupo con sus categorias, y cuantos
 * renglones aporta cada una.
 *
 * Se muestra antes de imprimir para no llevarse cuatro paginas sin querer.
 * Una categoria que no tiene nada activo en ese grupo no se ofrece: elegirla
 * daria una seccion vacia.
 */
export async function getOpcionesDelReporte(): Promise<{
  data: Record<GrupoDeCosto, OpcionDeCategoria[]> | null
  error: string | null
}> {
  const denied = await requirePermission('analytics.view')
  if (denied) return { data: null, error: denied.error }

  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const [productos, insumos] = await Promise.all([
    supabase.from('products').select('product_type, categories(id, name)').eq('is_active', true),
    supabase.from('ingredients').select('ingredient_categories(id, name)').eq('is_active', true),
  ])

  const error = productos.error || insumos.error
  if (error) return { data: null, error: friendlyError(error) }

  const conteo: Record<GrupoDeCosto, Map<string, OpcionDeCategoria>> = {
    elaborado: new Map(), combo: new Map(), reventa: new Map(), insumo: new Map(),
  }

  const sumar = (grupo: GrupoDeCosto, cat: { id: string; nombre: string } | null) => {
    const id = cat?.id ?? SIN_CATEGORIA_ID
    const actual = conteo[grupo].get(id)
    if (actual) actual.cantidad++
    else conteo[grupo].set(id, { id, nombre: cat?.nombre ?? SIN_CATEGORIA_NOMBRE, cantidad: 1 })
  }

  for (const p of productos.data ?? []) {
    const grupo = p.product_type as GrupoDeCosto
    if (ES_PRODUCTO.includes(grupo)) sumar(grupo, relacion(p.categories))
  }
  for (const i of insumos.data ?? []) sumar('insumo', relacion(i.ingredient_categories))

  const ordenar = (m: Map<string, OpcionDeCategoria>) =>
    [...m.values()].sort((a, b) => {
      if (a.id === SIN_CATEGORIA_ID) return 1
      if (b.id === SIN_CATEGORIA_ID) return -1
      return a.nombre.localeCompare(b.nombre, 'es')
    })

  return {
    data: {
      elaborado: ordenar(conteo.elaborado),
      combo: ordenar(conteo.combo),
      reventa: ordenar(conteo.reventa),
      insumo: ordenar(conteo.insumo),
    },
    error: null,
  }
}

/**
 * El reporte para lo elegido. Una seleccion vacia trae todo.
 *
 * Solo lo activo: el margen de un producto que no se vende no decide nada, y
 * mezclarlo esconde los que importan.
 */
export async function getReporteDeCostos(seleccion: SeleccionDeCostos): Promise<{
  data: { secciones: SeccionDeCostos[]; resumen: ResumenDeCostos } | null
  error: string | null
}> {
  const denied = await requirePermission('analytics.view')
  if (denied) return { data: null, error: denied.error }

  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const vacia = GRUPOS_DE_COSTO.every((g) => !seleccion[g])
  const sel: SeleccionDeCostos = vacia
    ? { elaborado: '*', combo: '*', reventa: '*', insumo: '*' }
    : seleccion

  const quiereProductos = ES_PRODUCTO.some((g) => sel[g])
  const quiereInsumos = Boolean(sel.insumo)

  const [productos, categorias, insumos] = await Promise.all([
    quiereProductos
      ? supabase
          .from('products')
          .select('id, name, cost, price, product_type, categories(id, name)')
          .eq('is_active', true)
      : Promise.resolve({ data: [], error: null }),
    quiereProductos
      ? supabase.from('categories').select('name, sort_order').order('sort_order')
      : Promise.resolve({ data: [], error: null }),
    quiereInsumos
      ? supabase
          .from('ingredients')
          .select('id, name, unit, cost_per_unit, ingredient_categories(id, name)')
          .eq('is_active', true)
      : Promise.resolve({ data: [], error: null }),
  ])

  const error = productos.error || categorias.error || insumos.error
  if (error) return { data: null, error: friendlyError(error) }

  const ordenDeCategorias = (categorias.data ?? []).map((c: { name: string }) => c.name)

  const secciones: SeccionDeCostos[] = []
  const margenes: number[] = []
  let productosContados = 0
  let productosSinCosto = 0

  for (const grupo of ['elaborado', 'combo', 'reventa'] as const) {
    if (!sel[grupo]) continue

    const filas = (productos.data ?? [])
      .filter((p: { product_type: string }) => p.product_type === grupo)
      .map((p: { id: string; name: string; cost: number | null; price: number; categories: unknown }) => ({
        p,
        cat: relacion(p.categories),
      }))
      .filter(({ cat }) => entra(sel, grupo, cat?.id ?? SIN_CATEGORIA_ID))
      .map(({ p, cat }) => {
        const costo = p.cost !== null && Number(p.cost) > 0 ? Number(p.cost) : null
        const precio = Number(p.price) || 0
        const margen = margenDe(costo, precio)

        productosContados++
        if (costo === null) productosSinCosto++
        if (margen !== null) margenes.push(margen)

        return { id: p.id, nombre: p.name, costo, precio, margen, categoria: cat?.nombre ?? null }
      })

    if (filas.length > 0) {
      secciones.push({ grupo, categorias: agrupar<FilaDeProducto>(filas, ordenDeCategorias) })
    }
  }

  let insumosContados = 0
  let insumosSinCosto = 0

  if (quiereInsumos) {
    const filas = (insumos.data ?? [])
      .map(
        (i: { id: string; name: string; unit: string; cost_per_unit: number | null; ingredient_categories: unknown }) => ({
          i,
          cat: relacion(i.ingredient_categories),
        })
      )
      .filter(({ cat }) => entra(sel, 'insumo', cat?.id ?? SIN_CATEGORIA_ID))
      .map(({ i, cat }) => {
        const costo = i.cost_per_unit !== null && Number(i.cost_per_unit) > 0 ? Number(i.cost_per_unit) : null
        insumosContados++
        if (costo === null) insumosSinCosto++
        return {
          id: i.id,
          nombre: i.name,
          unidad: i.unit,
          costo,
          equivalente: equivalenteDe(costo, i.unit),
          categoria: cat?.nombre ?? null,
        }
      })

    if (filas.length > 0) {
      secciones.push({ grupo: 'insumo', categorias: agrupar<FilaDeInsumo>(filas, []) })
    }
  }

  const margenPromedio =
    margenes.length > 0
      ? Math.round((margenes.reduce((s, m) => s + m, 0) / margenes.length) * 10) / 10
      : null

  return {
    data: {
      secciones,
      resumen: {
        productos: productosContados,
        productosSinCosto,
        margenPromedio,
        insumos: insumosContados,
        insumosSinCosto,
      },
    },
    error: null,
  }
}
