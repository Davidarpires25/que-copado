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

export async function pedirSoap(url: string, accion: string, cuerpo: string): Promise<Record<string, unknown>> {
  let respuesta: Response
  try {
    respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: accion },
      body: cuerpo,
      signal: AbortSignal.timeout(tiempoMaximoMs()),
      cache: 'no-store',
    })
  } catch (e) {
    const porTiempo = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')
    throw new ErrorArca('red', porTiempo ? 'ARCA no respondió a tiempo.' : 'No se pudo conectar con ARCA.')
  }

  const texto = await respuesta.text()
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
