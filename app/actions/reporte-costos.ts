'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { friendlyError } from '@/lib/server/error-messages'
import { requirePermission } from '@/lib/server/profile'
import {
  SIN_CATEGORIA_ID,
  SIN_CATEGORIA_NOMBRE,
  equivalenteDe,
  margenDe,
  type Categoria,
  type FilaDeInsumo,
  type FilaDeProducto,
  type TipoDeProducto,
} from '@/lib/constants/reporte-costos'

/**
 * Los datos del reporte de costos: todo lo activo, sin filtrar.
 *
 * El filtro y el orden no se hacen aca sino en `filtrarProductos` y
 * `filtrarInsumos`, que comparten la pantalla y la hoja impresa. Asi "se
 * imprime lo que se ve" no depende de que dos implementaciones coincidan.
 *
 * Se trae todo de una vez porque es poco --medio centenar de productos y un
 * centenar de insumos-- y porque la tabla filtra al tipear: ir al servidor en
 * cada tecla seria mas lento que tenerlo en memoria.
 *
 * Solo lo activo: el margen de un producto que no se vende no decide nada, y
 * mezclarlo esconde los que importan.
 */

export interface DatosDeCostos {
  productos: FilaDeProducto[]
  insumos: FilaDeInsumo[]
  /** En el orden de la carta (`sort_order`), solo las que tienen algo activo. */
  categoriasDeProductos: Categoria[]
  categoriasDeInsumos: Categoria[]
}

const TIPOS: TipoDeProducto[] = ['elaborado', 'combo', 'reventa']

/** El id y el nombre de una relacion anidada, venga como objeto o como arreglo. */
function relacion(rel: unknown): Categoria {
  const fila = Array.isArray(rel) ? rel[0] : rel
  const r = fila as { id?: unknown; name?: unknown } | null
  if (r && typeof r.id === 'string' && typeof r.name === 'string') {
    return { id: r.id, nombre: r.name }
  }
  return { id: SIN_CATEGORIA_ID, nombre: SIN_CATEGORIA_NOMBRE }
}

/** Las categorias que aparecen en las filas, en el orden dado y "sin" al final. */
function categoriasDe(filas: { categoriaId: string; categoria: string }[], orden: string[]): Categoria[] {
  const vistas = new Map<string, string>()
  for (const f of filas) vistas.set(f.categoriaId, f.categoria)

  return [...vistas.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => {
      if (a.id === SIN_CATEGORIA_ID) return 1
      if (b.id === SIN_CATEGORIA_ID) return -1
      const ia = orden.indexOf(a.id)
      const ib = orden.indexOf(b.id)
      if (ia !== -1 && ib !== -1) return ia - ib
      return a.nombre.localeCompare(b.nombre, 'es')
    })
}

export async function getDatosDeCostos(): Promise<{ data: DatosDeCostos | null; error: string | null }> {
  // El margen es informacion de gestion: mismo permiso que Analytics.
  const denied = await requirePermission('analytics.view')
  if (denied) return { data: null, error: denied.error }

  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const [productos, categorias, insumos] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, cost, price, product_type, categories(id, name)')
      .eq('is_active', true),
    supabase.from('categories').select('id, sort_order').order('sort_order'),
    supabase
      .from('ingredients')
      .select('id, name, unit, cost_per_unit, ingredient_categories(id, name)')
      .eq('is_active', true),
  ])

  const error = productos.error || categorias.error || insumos.error
  if (error) return { data: null, error: friendlyError(error) }

  const filasDeProductos: FilaDeProducto[] = (productos.data ?? [])
    .filter((p: { product_type: string }) => TIPOS.includes(p.product_type as TipoDeProducto))
    .map((p: { id: string; name: string; cost: number | null; price: number; product_type: string; categories: unknown }) => {
      const cat = relacion(p.categories)
      const costo = p.cost !== null && Number(p.cost) > 0 ? Number(p.cost) : null
      const precio = Number(p.price) || 0
      return {
        id: p.id,
        nombre: p.name,
        tipo: p.product_type as TipoDeProducto,
        categoriaId: cat.id,
        categoria: cat.nombre,
        costo,
        precio,
        margen: margenDe(costo, precio),
      }
    })

  const filasDeInsumos: FilaDeInsumo[] = (insumos.data ?? []).map(
    (i: { id: string; name: string; unit: string; cost_per_unit: number | null; ingredient_categories: unknown }) => {
      const cat = relacion(i.ingredient_categories)
      const costo = i.cost_per_unit !== null && Number(i.cost_per_unit) > 0 ? Number(i.cost_per_unit) : null
      return {
        id: i.id,
        nombre: i.name,
        categoriaId: cat.id,
        categoria: cat.nombre,
        unidad: i.unit,
        costo,
        equivalente: equivalenteDe(costo, i.unit),
      }
    }
  )

  const ordenDeLaCarta = (categorias.data ?? []).map((c: { id: string }) => c.id)

  return {
    data: {
      productos: filasDeProductos,
      insumos: filasDeInsumos,
      categoriasDeProductos: categoriasDe(filasDeProductos, ordenDeLaCarta),
      categoriasDeInsumos: categoriasDe(filasDeInsumos, []),
    },
    error: null,
  }
}
