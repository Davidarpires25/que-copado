import http from 'node:http'
import https from 'node:https'
import { XMLParser } from 'fast-xml-parser'
import { ErrorArca, tiempoMaximoMs } from './config'

/**
 * Un pedido SOAP a ARCA y su respuesta como objeto.
 *
 * Sin librería de SOAP: son cinco operaciones con sobres fijos, y una
 * librería genérica agrega más de lo que resuelve. Los nombres de los
 * elementos se leen sin prefijo (`removeNSPrefix`), porque ARCA a veces
 * responde con `soap:` y a veces con `soapenv:`.
 */

const lector = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: true,
  // Los números de comprobante, CUIT y CAE se leen como texto: un CAE tiene 14
  // dígitos y una CUIT 11, y como número pierden precisión o ceros.
  parseTagValue: false,
  trimValues: true,
})

/** Escapa un valor para meterlo en el XML. */
export function x(valor: string | number) {
  return String(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function leerXml(texto: string): Record<string, unknown> {
  return lector.parse(texto) as Record<string, unknown>
}

/**
 * Los cifrados que se le ofrecen a ARCA: solo los modernos (ECDHE con
 * AES-GCM).
 *
 * El servidor de factura electrónica de producción (`servicios1.afip.gov.ar`)
 * prefiere DHE con una clave Diffie-Hellman demasiado corta, que OpenSSL
 * rechaza (`ERR_SSL_DH_KEY_TOO_SMALL`): con la configuración de Node por
 * defecto no se podía ni conectar. Homologación no lo mostraba. El mismo
 * servidor acepta ECDHE-RSA-AES256-GCM-SHA384 (verificado con `openssl
 * s_client`, 2026-10-02): si solo se ofrecen esos, los elige. No se baja el
 * nivel de seguridad: se saca de la mesa lo débil. TLS 1.3 sigue con sus
 * suites de siempre.
 */
const CIFRADOS = [
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
].join(':')

/** Un POST con `node:https` (o `node:http` contra el simulado de los tests), porque `fetch` no deja elegir cifrados. */
function postear(url: string, accion: string, cuerpo: string): Promise<{ status: number; texto: string }> {
  const destino = new URL(url)
  const pedir = destino.protocol === 'https:' ? https.request : http.request
  return new Promise((ok, falla) => {
    const pedido = pedir(
      destino,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: accion,
          'Content-Length': Buffer.byteLength(cuerpo),
        },
        ...(destino.protocol === 'https:' ? { ciphers: CIFRADOS } : {}),
        timeout: tiempoMaximoMs(),
      },
      (respuesta) => {
        const partes: Buffer[] = []
        respuesta.on('data', (p: Buffer) => partes.push(p))
        respuesta.on('end', () => ok({ status: respuesta.statusCode ?? 0, texto: Buffer.concat(partes).toString('utf8') }))
        respuesta.on('error', falla)
      }
    )
    pedido.on('timeout', () => pedido.destroy(new ErrorArca('red', 'ARCA no respondió a tiempo.')))
    pedido.on('error', falla)
    pedido.end(cuerpo)
  })
}

export async function pedirSoap(url: string, accion: string, cuerpo: string): Promise<Record<string, unknown>> {
  let respuesta: { status: number; texto: string }
  try {
    respuesta = await postear(url, accion, cuerpo)
  } catch (e) {
    if (e instanceof ErrorArca) throw e
    throw new ErrorArca('red', 'No se pudo conectar con ARCA.')
  }

  const texto = respuesta.texto
  let sobre: Record<string, unknown>
  try {
    sobre = leerXml(texto)
  } catch {
    throw new ErrorArca('red', `ARCA respondió algo que no es XML (HTTP ${respuesta.status}).`)
  }

  const cuerpoSoap = (sobre.Envelope as Record<string, unknown> | undefined)?.Body as Record<string, unknown> | undefined
  if (!cuerpoSoap) throw new ErrorArca('red', `Respuesta de ARCA sin cuerpo SOAP (HTTP ${respuesta.status}).`)

  const falla = cuerpoSoap.Fault as Record<string, unknown> | undefined
  if (falla) {
    // SOAP 1.1 (faultcode/faultstring), que es lo que usa WSAA.
    const codigo = String(falla.faultcode ?? '').replace(/^.*:/, '')
    throw new ErrorArca('arca', String(falla.faultstring ?? 'Error de ARCA'), codigo)
  }
  return cuerpoSoap
}

/** Un nodo que puede venir solo o repetido, siempre como lista. */
export function lista<T>(valor: T | T[] | undefined | null): T[] {
  if (valor === undefined || valor === null || (valor as unknown) === '') return []
  return Array.isArray(valor) ? valor : [valor]
}
