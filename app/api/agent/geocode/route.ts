import { requireAgentSecret } from '@/lib/server/agent-auth'
import { agentError, agentInternalError } from '@/lib/server/agent-errors'
import { searchAddress } from '@/lib/services/geocoding'
import { viewboxDeReparto } from '@/lib/server/area-de-reparto'
import { devError } from '@/lib/server/logger'

export const dynamic = 'force-dynamic'

interface GeocodeRequest {
  texto?: unknown
}

/** Lo que pide el contrato: nunca mas de cinco, en el orden que llegan. */
const MAX_CANDIDATOS = 5

/** Nominatim ignora las busquedas mas cortas; el contrato las rechaza. */
const MIN_CARACTERES = 3

/**
 * POST /api/agent/geocode
 *
 * Traduce un texto a coordenadas para que el cliente pueda escribir o dictar su
 * direccion en vez de tener que compartir la ubicacion con el clip, que es
 * donde hoy se caen los pedidos.
 *
 * Devuelve CANDIDATOS y no una direccion unica a proposito. El POS no tiene con
 * que decidir cual de dos "Sarmiento 123" es la del cliente; el agente si,
 * porque puede preguntarselo. Elegir por el esconderia la ambiguedad justo
 * donde se paga cara: en la puerta equivocada, con la comida fria.
 *
 * Una busqueda sin resultados es 200 con la lista vacia. No encontrar una
 * direccion es un resultado, no una falla: el agente le pide al cliente que la
 * escriba de otra forma. La falla es que el buscador no conteste, y eso es 503,
 * porque ahi lo que corresponde es esperar y reintentar, no reescribir nada.
 */
export async function POST(request: Request) {
  const denied = requireAgentSecret(request)
  if (denied) return denied

  try {
    let body: GeocodeRequest
    try {
      body = await request.json()
    } catch {
      return agentError('invalid_request', 'El cuerpo no es JSON válido.')
    }

    const texto = typeof body.texto === 'string' ? body.texto.trim() : ''

    if (texto.length < MIN_CARACTERES) {
      return agentError(
        'invalid_request',
        `La búsqueda necesita al menos ${MIN_CARACTERES} caracteres.`,
        { fields: ['texto'] }
      )
    }

    // La caja de reparto inclina la busqueda hacia donde el local entrega. Sin
    // ella, "Sarmiento 123" devolvia cinco resultados de Rio Negro, Santiago
    // del Estero, Buenos Aires, Tierra del Fuego y Chubut, y ninguno de
    // Catamarca: el agente le ofrecia al cliente cinco opciones todas
    // equivocadas. Inclina, no filtra: una direccion lejos del local se sigue
    // encontrando igual.
    //
    // Si no hay zonas cargadas devuelve null y la busqueda sale sin inclinar,
    // que es como venia funcionando.
    let sugerencias
    try {
      sugerencias = await searchAddress(texto, 'ar', await viewboxDeReparto())
    } catch (e) {
      // Nominatim se cayo, tardo demasiado o contesto cualquier cosa. Se separa
      // del catch de abajo para no confundir "el buscador no esta" con un error
      // nuestro: el agente reintenta en el primer caso y no en el segundo.
      devError('[agent/geocode] fallo la busqueda de direccion:', e)
      return agentError(
        'service_unavailable',
        'El buscador de direcciones no está disponible. Probá de nuevo en unos minutos.'
      )
    }

    return Response.json({
      candidatos: sugerencias.slice(0, MAX_CANDIDATOS).map((s) => ({
        // `shortAddress` y no `fullAddress`: el largo de Nominatim empieza por
        // la altura y sigue con municipio, departamento y codigo postal
        // ("123, Sarmiento, Centro, Villa Regina, Municipio de Villa Regina,
        // Departamento General Roca, Rio Negro, R8336, Argentina"), que es
        // ilegible en un mensaje de WhatsApp. El corto es "Sarmiento 123,
        // Centro, Rio Negro": alcanza para que el cliente reconozca la suya.
        direccion: s.shortAddress,
        lat: s.coordinates.lat,
        lng: s.coordinates.lng,
      })),
    })
  } catch (e) {
    devError('[agent/geocode] error inesperado:', e)
    return agentInternalError()
  }
}
