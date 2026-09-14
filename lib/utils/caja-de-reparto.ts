import type { DeliveryZone, Viewbox } from '@/lib/types/database'

/**
 * La caja que contiene a todas las zonas de reparto.
 *
 * Vive aparte de `lib/server/area-de-reparto.ts`, que es quien la usa, por lo
 * mismo que `agent-secret.ts` vive solo: sin imports que no sean tipos, se
 * puede cargar con node y verificar la cuenta sin levantar el proyecto. Las
 * zonas circulares y el caso sin zonas no existen en la base de produccion, y
 * son justo los que hay que poder probar a mano.
 */

/** Un grado de latitud son ~111 km en cualquier parte del planeta. */
const KM_POR_GRADO = 111

function extenderConPunto(caja: Viewbox | null, lat: number, lng: number): Viewbox {
  if (!caja) return { minLat: lat, maxLat: lat, minLng: lng, maxLng: lng }
  return {
    minLat: Math.min(caja.minLat, lat),
    maxLat: Math.max(caja.maxLat, lat),
    minLng: Math.min(caja.minLng, lng),
    maxLng: Math.max(caja.maxLng, lng),
  }
}

/** La caja que contiene a todas las zonas, sin margen. `null` si no hay ninguna. */
export function cajaDeZonas(zonas: DeliveryZone[]): Viewbox | null {
  let caja: Viewbox | null = null

  for (const zona of zonas) {
    if (zona.polygon?.coordinates?.[0]) {
      // GeoJSON guarda [lng, lat], al reves de como se lee en voz alta.
      for (const [lng, lat] of zona.polygon.coordinates[0]) {
        if (Number.isFinite(lat) && Number.isFinite(lng)) caja = extenderConPunto(caja, lat, lng)
      }
      continue
    }

    if (zona.center && zona.radius_meters) {
      // El radio en grados de latitud. Para la longitud habria que dividir por
      // el coseno de la latitud, pero esto es una caja de busqueda aproximada y
      // el margen que se le suma despues es mas grande que esa correccion.
      const grados = zona.radius_meters / 1000 / KM_POR_GRADO
      caja = extenderConPunto(caja, zona.center.lat - grados, zona.center.lng - grados)
      caja = extenderConPunto(caja, zona.center.lat + grados, zona.center.lng + grados)
    }
  }

  return caja
}

/** La misma caja, agrandada en `margen` grados por cada lado. */
export function conMargen(caja: Viewbox, margen: number): Viewbox {
  return {
    minLat: caja.minLat - margen,
    maxLat: caja.maxLat + margen,
    minLng: caja.minLng - margen,
    maxLng: caja.maxLng + margen,
  }
}
