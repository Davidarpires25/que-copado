/**
 * Quién es el local: nombre, rubro, logo y dónde queda (spec datos-del-local).
 *
 * Es el único lugar del código que lo dice. Antes estaba escrito a mano en
 * trece archivos —el ticket, las hojas A4, el mensaje de WhatsApp, el título de
 * la página, el mapa de zonas—, y otro local no se podía instalar sin tocarlos
 * uno por uno.
 *
 * Cada dato sale de una variable de entorno y, si no está, vale lo de Que
 * Copado: así producción no necesita ninguna variable nueva (decisión con
 * David, 2026-09-29). Cuando haya un segundo local, las variables pasan a
 * exigirse.
 *
 * Cada variable se lee escrita entera (`process.env.NEXT_PUBLIC_…`): Next las
 * reemplaza en el build, y un acceso por nombre armado llega vacío al
 * navegador.
 */

/** Una variable vacía cuenta como no cargada. */
function valor(variable: string | undefined, porDefecto: string): string {
  return variable?.trim() || porDefecto
}

const CENTRO_POR_DEFECTO = { lat: -28.4696, lng: -65.7795 } // San Fernando del Valle de Catamarca

/** `"lat,lng"`. Mal escrito, vale el centro por defecto: un mapa en el mar no ayuda a nadie. */
function centro(variable: string | undefined): { lat: number; lng: number } {
  if (!variable?.trim()) return CENTRO_POR_DEFECTO
  const [lat, lng] = variable.split(',').map((parte) => Number(parte.trim()))
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat, lng }
  }
  console.warn(`[negocio] NEXT_PUBLIC_NEGOCIO_CENTRO="${variable}" no es "lat,lng": se usa el centro por defecto`)
  return CENTRO_POR_DEFECTO
}

/**
 * El sitio público, o `null`. Sin valor por defecto: `quecopado.com` es de
 * otro negocio (una tienda de artículos para fiestas), y cada pedido por
 * WhatsApp decía "Enviado desde queCopado.com".
 */
function sitio(variable: string | undefined): URL | null {
  if (!variable?.trim()) return null
  try {
    return new URL(variable.trim())
  } catch {
    return null
  }
}

export const NEGOCIO = {
  nombre: valor(process.env.NEXT_PUBLIC_NEGOCIO_NOMBRE, 'Que Copado'),
  rubro: valor(process.env.NEXT_PUBLIC_NEGOCIO_RUBRO, 'Hamburguesería'),
  lema: valor(process.env.NEXT_PUBLIC_NEGOCIO_LEMA, 'Las mejores hamburguesas'),
  descripcion: valor(
    process.env.NEXT_PUBLIC_NEGOCIO_DESCRIPCION,
    'Las mejores hamburguesas de la zona. Pedí ahora por WhatsApp!'
  ),
  /** Una dirección: `/logo.svg` del propio sitio, o la del Storage del local. */
  logo: valor(process.env.NEXT_PUBLIC_NEGOCIO_LOGO, '/logo.svg'),
  sitio: sitio(process.env.NEXT_PUBLIC_APP_URL),
  /** Donde abre el mapa de zonas cuando todavía no hay ninguna dibujada. */
  centroDelMapa: { ...centro(process.env.NEXT_PUBLIC_NEGOCIO_CENTRO), zoom: 13 },
} as const
