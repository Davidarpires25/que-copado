import type { SupabaseClient } from '@supabase/supabase-js'
import { calcularStockTeorico } from '@/lib/server/stock-deduction'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { devError } from '@/lib/server/logger'

/**
 * El cliente con el que se leen recetas e insumos.
 *
 * Toda esta cuenta corria con la clave `anon` —`createAdminClient()` la usa,
 * pese al nombre— e `ingredients` solo tiene policy de lectura para
 * `authenticated`. PostgREST devolvia el ingrediente en `null`, la cuenta
 * salteaba cada uno y terminaba en "sin tope", siempre. El sistema sabia
 * cuantas hamburguesas podia hacer y aceptaba pedidos de cincuenta.
 *
 * El cliente elevado se pide aca adentro y no sale de este archivo. Lo que hay
 * alrededor es lectura de tres tablas y un numero de vuelta: no escribe nada y
 * no le presta el cliente a nadie. La alternativa —una funcion `security
 * definer`— obligaba a escribir la cuenta por segunda vez en SQL, con sus
 * conversiones de unidad y sus mermas, y este proyecto ya pago dos veces el
 * precio de tener la misma cuenta escrita dos veces.
 *
 * Sin la clave configurada usa el que le pasaron, que es lo que hacia hasta
 * ahora: se degrada a no aplicar el tope, no a cortar la venta. Un pedido
 * rechazado por una variable de entorno mal puesta es peor que uno que entra
 * sin techo.
 */
function clienteQueLeeInsumos(respaldo: SupabaseClient): SupabaseClient {
  try {
    return createServiceRoleClient()
  } catch (err) {
    devError('[stock] sin service role el tope de produccion no se aplica', err)
    return respaldo
  }
}

/**
 * Cuantas unidades de un elaborado se pueden armar con el stock que hay.
 *
 * La cuenta vive en `stock-deduction.ts`, que es donde tambien se descuenta:
 * preguntar "cuantas salen" y "descontar una" tienen que mirar exactamente lo
 * mismo. Aca estaba escrita de nuevo, con su propia consulta, y las dos copias
 * ya habian divergido: esta no bajaba por las sub-recetas. Un producto con un
 * insumo compuesto daba un numero en el checkout y otro en la pantalla de stock.
 *
 * Lo unico propio de esta capa es con que permisos corre la lectura.
 *
 * Vive aca y no en `app/actions/orders.ts` porque tiene dos consumidores: la
 * validacion de stock del checkout y el endpoint del menu que consume el agente
 * de WhatsApp. Un archivo `'use server'` no es el lugar: todo lo que exporta
 * queda expuesto como server action, y esta funcion recibe un cliente de
 * Supabase, que no es serializable.
 */
export async function getMaxElaboradoQuantity(
  supabase: SupabaseClient,
  productId: string
): Promise<number | null> {
  return calcularStockTeorico(clienteQueLeeInsumos(supabase), productId)
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

  const { data: componentes } = await clienteQueLeeInsumos(supabase)
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
 * Si el local pidio que el tope se aplique.
 *
 * Apagado por defecto, y no por prudencia abstracta: medido contra los datos
 * reales, 13 de 38 productos quedaban con techo de 8 o menos y cinco con techo
 * de 1 --tres pizzas limitadas por "Salsa de tomate", que decia tener una
 * unidad--. Con el tope activo, alguien que pide dos pizzas se lleva un rechazo
 * porque el stock esta viejo, no porque falte salsa.
 *
 * El tope vale lo que valen los numeros de stock. Se enciende cuando el conteo
 * sea confiable, desde Configuracion.
 *
 * Si la consulta falla, se responde que no: que una lectura fallida corte la
 * venta seria peor que el problema que el tope resuelve.
 */
async function elTopeEstaEncendido(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from('business_settings')
    .select('aplicar_tope_de_stock')
    .single()

  return data?.aplicar_tope_de_stock === true
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

  // Antes de preguntar nada: sin productos que topear no hay consulta que
  // hacer, y el interruptor no se paga.
  if (ids.length === 0) return new Map()

  // El interruptor se consulta en paralelo con los topes, no antes: si esta
  // encendido no costo un viaje extra, y si esta apagado se descartan unos
  // numeros que ya estaban en vuelo. Es la cuenta barata de las dos.
  const [encendido, topes] = await Promise.all([
    elTopeEstaEncendido(supabase),
    Promise.all(
      ids.map((id) =>
        tipoPorId.get(id) === 'combo'
          ? getMaxComboQuantity(supabase, id)
          : getMaxElaboradoQuantity(supabase, id)
      )
    ),
  ])

  // Apagado: un Map vacio, que para quien llama es lo mismo que "sin tope".
  // El interruptor vive aca y en ningun otro lado, asi que los tres caminos
  // --el menu del agente, el carrito y la confirmacion del pedido-- lo
  // respetan sin saber que existe.
  if (!encendido) return new Map()

  return new Map(ids.map((id, i) => [id, topes[i]]))
}
