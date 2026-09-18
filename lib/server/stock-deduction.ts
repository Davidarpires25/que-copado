import type { SupabaseClient } from '@supabase/supabase-js'
import { convertFromBaseUnit } from '@/lib/server/unit-conversion'
import {
  fuenteEnMemoria,
  recorrerInsumos,
  acumularRequerimiento,
  cuantasSalen,
  type FuenteDeInsumos,
  type InsumoDelRecorrido,
  type ComponenteDeSubReceta,
  type Requerimientos,
} from '@/lib/server/recipe-walk'
import { revalidateProducts } from '@/lib/server/revalidate'

/**
 * Minimal item shape needed for stock deduction.
 * Works with both OrderItem (POS counter sales) and order_items rows (table orders).
 */
interface StockDeductionItem {
  product_id?: string | null
  /** OrderItem uses `id` as the product id */
  id?: string
  quantity: number
}

/**
 * Resolves the product_id from different item shapes.
 * - order_items rows use `product_id`
 * - OrderItem (JSON) uses `id` as the product identifier
 */
function resolveProductId(item: StockDeductionItem): string | null {
  return item.product_id ?? item.id ?? null
}

/**
 * Movimiento pendiente de aplicar.
 *
 * El recorrido del arbol de recetas ya no escribe a medida que baja: acumula
 * estos movimientos y al final los aplica de una, en una transaccion
 * (`aplicar_movimientos_de_stock`, migracion 033). Eso es lo que elimina la
 * carrera entre ventas simultaneas y hace que el stock y su movimiento no
 * puedan quedar desfasados.
 */
export interface MovimientoPendiente {
  tipo: 'ingredient' | 'product'
  id: string
  /** Positiva: es cuanto se RESTA del stock. */
  cantidad: number
}

/** Acumula sumando, para que el mismo ingrediente en dos recetas sea un solo movimiento. */
function acumular(destino: Map<string, MovimientoPendiente>, mov: MovimientoPendiente): void {
  const clave = `${mov.tipo}:${mov.id}`
  const previo = destino.get(clave)
  if (previo) previo.cantidad += mov.cantidad
  else destino.set(clave, { ...mov })
}

// ---------------------------------------------------------------------------
// deductStockForOrder
// ---------------------------------------------------------------------------

/**
 * Best-effort stock deduction after a sale is confirmed.
 *
 * - For `reventa` products with stock_tracking_enabled: decrements products.current_stock
 * - For `elaborado` products: decrements each ingredient via recipe_ingredients (recursive through sub-recipes)
 * - Negative stock is allowed (common in gastronomy)
 * - Errors are logged but NEVER block the sale
 *
 * @param supabase - Authenticated Supabase client
 * @param items    - Order items (either OrderItem[] or order_items rows)
 * @param orderId  - The order UUID for traceability
 * @param userId   - The authenticated user who made the sale
 */
/** Un item que quedo con stock por debajo de cero al descontar una venta. */
export interface ItemEnRojo {
  tipo: 'ingredient' | 'product'
  id: string
  /** Nombre para mostrar. Se resuelve aca porque la base solo devuelve el id. */
  nombre: string
  stock: number
}

export async function deductStockForOrder(
  supabase: SupabaseClient,
  items: StockDeductionItem[],
  orderId: string,
  _userId: string | null
): Promise<ItemEnRojo[]> {
  const pendientes = new Map<string, MovimientoPendiente>()
  let enRojo: ItemEnRojo[] = []

  for (const item of items) {
    if (item.quantity <= 0) continue

    const productId = resolveProductId(item)
    if (!productId) continue

    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, product_type, current_stock, stock_tracking_enabled')
        .eq('id', productId)
        .single()

      if (productError || !product) continue

      await acumularProducto(supabase, product, item.quantity, pendientes)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Stock] Error calculando stock del producto ${productId}:`, err)
      }
    }
  }

  if (pendientes.size > 0) {
    const { data, error } = await supabase.rpc('aplicar_movimientos_de_stock', {
      p_order_id: orderId,
      p_movimientos: Array.from(pendientes.values()),
    })

    if (error) {
      // Ya no hay estado a medias que compensar: la transaccion no se aplico.
      console.error(`[Stock] No se pudo aplicar el descuento del pedido ${orderId}:`, error.message)
    } else {
      const resultado = data as { duplicado?: boolean; negativos?: unknown[] } | null
      if (resultado?.duplicado) {
        console.error(`[Stock] El pedido ${orderId} ya habia descontado stock; no se duplico`)
      }
      // Vender en rojo no se bloquea —un local vende igual cuando lo que esta
      // mal es el conteo y no la mercaderia—, pero el aviso tiene que llegar a
      // quien cobra. Hasta acá moria en este console.error: el sistema sabia que
      // se vendio algo que no habia y no se lo decia a nadie.
      if (resultado?.negativos?.length) {
        console.error(
          `[Stock] El pedido ${orderId} dejo items en negativo:`,
          JSON.stringify(resultado.negativos)
        )
        enRojo = await _resolverNombres(supabase, resultado.negativos as CrudoEnRojo[])
      }
    }
  }

  // El auto-agotado de los productos de reventa lo hacia deductReventaStock
  // justo despues de escribir. Ahora que la escritura vive en la RPC, se
  // re-sincroniza aca con el stock ya aplicado.
  for (const mov of pendientes.values()) {
    if (mov.tipo !== 'product') continue
    try {
      const { data: prod } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', mov.id)
        .single()
      if (prod) await syncReventaProduct(supabase, mov.id, Number(prod.current_stock))
    } catch { /* nunca bloquea la venta */ }
  }

  await syncElaboradoAvailability(supabase).catch((err) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Stock] Error syncing elaborado availability:', err)
    }
  })

  return enRojo
}

/** Lo que devuelve la base: el id, sin nombre. */
interface CrudoEnRojo { tipo: string; id: string; stock: number }

/**
 * Le pone nombre a los items que quedaron en rojo.
 *
 * La base devuelve ids porque es lo que tiene a mano; quien cobra necesita leer
 * "Medallon de carne", no un uuid. Son dos consultas como mucho y corren solo
 * cuando efectivamente hubo un negativo.
 */
async function _resolverNombres(supabase: SupabaseClient, crudos: CrudoEnRojo[]): Promise<ItemEnRojo[]> {
  const idsIngredientes = crudos.filter((c) => c.tipo === 'ingredient').map((c) => c.id)
  const idsProductos = crudos.filter((c) => c.tipo === 'product').map((c) => c.id)

  const [ingredientes, productos] = await Promise.all([
    idsIngredientes.length
      ? supabase.from('ingredients').select('id, name').in('id', idsIngredientes)
      : Promise.resolve({ data: [] }),
    idsProductos.length
      ? supabase.from('products').select('id, name').in('id', idsProductos)
      : Promise.resolve({ data: [] }),
  ])

  const nombres = new Map<string, string>()
  for (const i of ingredientes.data ?? []) nombres.set(i.id, i.name)
  for (const p of productos.data ?? []) nombres.set(p.id, p.name)

  return crudos.map((c) => ({
    tipo: c.tipo === 'ingredient' ? 'ingredient' as const : 'product' as const,
    id: c.id,
    nombre: nombres.get(c.id) ?? 'Ítem sin nombre',
    stock: Number(c.stock),
  }))
}

// ---------------------------------------------------------------------------
// restoreStockForOrder
// ---------------------------------------------------------------------------

/**
 * Reverses all 'sale' stock movements for a given order.
 * Used when cancelling a POS order that was already paid.
 *
 * For each original 'sale' movement:
 * - Restores the stock on the ingredient or product
 * - Creates a 'sale_reversal' movement for audit trail
 */
export async function restoreStockForOrder(
  supabase: SupabaseClient,
  orderId: string,
  _userId: string | null
): Promise<void> {
  const { data, error } = await supabase.rpc('revertir_movimientos_de_stock', {
    p_order_id: orderId,
  })

  if (error) {
    console.error(`[Stock] No se pudo revertir el stock del pedido ${orderId}:`, error.message)
    return
  }

  const resultado = data as { duplicado?: boolean; revertidos?: number } | null
  if (resultado?.duplicado && process.env.NODE_ENV === 'development') {
    console.error(`[Stock] El pedido ${orderId} ya estaba revertido; no se duplico`)
  }

  // Sin movimientos revertidos no cambio ningun stock, y sin stock que cambie no
  // hay nada que resincronizar. El barrido recorre todos los elaborados activos
  // con una consulta anidada por producto, en serie: quince productos son ~2,4
  // segundos. Cancelar un pendiente —que todavia no descontó nada, porque eso
  // pasa al cobrar— los pagaba enteros para no tocar una sola fila.
  if (!resultado?.revertidos) return

  await syncElaboradoAvailability(supabase).catch(() => { /* nunca bloquea la cancelacion */ })
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Deducts stock for a 'reventa' product (direct stock on products table).
 */

/**
 * Los insumos, leidos de la base de a uno.
 *
 * Es la fuente que usa el recorrido compartido cuando no hay nada precargado:
 * el descuento de una venta y el calculo de un producto suelto. La pantalla de
 * stock usa otra, que trabaja sobre Maps ya traidos, para no hacer una consulta
 * por insumo.
 */
function insumosDesdeLaBase(supabase: SupabaseClient): FuenteDeInsumos {
  return {
    async insumo(id) {
      const { data } = await supabase
        .from('ingredients')
        .select('id, unit, waste_percentage, current_stock, stock_tracking_enabled, yield_quantity')
        .eq('id', id)
        .single()
      return data as InsumoDelRecorrido | null
    },
    async subRecetas(id) {
      const { data } = await supabase
        .from('ingredient_sub_recipes')
        .select('child_ingredient_id, quantity, unit')
        .eq('parent_ingredient_id', id)
      return (data ?? []) as ComponenteDeSubReceta[]
    },
  }
}

async function collectIngredientCascade(
  supabase: SupabaseClient,
  ingredientId: string,
  quantityInRecipeUnit: number,
  recipeUnit: string,
  pendientes: Map<string, MovimientoPendiente>,
  visited: Set<string>
): Promise<void> {
  await recorrerInsumos(
    insumosDesdeLaBase(supabase),
    ingredientId,
    quantityInRecipeUnit,
    recipeUnit,
    (insumo, cantidadBase) => {
      if (!insumo.stock_tracking_enabled) return
      // De vuelta a la unidad en que esta guardado el stock. El recorrido
      // devuelve unidad base para poder comparar entre recetas, pero lo que se
      // descuenta se resta a `ingredients.current_stock`, que esta en la unidad
      // del insumo. Sin esta vuelta, una receta de 30 g descontaba 0,03 de un
      // stock en gramos: mil veces menos de lo que se usa.
      acumular(pendientes, {
        tipo: 'ingredient',
        id: insumo.id,
        cantidad: convertFromBaseUnit(cantidadBase, insumo.unit),
      })
    },
    visited
  )
}



/** Una linea de `product_recipes` con su receta y los insumos de esa receta. */
export interface RecetaDeProducto {
  product_id: string
  quantity: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recipes: { recipe_ingredients: Array<{ ingredient_id: string; quantity: number; unit: string }> } | any
}

/** Todo lo que hace falta para calcular varios productos sin volver a la base. */
export interface RecetasEnMemoria {
  porProducto: Map<string, RecetaDeProducto[]>
  fuente: FuenteDeInsumos
}

/**
 * Trae de una vez todo lo que hace falta para calcular varios productos.
 *
 * Tres consultas en paralelo en vez de una cascada. El barrido de
 * disponibilidad corre despues de **cada venta** y hacia una consulta por
 * receta mas dos por insumo, todas encadenadas: con 14 elaborados y 123
 * insumos son 260 viajes en serie, esperados antes de contestarle a quien
 * cobra.
 */
export async function cargarRecetasEnMemoria(
  supabase: SupabaseClient,
  productIds: string[]
): Promise<RecetasEnMemoria | null> {
  if (productIds.length === 0) return null

  const [recetas, subRecetas, insumos] = await Promise.all([
    supabase
      .from('product_recipes')
      .select('product_id, quantity, recipes ( recipe_ingredients ( ingredient_id, quantity, unit ) )')
      .in('product_id', productIds),
    supabase
      .from('ingredient_sub_recipes')
      .select('parent_ingredient_id, child_ingredient_id, quantity, unit'),
    supabase
      .from('ingredients')
      .select('id, unit, waste_percentage, current_stock, stock_tracking_enabled, yield_quantity'),
  ])

  if (recetas.error || subRecetas.error || insumos.error) return null

  const porInsumo = new Map<string, InsumoDelRecorrido>(
    (insumos.data ?? []).map((i) => [i.id, i as InsumoDelRecorrido])
  )

  const porPadre = new Map<string, ComponenteDeSubReceta[]>()
  for (const sub of subRecetas.data ?? []) {
    const lista = porPadre.get(sub.parent_ingredient_id) ?? []
    lista.push(sub as ComponenteDeSubReceta)
    porPadre.set(sub.parent_ingredient_id, lista)
  }

  const porProducto = new Map<string, RecetaDeProducto[]>()
  for (const pr of (recetas.data ?? []) as RecetaDeProducto[]) {
    const lista = porProducto.get(pr.product_id) ?? []
    lista.push(pr)
    porProducto.set(pr.product_id, lista)
  }

  return { porProducto, fuente: fuenteEnMemoria(porInsumo, porPadre) }
}

/** Cuantas unidades salen de un producto, con todo ya cargado. */
export async function stockTeoricoEnMemoria(
  productId: string,
  cargado: RecetasEnMemoria
): Promise<number | null> {
  const recetas = cargado.porProducto.get(productId)
  if (!recetas || recetas.length === 0) return null

  const requerimientos: Requerimientos = new Map()

  for (const pr of recetas) {
    const multiplicador = pr.quantity ?? 1
    const receta = pr.recipes
    if (!receta?.recipe_ingredients) continue

    for (const ri of receta.recipe_ingredients) {
      await recorrerInsumos(
        cargado.fuente,
        ri.ingredient_id,
        multiplicador * ri.quantity,
        ri.unit,
        (insumo, cantidadBase) => acumularRequerimiento(requerimientos, insumo, cantidadBase),
        new Set<string>()
      )
    }
  }

  return cuantasSalen(requerimientos)
}

/**
 * Que un producto quede visible o no, en un solo lugar.
 *
 * Tres reglas, y la tercera es la que faltaba:
 *
 * 1. Sin stock y nadie dijo lo contrario: se apaga, marcando que lo apago el
 *    sistema —`auto_disabled`— para poder volver a encenderlo solo.
 * 2. Con stock y apagado por el sistema: se enciende.
 * 3. **Con stock y forzado a mano: se suelta el forzado.** El motivo para
 *    forzarlo ya no existe, asi que el producto vuelve a seguir al stock sin
 *    que nadie tenga que acordarse de apagar la excepcion.
 *
 * Y lo que cambio: la rama que apaga ahora mira `forzado_disponible`. Antes no
 * miraba nada, asi que quien atiende prendia una pizza a mano y el barrido se la
 * volvia a apagar al siguiente movimiento de stock. La receta decia un pote de
 * salsa por pizza cuando un pote hace tres: el dato mentia, la persona lo sabia,
 * y el sistema le ganaba igual.
 *
 * Devuelve si escribio algo, para que quien llama sepa si hay que revalidar.
 */
async function _aplicarDisponibilidad(
  supabase: SupabaseClient,
  producto: {
    id: string
    is_out_of_stock: boolean
    auto_disabled: boolean
    forzado_disponible?: boolean | null
  },
  hayStock: boolean
): Promise<boolean> {
  const forzado = producto.forzado_disponible === true

  if (!hayStock && !producto.is_out_of_stock && !forzado) {
    await supabase
      .from('products')
      .update({ is_out_of_stock: true, auto_disabled: true })
      .eq('id', producto.id)
    return true
  }

  if (hayStock && producto.is_out_of_stock && producto.auto_disabled) {
    await supabase
      .from('products')
      .update({ is_out_of_stock: false, auto_disabled: false, forzado_disponible: false })
      .eq('id', producto.id)
    return true
  }

  if (hayStock && forzado) {
    await supabase
      .from('products')
      .update({ forzado_disponible: false })
      .eq('id', producto.id)
    return true
  }

  return false
}

export async function syncReventaProduct(
  supabase: SupabaseClient,
  productId: string,
  newStock: number
): Promise<void> {
  const { data: product } = await supabase
    .from('products')
    .select('id, is_out_of_stock, auto_disabled, forzado_disponible')
    .eq('id', productId)
    .single()

  if (!product) return

  if (await _aplicarDisponibilidad(supabase, product, newStock > 0)) {
    // Defer revalidation to avoid calling revalidatePath during render
    setTimeout(() => {
      try {
        revalidateProducts()
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('[Stock] defer revalidateProducts error:', err)
      }
    }, 0)
  }
}

/**
 * Auto-disables elaborated products when theoretical stock reaches 0.
 * Restores them when stock recovers (ONLY if auto_disabled=true).
 * Best-effort: errors never propagate.
 */
/**
 * Apaga o enciende los combos segun lo que incluyen.
 *
 * Un combo no tiene stock propio: su disponibilidad sale de sus dos partes. De
 * los componentes, que son productos del catalogo con su propia disponibilidad.
 * Y de sus recetas propias —el envase, la preparacion que es del combo y de
 * nadie mas—, que son recetas como las de un elaborado y se miran igual. Si se
 * acabaron las cajas, el combo no sale aunque la hamburguesa y la bebida esten.
 *
 * Un combo sin componentes ni recetas tampoco se puede vender —no hay nada que
 * entregar—, asi que tambien queda apagado.
 *
 * `auto_disabled` distingue lo que apago el sistema de lo que apago una persona:
 * si el local marco el combo como agotado a mano, esto no se lo enciende.
 *
 * Devuelve si cambio algo, para que el barrido general sepa si hay que revalidar.
 */
export async function syncCombosAvailability(supabase: SupabaseClient): Promise<boolean> {
  const { data: combos } = await supabase
    .from('products')
    .select('id, is_out_of_stock, auto_disabled, forzado_disponible, product_components!parent_id (component_id, products:component_id (is_out_of_stock, is_active))')
    .eq('product_type', 'combo')
    .eq('is_active', true)

  if (!combos || combos.length === 0) return false

  let cambio = false

  for (const combo of combos) {
    const componentes = (combo.product_components ?? []) as unknown as {
      products: { is_out_of_stock: boolean; is_active: boolean } | null
    }[]

    // Lo propio del combo: sus recetas. `null` es "no tiene recetas con stock
    // trackeado", que no limita; un numero en cero o menos si.
    const stockPropio = await _calcTheoreticalStock(supabase, combo.id).catch(() => null)
    const sinRecetasPropias = stockPropio === null

    const sinNada = componentes.length === 0 && sinRecetasPropias
    const algunoNoDisponible = componentes.some(
      (c) => !c.products || !c.products.is_active || c.products.is_out_of_stock
    )
    const faltaLoPropio = stockPropio !== null && stockPropio <= 0
    const deberiaEstarAgotado = sinNada || algunoNoDisponible || faltaLoPropio

    if (await _aplicarDisponibilidad(supabase, combo, !deberiaEstarAgotado)) {
      cambio = true
    }
  }

  return cambio
}

/**
 * El barrido de disponibilidad: que productos quedan marcados como agotados.
 *
 * Es la unica copia. Corre despues de cada movimiento de stock —vender,
 * cancelar, comprar, ajustar— y desde el disparo manual.
 *
 * Estuvo escrito dos veces, aca y en `app/actions/stock.ts`, y eso costo un bug:
 * al agregar los combos se extendio una sola, asi que un combo se apagaba al
 * vender y no al comprar. El orden importa —los combos van despues de los
 * elaborados, para que un combo vea en la misma pasada que su hamburguesa acaba
 * de agotarse— y con dos copias ese detalle tambien divergio.
 */
export async function syncAvailability(supabase: SupabaseClient): Promise<void> {
  return syncElaboradoAvailability(supabase)
}

async function syncElaboradoAvailability(supabase: SupabaseClient): Promise<void> {
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, is_out_of_stock, auto_disabled, forzado_disponible')
    .eq('product_type', 'elaborado')
    .eq('is_active', true)

  if (prodError || !products || products.length === 0) return

  let anyChanged = false

  // Todo de una: el barrido corre despues de cada venta y antes se hacia una
  // consulta por receta mas dos por insumo, encadenadas. Con 14 elaborados y
  // 123 insumos eran 260 viajes en serie, esperados antes de contestarle a
  // quien esta cobrando. Ahora son tres.
  const cargado = await cargarRecetasEnMemoria(supabase, products.map((p) => p.id))
  if (!cargado) return

  for (const product of products) {
    try {
      const theoreticalStock = await stockTeoricoEnMemoria(product.id, cargado)
      if (theoreticalStock === null) continue

      // Mayor a cero, no distinto de cero: preguntar por el cero exacto
      // funciona mientras nada lo cruce de un salto, y un pedido de 40 unidades
      // con 1 en stock lo cruza. Con el stock en -39 el producto no entraba en
      // esta rama y se seguia ofreciendo.
      if (await _aplicarDisponibilidad(supabase, product, theoreticalStock > 0)) {
        anyChanged = true
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Stock] Error syncing availability for product ${product.id}:`, err)
      }
    }
  }

  // Los combos siguen la misma regla que los elaborados, pero mirando
  // componentes en vez de recetas: si algo de lo que incluye no esta
  // disponible, el combo tampoco. Un combo que se puede pedir sin la bebida
  // termina en una discusion en el mostrador.
  //
  // Va despues del barrido de elaborados a proposito: si una hamburguesa se
  // acaba de marcar agotada, el combo que la lleva tiene que verlo en esta misma
  // pasada y no en la siguiente.
  if (await syncCombosAvailability(supabase)) anyChanged = true

  if (anyChanged) {
    // Defer revalidation to avoid calling revalidatePath during render
    setTimeout(() => {
      try {
        revalidateProducts()
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('[Stock] defer revalidateProducts error:', err)
      }
    }, 0)
  }
}


/**
 * Computes the maximum number of units of an elaborado product that can be
 * produced given the current ingredient stock. Returns null if no ingredient
 * tracking is enabled (meaning there's no practical limit).
 *
 * Exported so the public page can display urgency indicators.
 */
export async function calcElaboradoStock(supabase: SupabaseClient, productId: string): Promise<number | null> {
  return _calcTheoreticalStock(supabase, productId)
}

/**
 * Cuantas unidades de un elaborado se pueden armar con el stock que hay.
 *
 * Recorre sus recetas, aplica mermas y baja por las sub-recetas. Tambien estaba
 * duplicada —`_calculateTheoreticalStock` en `app/actions/stock.ts`, con la
 * misma cuenta escrita distinto y unos logs de medicion que corrian en
 * produccion—. Esta es la unica.
 */
export async function calcularStockTeorico(supabase: SupabaseClient, productId: string): Promise<number | null> {
  return _calcTheoreticalStock(supabase, productId)
}

/**
 * Lo que un producto necesita de cada insumo, bajando por las sub-recetas.
 *
 * Se separo del calculo para que el mismo recorrido sirva a dos preguntas:
 * cuantas unidades salen, y --cuando no sale ninguna-- cual es el insumo que lo
 * impide. Sin eso el sistema escondia un producto sin poder decir por que, y
 * quien atiende se enteraba por la calle: tres pizzas desaparecieron y el aviso
 * decia "Salsa de tomate: 0" sin conectar una cosa con la otra.
 */
async function _requerimientos(
  supabase: SupabaseClient,
  productId: string
): Promise<Requerimientos | null> {
  const { data: productRecipes, error } = await supabase
    .from('product_recipes')
    .select(`
      quantity,
      recipes (
        id,
        recipe_ingredients (
          quantity,
          unit,
          ingredient_id,
          ingredients (
            id,
            unit,
            waste_percentage,
            current_stock,
            stock_tracking_enabled
          )
        )
      )
    `)
    .eq('product_id', productId)

  if (error || !productRecipes || productRecipes.length === 0) return null

  const requirements: Requerimientos = new Map()

  for (const pr of productRecipes) {
    const recipeMultiplier = pr.quantity ?? 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe = pr.recipes as any
    if (!recipe?.recipe_ingredients) continue

    for (const ri of recipe.recipe_ingredients) {
      const ingredient = ri.ingredients
      if (!ingredient) continue

      const effectiveUnit = ri.unit ?? ingredient.unit
      await recorrerInsumos(
        insumosDesdeLaBase(supabase),
        ingredient.id,
        recipeMultiplier * ri.quantity,
        effectiveUnit,
        (insumo, cantidadBase) => acumularRequerimiento(requirements, insumo, cantidadBase),
        new Set<string>()
      )
    }
  }

  return requirements
}

async function _calcTheoreticalStock(supabase: SupabaseClient, productId: string): Promise<number | null> {
  const requirements = await _requerimientos(supabase, productId)
  if (!requirements) return null

  return cuantasSalen(requirements)
}

/**
 * Que necesita este producto de cada insumo, con lo que hay.
 *
 * Es el mismo recorrido que usa el calculo, devuelto en crudo para poder
 * mostrarlo. Las cantidades salen en unidad base --kg, litro, unidad-- porque
 * asi es como se comparan: la receta puede pedir gramos y el insumo estar
 * cargado en kilos.
 */
export async function detalleDeInsumos(
  supabase: SupabaseClient,
  productId: string
): Promise<{ ingredientId: string; necesita: number; hay: number; sigue: boolean }[] | null> {
  const requirements = await _requerimientos(supabase, productId)
  if (!requirements) return null

  return [...requirements.entries()].map(([ingredientId, req]) => ({
    ingredientId,
    necesita: req.requiredQty,
    hay: req.currentStock,
    sigue: req.trackingEnabled,
  }))
}

/**
 * Que insumos impiden hacer este producto.
 *
 * Devuelve los ids de los que no alcanzan ni para una unidad. Es lo que hay que
 * comprar para que el producto vuelva a ofrecerse, y es lo que faltaba decir
 * cuando el sistema lo escondia.
 *
 * Un combo tambien puede estar frenado por un componente; eso lo resuelve quien
 * llama, que ya tiene los componentes a mano.
 */
export async function insumosQueFaltan(
  supabase: SupabaseClient,
  productId: string
): Promise<string[]> {
  const requirements = await _requerimientos(supabase, productId)
  if (!requirements) return []

  const faltan: string[] = []
  for (const [ingredientId, req] of requirements) {
    if (!req.trackingEnabled || req.requiredQty <= 0) continue
    if (Math.floor(req.currentStock / req.requiredQty) <= 0) faltan.push(ingredientId)
  }
  return faltan
}


/** Lo minimo que hace falta saber de un producto para descontarlo. */
interface ProductoParaDescontar {
  id: string
  product_type: string | null
  stock_tracking_enabled?: boolean | null
}

/**
 * Acumula lo que descuenta un producto, sea del tipo que sea.
 *
 * Un combo se expande a sus componentes y cada uno vuelve a entrar por acá: la
 * bebida descuenta como reventa y la hamburguesa camina su receta. Eso es lo que
 * hace que la coca de un combo y la coca vendida sola salgan del mismo stock, en
 * vez de los dos inventarios paralelos que habia antes.
 *
 * La expansion ocurre acá y no al vender: el pedido guarda el combo como lo que
 * es —una linea con su precio— y recien al descontar se resuelve en partes.
 */
async function acumularProducto(
  supabase: SupabaseClient,
  product: ProductoParaDescontar,
  cantidad: number,
  pendientes: Map<string, MovimientoPendiente>,
  profundidad = 0
): Promise<void> {
  if (product.product_type === 'reventa') {
    if (product.stock_tracking_enabled) {
      acumular(pendientes, { tipo: 'product', id: product.id, cantidad })
    }
    return
  }

  if (product.product_type === 'elaborado') {
    await collectElaboradoStock(supabase, product.id, cantidad, pendientes)
    return
  }

  if (product.product_type === 'combo') {
    // Un combo no contiene combos —lo impide la configuracion— pero el limite
    // esta igual: un ciclo en la base no puede colgar un cobro.
    if (profundidad > 2) return

    // Un combo descuenta DOS cosas, no una.
    //
    // Sus recetas propias: el envase —caja, palillos, vasos— y la preparacion
    // que solo existe dentro del combo, como el pan especifico de la promo. Eso
    // no pertenece a ningun componente y no es un producto del catalogo.
    await collectElaboradoStock(supabase, product.id, cantidad, pendientes)

    // Y sus componentes, que son productos terminados y descuentan del mismo
    // stock que si se vendieran sueltos. Ahi va la bebida.

    const { data: componentes, error } = await supabase
      .from('product_components')
      .select('quantity, products:component_id (id, product_type, stock_tracking_enabled)')
      .eq('parent_id', product.id)

    if (error || !componentes) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Stock] No se pudieron leer los componentes del combo ${product.id}:`, error?.message)
      }
      return
    }

    for (const componente of componentes) {
      const hijo = componente.products as unknown as ProductoParaDescontar | null
      if (!hijo) continue
      // La cantidad se multiplica: tres combos con dos bebidas cada uno son seis.
      await acumularProducto(supabase, hijo, cantidad * Number(componente.quantity ?? 1), pendientes, profundidad + 1)
    }
  }
}

/**
 * Deducts stock for an 'elaborado' product by walking its recipes and
 * recursively decrementing each ingredient (including sub-recipe cascades).
 *
 * Chain: product -> product_recipes -> recipes -> recipe_ingredients -> ingredients -> sub-recipes
 */
async function collectElaboradoStock(
  supabase: SupabaseClient,
  productId: string,
  orderQuantity: number,
  pendientes: Map<string, MovimientoPendiente>
): Promise<void> {
  // Fetch all recipe ingredients for this product in one query
  const { data: productRecipes, error: prError } = await supabase
    .from('product_recipes')
    .select(`
      quantity,
      recipes (
        id,
        recipe_ingredients (
          quantity,
          unit,
          ingredient_id,
          ingredients (
            id,
            unit,
            waste_percentage,
            current_stock,
            stock_tracking_enabled
          )
        )
      )
    `)
    .eq('product_id', productId)

  if (prError || !productRecipes) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Stock] Failed to fetch recipes for product ${productId}:`, prError?.message)
    }
    return
  }

  // Walk the recipe tree and deduct ingredients
  for (const pr of productRecipes) {
    const recipeMultiplier = pr.quantity ?? 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe = pr.recipes as any
    if (!recipe?.recipe_ingredients) continue

    for (const ri of recipe.recipe_ingredients) {
      const ingredient = ri.ingredients
      if (!ingredient) continue

      // Total quantity = order qty * product_recipes.quantity * recipe_ingredients.quantity
      const totalQty = orderQuantity * recipeMultiplier * ri.quantity
      // Effective unit: use recipe_ingredient.unit if specified, else ingredient's own unit
      const effectiveUnit = ri.unit ?? ingredient.unit

      await collectIngredientCascade(
        supabase,
        ingredient.id,
        totalQty,
        effectiveUnit,
        pendientes,
        new Set<string>()
      )
    }
  }
}
