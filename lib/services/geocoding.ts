/**
 * Cliente para Nominatim (OpenStreetMap) geocoding
 * API pública gratuita con límite de 1 req/segundo
 */

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address: {
    road?: string
    house_number?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
    country?: string
  }
}

export interface AddressSuggestion {
  id: string
  label: string
  shortAddress: string
  fullAddress: string
  coordinates: {
    lat: number
    lng: number
  }
}

interface ReverseGeocodingResult {
  address: string
  fullAddress: string
  coordinates: {
    lat: number
    lng: number
  }
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'QueCopado Hamburguesas (delivery@quecopado.com)'

/**
 * Buscar direcciones con autocomplete
 * @param query - Texto de búsqueda
 * @param countryCode - Código ISO del país (ar para Argentina)
 */
export async function searchAddress(
  query: string,
  countryCode: string = 'ar'
): Promise<AddressSuggestion[]> {
  if (query.length < 3) return []

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    countrycodes: countryCode,
    limit: '5',
    'accept-language': 'es',
  })

  const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  })

  if (!response.ok) {
    throw new Error('Error en búsqueda de dirección')
  }

  const results: NominatimResult[] = await response.json()

  return results.map((result) => ({
    id: result.place_id.toString(),
    label: result.display_name,
    shortAddress: formatShortAddress(result),
    fullAddress: result.display_name,
    coordinates: {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    },
  }))
}

/**
 * Geocodificación inversa: coordenadas a dirección
 * @param lat - Latitud
 * @param lng - Longitud
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodingResult> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: 'json',
    addressdetails: '1',
    'accept-language': 'es',
  })

  const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  })

  if (!response.ok) {
    throw new Error('Error al obtener dirección')
  }

  const result: NominatimResult = await response.json()

  return {
    address: formatShortAddress(result),
    fullAddress: result.display_name,
    coordinates: {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    },
  }
}

/**
 * Formatea una dirección corta para mostrar
 */
function formatShortAddress(result: NominatimResult): string {
  const { address } = result
  const parts: string[] = []

  // Calle y número
  if (address.road) {
    parts.push(
      address.house_number
        ? `${address.road} ${address.house_number}`
        : address.road
    )
  }

  // Barrio o localidad
  const locality =
    address.neighbourhood || address.suburb || address.city || address.town || address.village
  if (locality) {
    parts.push(locality)
  }

  // Ciudad/Estado si es diferente
  if (address.state && address.state !== locality) {
    parts.push(address.state)
  }

  return parts.join(', ') || result.display_name
}
