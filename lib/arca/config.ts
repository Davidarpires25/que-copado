/**
 * Cómo se llega a ARCA desde esta instalación (change la-caja-emite-factura-c).
 *
 * El certificado es del proveedor del sistema (David), no del local: el local
 * delega en esa CUIT el servicio de factura electrónica, como con Fudo. Por eso
 * nada de esto es `NEXT_PUBLIC_`: la clave privada nunca llega al navegador.
 *
 * Las direcciones son las del manual del desarrollador (ver "Datos
 * verificados" en design.md). `ARCA_URL_WSAA` y `ARCA_URL_WSFE` las pisan en
 * los tests, que hablan con un ARCA simulado.
 */

export type Ambiente = 'homologacion' | 'produccion'

const DIRECCIONES: Record<Ambiente, { wsaa: string; wsfe: string }> = {
  homologacion: {
    wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  },
  produccion: {
    wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
    wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
  },
}

export interface ConfigArca {
  ambiente: Ambiente
  /** La CUIT dueña del certificado: la del proveedor del sistema. */
  cuitProveedor: string
  certificado: string
  clave: string
  urlWsaa: string
  urlWsfe: string
}

/** Las variables de entorno aceptan el PEM con `\n` escritos, como los guarda Vercel. */
function pem(valor: string | undefined) {
  return (valor ?? '').replace(/\\n/g, '\n').trim()
}

/**
 * La configuración, o `null` si esta instalación no tiene certificado: ahí la
 * facturación no se puede encender, y se dice así en Ajustes.
 */
export function configArca(): ConfigArca | null {
  const ambiente: Ambiente = process.env.ARCA_AMBIENTE === 'produccion' ? 'produccion' : 'homologacion'
  const cuitProveedor = (process.env.ARCA_CUIT ?? '').trim()
  const certificado = pem(process.env.ARCA_CERT)
  const clave = pem(process.env.ARCA_KEY)
  if (!cuitProveedor || !certificado || !clave) return null
  return {
    ambiente,
    cuitProveedor,
    certificado,
    clave,
    urlWsaa: process.env.ARCA_URL_WSAA || DIRECCIONES[ambiente].wsaa,
    urlWsfe: process.env.ARCA_URL_WSFE || DIRECCIONES[ambiente].wsfe,
  }
}

/**
 * Cuánto se espera a ARCA. En horas pico tarda; más de esto, la factura queda
 * pendiente y el cobro sigue (la caja no espera a ARCA). Los tests lo achican
 * con `ARCA_TIEMPO_MAXIMO_MS`.
 */
export function tiempoMaximoMs() {
  return Number(process.env.ARCA_TIEMPO_MAXIMO_MS) || 15_000
}

/** Un problema al hablar con ARCA, con lo necesario para decidir qué hacer. */
export class ErrorArca extends Error {
  constructor(
    /**
     * `red`: no hubo respuesta (timeout, conexión); puede haber pasado igual.
     * `arca`: ARCA contestó con un error; no se autorizó nada.
     */
    readonly tipo: 'red' | 'arca',
    mensaje: string,
    readonly codigo?: string
  ) {
    super(mensaje)
    this.name = 'ErrorArca'
  }
}
