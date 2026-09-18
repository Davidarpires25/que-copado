import { convertToBaseUnit, getBaseUnit } from '@/lib/server/unit-conversion'
import { escalarComponente } from '@/lib/server/sub-recipes'

/**
 * El recorrido de insumos de una receta, una sola vez.
 *
 * Bajar por las recetas de un producto, resolver las sub-recetas, aplicar las
 * mermas y convertir unidades estaba escrito **tres veces**: en el descuento de
 * stock, en el calculo de cuantas unidades salen, y en la version en memoria
 * que usa la pantalla de stock para no hacer una consulta por producto.
 *
 * Las tres ya habian divergido. La de `elaborado-stock.ts` no bajaba por las
 * sub-recetas, asi que un producto con un insumo compuesto daba un numero en el
 * checkout y otro en la pantalla. Y el error de unidades que aparecio hoy
 * --convertir la receta y no el stock-- habia que arreglarlo en las tres.
 *
 * Es el mismo precio que este proyecto ya pago con los dos barridos de
 * disponibilidad y con los dos calculos de stock teorico: alguien extiende una
 * copia y no las otras, y el bug aparece meses despues por un solo camino.
 *
 * Lo que cambia entre los tres usos es de donde salen los datos y que se hace
 * al llegar al fondo. Eso son los dos parametros.
 */

/** Un insumo, con lo que hace falta para recorrerlo. */
export interface InsumoDelRecorrido {
  id: string
  unit: string
  waste_percentage: number | null
  current_stock: number
  stock_tracking_enabled: boolean
  yield_quantity: number | null
}

/** Una linea de sub-receta: de que esta hecho un insumo compuesto. */
export interface ComponenteDeSubReceta {
  child_ingredient_id: string
  quantity: number
  unit: string
}

/**
 * De donde salen los insumos.
 *
 * La version que consulta la base y la que trabaja sobre Maps ya cargados
 * implementan esto mismo. Es async en las dos aunque una no lo necesite:
 * esperar un valor ya resuelto cuesta un microtask, y a cambio el recorrido es
 * uno solo.
 */
export interface FuenteDeInsumos {
  insumo(id: string): Promise<InsumoDelRecorrido | null>
  subRecetas(id: string): Promise<ComponenteDeSubReceta[]>
}

/** Que hacer al llegar a un insumo que no se descompone en otros. */
export type AlLlegarAlFondo = (insumo: InsumoDelRecorrido, cantidadEnUnidadBase: number) => void

/**
 * Recorre un insumo y sus sub-recetas, y avisa al llegar a cada hoja.
 *
 * `cantidadEnUnidadBase` viene con la merma ya aplicada y convertida a la
 * unidad base de su familia (kg, litro o unidad), que es la unica forma de
 * comparar una receta que pide gramos con un insumo cargado en kilos.
 *
 * Un insumo con sub-receta **no** descuenta de si mismo: las preparaciones se
 * hacen en el momento, no se guardan. Se resuelve a sus componentes.
 */
export async function recorrerInsumos(
  fuente: FuenteDeInsumos,
  ingredientId: string,
  cantidadEnUnidadDeReceta: number,
  unidadDeReceta: string,
  alLlegarAlFondo: AlLlegarAlFondo,
  visitados: Set<string> = new Set()
): Promise<void> {
  if (visitados.has(ingredientId)) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Stock] Ciclo de sub-recetas en el insumo ${ingredientId}, se corta`)
    }
    return
  }
  visitados.add(ingredientId)

  const insumo = await fuente.insumo(ingredientId)
  if (!insumo) return

  // Una receta en gramos contra un insumo en litros no se puede comparar. Antes
  // de descartarla se avisa, porque es un error de carga y no un caso normal.
  if (getBaseUnit(unidadDeReceta) !== getBaseUnit(insumo.unit)) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[Stock] Unidades incompatibles: la receta usa '${unidadDeReceta}' y el insumo '${insumo.id}' esta en '${insumo.unit}'`
      )
    }
    return
  }

  const cantidadBase = convertToBaseUnit(cantidadEnUnidadDeReceta, unidadDeReceta)
  const merma = Number(insumo.waste_percentage) || 0
  const factor = 1 - merma / 100
  const cantidadConMerma = factor > 0 ? cantidadBase / factor : cantidadBase

  const componentes = await fuente.subRecetas(ingredientId)

  if (componentes.length > 0) {
    for (const componente of componentes) {
      await recorrerInsumos(
        fuente,
        componente.child_ingredient_id,
        escalarComponente(componente.quantity, cantidadConMerma, insumo.yield_quantity),
        componente.unit,
        alLlegarAlFondo,
        new Set(visitados)
      )
    }
    return
  }

  alLlegarAlFondo(insumo, cantidadConMerma)
}

/** Lo que hace falta de un insumo y lo que hay, las dos en unidad base. */
export interface Requerimiento {
  requiredQty: number
  currentStock: number
  trackingEnabled: boolean
}

export type Requerimientos = Map<string, Requerimiento>

/**
 * El acumulador que usan los dos caminos que preguntan "cuanto alcanza".
 *
 * El stock tambien va a unidad base. Convertir una sola punta fue el error que
 * hacia que un insumo en gramos alcanzara para mil veces mas de lo que hay.
 */
export function acumularRequerimiento(
  requerimientos: Requerimientos,
  insumo: InsumoDelRecorrido,
  cantidadEnUnidadBase: number
): void {
  const existente = requerimientos.get(insumo.id)
  if (existente) {
    existente.requiredQty += cantidadEnUnidadBase
    return
  }
  requerimientos.set(insumo.id, {
    requiredQty: cantidadEnUnidadBase,
    currentStock: convertToBaseUnit(Number(insumo.current_stock), insumo.unit),
    trackingEnabled: insumo.stock_tracking_enabled,
  })
}

/**
 * Cuantas unidades salen con lo que hay.
 *
 * `null` es "sin tope": ningun insumo tiene seguimiento, asi que no hay nada
 * que limite. Cero es distinto —hay seguimiento y no alcanza— y por eso no se
 * pueden confundir.
 */
export function cuantasSalen(requerimientos: Requerimientos): number | null {
  let minimo: number | null = null
  let algunoSeSigue = false

  for (const [, req] of requerimientos) {
    if (!req.trackingEnabled) continue
    algunoSeSigue = true
    if (req.requiredQty <= 0) continue
    const salen = Math.floor(req.currentStock / req.requiredQty)
    if (minimo === null || salen < minimo) minimo = salen
  }

  if (!algunoSeSigue) return null
  return minimo ?? 0
}
