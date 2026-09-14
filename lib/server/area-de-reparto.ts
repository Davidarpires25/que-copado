import { getActiveDeliveryZones } from '@/app/actions/delivery-zones'
import { devError } from '@/lib/server/logger'
import { cajaDeZonas, conMargen } from '@/lib/utils/caja-de-reparto'
import type { Viewbox } from '@/lib/types/database'

/**
 * Cuanto se agranda la caja de las zonas antes de usarla para buscar
 * direcciones, en grados (~0,05° son unos 5,5 km).
 *
 * La caja cruda de las zonas es el area de reparto, no el area donde vive la
 * gente que pide. Medido sobre las zonas de produccion: la caja de "zona norte"
 * mide 4,3 x 3,2 km y ni siquiera contiene el centro de la ciudad, asi que una
 * direccion del centro —que es donde esta media la ciudad— quedaria afuera. Con
 * el margen, la caja pasa a cubrir la ciudad entera y alrededores.
 *
 * El margen no decide a quien se le entrega: de eso se encarga el calculo de
 * envio, que si usa los poligonos exactos. Esto solo inclina la busqueda.
 */
const MARGEN_GRADOS = 0.05

/**
 * La caja donde buscar direcciones, o `null` si no hay zonas configuradas.
 *
 * Sirve para inclinar el geocodificador hacia donde el local reparte. Sin esto,
 * "Sarmiento 123" devuelve cinco resultados de cinco provincias distintas y
 * ninguno de Catamarca: el cliente que escribe su calle sin aclarar la ciudad
 * —que es lo que hace cualquiera— recibe cinco opciones y todas estan mal.
 *
 * Con `null` la busqueda sigue andando, sin inclinacion. Es lo mismo que hace el
 * envio cuando no hay zonas cargadas: el sistema tiene que funcionar antes de
 * que alguien dibuje el mapa.
 */
export async function viewboxDeReparto(): Promise<Viewbox | null> {
  const { data: zonas, error } = await getActiveDeliveryZones()

  if (error || !zonas?.length) {
    if (error) devError('[area-de-reparto] no se pudieron leer las zonas:', error)
    return null
  }

  const caja = cajaDeZonas(zonas)
  return caja ? conMargen(caja, MARGEN_GRADOS) : null
}
