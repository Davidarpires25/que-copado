import type { SupabaseClient } from '@supabase/supabase-js'
import { convertToBaseUnit, getBaseUnit } from '@/lib/server/unit-conversion'

/**
 * Calcula cuántas unidades de un producto elaborado se pueden producir
 * con el stock actual de ingredientes. Replica la lógica de deductElaboradoStock
 * pero en modo lectura. Retorna null si no hay ingredientes trackeados (sin límite).
 *
 * Vive acá y no en `app/actions/orders.ts` porque tiene dos consumidores: la
 * validación de stock del checkout y el endpoint del menú que consume el agente
 * de WhatsApp. Un archivo `'use server'` no es el lugar: todo lo que exporta
 * queda expuesto como server action, y esta función recibe un cliente de
 * Supabase, que no es serializable.
 */
export async function getMaxElaboradoQuantity(
  supabase: SupabaseClient,
  productId: string
): Promise<number | null> {
  const { data: productRecipes } = await supabase
    .from('product_recipes')
    .select(`
      quantity,
      recipes (
        recipe_ingredients (
          quantity,
          unit,
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

  if (!productRecipes?.length) return null

  let maxQty: number | null = null

  for (const pr of productRecipes) {
    const recipeMultiplier = (pr.quantity as number) ?? 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe = pr.recipes as any
    if (!recipe?.recipe_ingredients) continue

    for (const ri of recipe.recipe_ingredients) {
      const ingredient = ri.ingredients
      if (!ingredient?.stock_tracking_enabled) continue
      if (ingredient.current_stock === null) continue

      const effectiveUnit = ri.unit ?? ingredient.unit
      if (getBaseUnit(effectiveUnit) !== getBaseUnit(ingredient.unit)) continue

      // Cantidad necesaria del ingrediente por 1 unidad de producto
      const neededPerUnit = convertToBaseUnit(recipeMultiplier * ri.quantity, effectiveUnit)
      const wastePct = Number(ingredient.waste_percentage) || 0
      const wasteFactor = 1 - wastePct / 100
      const actualNeededPerUnit = wasteFactor > 0 ? neededPerUnit / wasteFactor : neededPerUnit
      if (actualNeededPerUnit <= 0) continue

      const producible = Math.floor(Number(ingredient.current_stock) / actualNeededPerUnit)
      if (maxQty === null || producible < maxQty) maxQty = producible
    }
  }

  return maxQty
}

/**
 * Cuantas unidades de un combo se pueden vender con lo que hay.
 *
 * Un combo tiene dos partes y las dos limitan: sus recetas propias —el envase,
 * la preparacion que es del combo y de nadie mas— y los productos que entrega.
 * El tope es el menor de todos.
 *
 * La cantidad divide: si el combo lleva 2 gaseosas y hay 5 en la heladera,
 * salen 2 combos, no 5.
 *
 * Un componente sin stock trackeado no limita —es lo mismo que hace la rama de
 * elaborados con un ingrediente sin seguimiento—. Devuelve `null` cuando nada
 * limita, que es como el resto del codigo dice "sin tope".
 *
 * Un componente que fuera otro combo no limita: la tabla dice que no puede
 * pasar y el formulario no lo ofrece, asi que en vez de bajar un nivel mas se
 * lo ignora.
 */
export async function getMaxComboQuantity(
  supabase: SupabaseClient,
  productId: string
): Promise<number | null> {
  // Lo propio del combo son recetas como las de un elaborado, asi que se
  // calculan con la misma cuenta.
  let tope = await getMaxElaboradoQuantity(supabase, productId)

  const { data: componentes } = await supabase
    .from('product_components')
    .select('quantity, products:component_id (id, product_type, current_stock, stock_tracking_enabled)')
    .eq('parent_id', productId)

  for (const componente of componentes ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const producto = componente.products as any
    if (!producto) continue

    const porCombo = Number(componente.quantity) || 1

    let topeDelComponente: number | null = null
    if (producto.product_type === 'elaborado') {
      topeDelComponente = await getMaxElaboradoQuantity(supabase, producto.id)
    } else if (producto.stock_tracking_enabled && producto.current_stock !== null) {
      topeDelComponente = Number(producto.current_stock)
    }

    if (topeDelComponente === null) continue

    const producible = Math.floor(topeDelComponente / porCombo)
    if (tope === null || producible < tope) tope = producible
  }

  return tope
}

/**
 * El tope de cada producto cuyo tope no es una columna: elaborados y combos.
 *
 * Existe porque la cuenta estaba a punto de escribirse por cuarta vez. El
 * checkout, la creacion del pedido y el menu del agente hacian los tres el
 * mismo movimiento —filtrar los elaborados, pedir los topes en paralelo, armar
 * el Map— y los tres preguntaban por el literal `'elaborado'`. Cuando aparecio
 * el combo, los tres lo dejaron pasar sin tope: el agente ofrecia un combo sin
 * techo y el checkout aceptaba diez con stock para tres.
 *
 * Devuelve un Map con el tope por producto. Lo que no esta en el Map no tiene
 * tope calculado, igual que un `null` adentro.
 */
export async function getMaxQuantities(
  supabase: SupabaseClient,
  productos: { id: string; product_type: string | null }[]
): Promise<Map<string, number | null>> {
  const tipoPorId = new Map(productos.map((p) => [p.id, p.product_type]))

  // Set y no array: el mismo producto puede venir dos veces en el carrito
  // —dos veces la misma hamburguesa, con observaciones distintas— y no tiene
  // sentido preguntar dos veces por el mismo.
  const ids = [...new Set(
    productos
      .filter((p) => p.product_type === 'elaborado' || p.product_type === 'combo')
      .map((p) => p.id)
  )]

  const topes = await Promise.all(
    ids.map((id) =>
      tipoPorId.get(id) === 'combo'
        ? getMaxComboQuantity(supabase, id)
        : getMaxElaboradoQuantity(supabase, id)
    )
  )

  return new Map(ids.map((id, i) => [id, topes[i]]))
}
