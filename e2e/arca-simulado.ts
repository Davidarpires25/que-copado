import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import forge from 'node-forge'
import { XMLParser } from 'fast-xml-parser'

/**
 * Un ARCA de mentira para los tests (change la-caja-emite-factura-c, tarea
 * 3.1): WSAA y WSFEv1 con las respuestas del manual del desarrollador.
 *
 * Verifica lo que el ARCA de verdad verificaría y es fácil de romper sin
 * querer: que el pedido de acceso venga firmado (CMS válido, con el XML
 * adentro), que cada pedido de factura traiga el token dado y la CUIT
 * representada, y que el número sea el siguiente al último.
 *
 * `modo` fuerza los casos difíciles: el ticket que ARCA ya dio, la delegación
 * que falta, el rechazo, el número desfasado y la respuesta que se pierde.
 */

/** Puerto fijo del simulado cuando lo tiene que encontrar el servidor de Next de los tests. */
export const PUERTO_ARCA_SIMULADO = 54399

export type Modo =
  | 'normal'
  /** WSAA contesta coe.alreadyAuthenticated. */
  | 'ticket-ya-dado'
  /** WSFE contesta que la CUIT representada no delegó en el proveedor. */
  | 'sin-delegacion'
  /** El comprobante se rechaza con una observación. */
  | 'rechazar'
  /** Autoriza el comprobante pero no contesta: la respuesta "se pierde". */
  | 'autoriza-y-no-contesta'
  /** No contesta y no autoriza nada. */
  | 'no-contesta'
  /** Una sola vez: otra emisión toma el número justo antes (rechazo 10016). */
  | 'otro-se-adelanta'

interface Emitido {
  cae: string
  vence: string
  total: number
  docTipo: number
  docNro: number
  fecha: string
}

export interface ArcaSimulado {
  url: string
  urlWsaa: string
  urlWsfe: string
  modo: Modo
  /** Pedidos recibidos por operación. */
  pedidos: Record<string, number>
  /** Último número por "puntoVenta-tipo". */
  ultimos: Map<string, number>
  emitidos: Map<string, Emitido>
  /** Las CUIT representadas que llegaron en los pedidos de factura. */
  cuits: string[]
  /**
   * Hasta cuándo vale el ticket que dio. Como el de verdad, mientras valga
   * rechaza dar otro (coe.alreadyAuthenticated).
   */
  ticketHasta: number
  /** Cuánto tarda WSAA en contestar, en ms: para que dos pedidos se crucen. */
  demoraWsaa: number
  cerrar: () => Promise<void>
}

const TOKEN = 'token-de-prueba'
const FIRMA = 'firma-de-prueba'

const lector = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true, parseTagValue: false })

function escapar(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function soap(cuerpo: string) {
  return `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${cuerpo}</soap:Body></soap:Envelope>`
}

function falla(codigo: string, texto: string) {
  return soap(`<soapenv:Fault xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><faultcode xmlns:ns1="http://xml.apache.org/axis/">ns1:${codigo}</faultcode><faultstring>${escapar(texto)}</faultstring></soapenv:Fault>`)
}

function resultado(op: string, adentro: string) {
  return soap(`<${op}Response xmlns="http://ar.gov.afip.dif.FEV1/"><${op}Result>${adentro}</${op}Result></${op}Response>`)
}

const hoyArca = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')

/** `puerto` 0 elige uno libre; los tests de la caja usan el fijo de playwright.config.ts. */
export async function levantarArcaSimulado(puerto = 0): Promise<ArcaSimulado> {
  const estado: ArcaSimulado = {
    url: '',
    urlWsaa: '',
    urlWsfe: '',
    modo: 'normal',
    pedidos: {},
    ultimos: new Map(),
    emitidos: new Map(),
    cuits: [],
    ticketHasta: 0,
    demoraWsaa: 0,
    cerrar: async () => {},
  }
  const colgados: Array<() => void> = []

  const contar = (op: string) => {
    estado.pedidos[op] = (estado.pedidos[op] ?? 0) + 1
  }

  function wsaa(cuerpo: Record<string, unknown>): string {
    contar('loginCms')
    const cms = String((cuerpo.loginCms as Record<string, unknown>)?.in0 ?? '')
    let contenido = ''
    try {
      const p7 = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(forge.util.decode64(cms))) as forge.pkcs7.PkcsSignedData & {
        rawCapture: { content?: forge.asn1.Asn1 }
      }
      if (!p7.certificates?.length) return falla('cms.cert.notFound', 'No se ha encontrado certificado de firma en el CMS')
      // forge deja el contenido dentro del [0] EXPLICIT, como OCTET STRING.
      const octetos = (p7.rawCapture.content?.value as forge.asn1.Asn1[] | undefined)?.[0]?.value
      contenido = forge.util.decodeUtf8(typeof octetos === 'string' ? octetos : '')
    } catch {
      return falla('cms.bad', 'El CMS no es valido')
    }
    if (!contenido.includes('<loginTicketRequest') || !contenido.includes('<service>wsfe</service>')) {
      return falla('xml.bad', 'No se ha podido interpretar el XML contra el SCHEMA')
    }
    if (estado.modo === 'ticket-ya-dado' || estado.ticketHasta > Date.now()) {
      return falla('coe.alreadyAuthenticated', 'El CEE ya posee un TA valido para el acceso al WSN solicitado')
    }
    const ahora = new Date()
    const vence = new Date(ahora.getTime() + 12 * 3600 * 1000)
    estado.ticketHasta = vence.getTime()
    const ticket =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><loginTicketResponse version="1.0"><header>' +
      `<source>CN=wsaahomo, O=AFIP, C=AR</source><destination>SERIALNUMBER=CUIT 20000000001</destination>` +
      `<uniqueId>1</uniqueId><generationTime>${ahora.toISOString()}</generationTime><expirationTime>${vence.toISOString()}</expirationTime>` +
      `</header><credentials><token>${TOKEN}</token><sign>${FIRMA}</sign></credentials></loginTicketResponse>`
    return soap(`<loginCmsResponse xmlns="http://wsaa.view.sua.dvadac.desein.afip.gov"><loginCmsReturn>${escapar(ticket)}</loginCmsReturn></loginCmsResponse>`)
  }

  /** Devuelve la respuesta, o `null` para no contestar nunca. */
  function wsfe(op: string, cuerpo: Record<string, unknown>): string | null {
    contar(op)
    if (op === 'FEDummy') return resultado(op, '<AppServer>OK</AppServer><DbServer>OK</DbServer><AuthServer>OK</AuthServer>')

    const pedido = cuerpo[op] as Record<string, unknown>
    const auth = pedido.Auth as Record<string, string>
    if (auth?.Token !== TOKEN || auth?.Sign !== FIRMA) {
      return resultado(op, '<Errors><Err><Code>600</Code><Msg>ValidacionDeToken: No validaron las firmas digitales</Msg></Err></Errors>')
    }
    estado.cuits.push(String(auth.Cuit))
    if (estado.modo === 'sin-delegacion') {
      return resultado(op, `<Errors><Err><Code>600</Code><Msg>ValidacionDeToken: No aparecio CUIT en lista de relaciones: ${auth.Cuit}</Msg></Err></Errors>`)
    }

    if (op === 'FECompUltimoAutorizado') {
      const clave = `${pedido.PtoVta}-${pedido.CbteTipo}`
      return resultado(op, `<PtoVta>${pedido.PtoVta}</PtoVta><CbteTipo>${pedido.CbteTipo}</CbteTipo><CbteNro>${estado.ultimos.get(clave) ?? 0}</CbteNro>`)
    }

    if (op === 'FECompConsultar') {
      const r = pedido.FeCompConsReq as Record<string, string>
      const e = estado.emitidos.get(`${r.PtoVta}-${r.CbteTipo}-${r.CbteNro}`)
      if (!e) return resultado(op, '<Errors><Err><Code>602</Code><Msg>Sin Resultados: - en FECompConsultar</Msg></Err></Errors>')
      return resultado(
        op,
        `<ResultGet><Concepto>1</Concepto><DocTipo>${e.docTipo}</DocTipo><DocNro>${e.docNro}</DocNro><CbteDesde>${r.CbteNro}</CbteDesde><CbteHasta>${r.CbteNro}</CbteHasta>` +
          `<CbteFch>${e.fecha}</CbteFch><ImpTotal>${e.total}</ImpTotal><Resultado>A</Resultado><CodAutorizacion>${e.cae}</CodAutorizacion><EmisionTipo>CAE</EmisionTipo>` +
          `<FchVto>${e.vence}</FchVto><FchProceso>${hoyArca()}</FchProceso><PtoVta>${r.PtoVta}</PtoVta><CbteTipo>${r.CbteTipo}</CbteTipo></ResultGet>`
      )
    }

    if (op === 'FECAESolicitar') {
      if (estado.modo === 'no-contesta') return null
      const req = pedido.FeCAEReq as Record<string, Record<string, unknown>>
      const cab = req.FeCabReq as Record<string, string>
      const det = (req.FeDetReq as Record<string, Record<string, string>>).FECAEDetRequest
      const clave = `${cab.PtoVta}-${cab.CbteTipo}`
      const numero = Number(det.CbteDesde)
      const cabecera = `<FeCabResp><Cuit>${auth.Cuit}</Cuit><PtoVta>${cab.PtoVta}</PtoVta><CbteTipo>${cab.CbteTipo}</CbteTipo><FchProceso>${hoyArca()}</FchProceso><CantReg>1</CantReg>`
      const rechazo = (code: string, msg: string) =>
        resultado(
          op,
          `${cabecera}<Resultado>R</Resultado><Reproceso>N</Reproceso></FeCabResp><FeDetResp><FECAEDetResponse><Concepto>1</Concepto><DocTipo>${det.DocTipo}</DocTipo><DocNro>${det.DocNro}</DocNro>` +
            `<CbteDesde>${numero}</CbteDesde><CbteHasta>${numero}</CbteHasta><CbteFch>${det.CbteFch}</CbteFch><Resultado>R</Resultado><CAE></CAE><CAEFchVto></CAEFchVto>` +
            `<Observaciones><Obs><Code>${code}</Code><Msg>${escapar(msg)}</Msg></Obs></Observaciones></FECAEDetResponse></FeDetResp>`
        )
      if (estado.modo === 'otro-se-adelanta') {
        estado.ultimos.set(clave, (estado.ultimos.get(clave) ?? 0) + 1)
        estado.modo = 'normal'
      }
      if (numero !== (estado.ultimos.get(clave) ?? 0) + 1) {
        return rechazo('10016', `comp. ${numero} no coincide con el próximo a autorizar`)
      }
      if (det.CondicionIVAReceptorId !== '5') return rechazo('10246', 'Campo Condición Frente al IVA del receptor es obligatorio')
      if (estado.modo === 'rechazar') return rechazo('10015', 'El campo DocNro es invalido')

      const cae = String(70000000000000 + Math.floor(Math.random() * 9_999_999))
      const vence = new Date(Date.now() + 10 * 86400 * 1000).toISOString().slice(0, 10).replace(/-/g, '')
      estado.ultimos.set(clave, numero)
      estado.emitidos.set(`${clave}-${numero}`, {
        cae,
        vence,
        total: Number(det.ImpTotal),
        docTipo: Number(det.DocTipo),
        docNro: Number(det.DocNro),
        fecha: det.CbteFch,
      })
      if (estado.modo === 'autoriza-y-no-contesta') return null
      return resultado(
        op,
        `${cabecera}<Resultado>A</Resultado><Reproceso>N</Reproceso></FeCabResp><FeDetResp><FECAEDetResponse><Concepto>1</Concepto><DocTipo>${det.DocTipo}</DocTipo><DocNro>${det.DocNro}</DocNro>` +
          `<CbteDesde>${numero}</CbteDesde><CbteHasta>${numero}</CbteHasta><CbteFch>${det.CbteFch}</CbteFch><Resultado>A</Resultado><CAE>${cae}</CAE><CAEFchVto>${vence}</CAEFchVto></FECAEDetResponse></FeDetResp>`
      )
    }
    return resultado(op, `<Errors><Err><Code>500</Code><Msg>Operación no simulada: ${op}</Msg></Err></Errors>`)
  }

  const servidor: Server = createServer((req, res) => {
    let texto = ''
    req.on('data', (c) => (texto += c))
    req.on('end', () => {
      const sobre = lector.parse(texto) as { Envelope?: { Body?: Record<string, unknown> } }
      const cuerpo = sobre.Envelope?.Body ?? {}
      const accion = String(req.headers.soapaction ?? '').replace(/"/g, '')
      const esWsaa = req.url?.startsWith('/wsaa')
      const respuesta = esWsaa ? wsaa(cuerpo) : wsfe(accion.replace(/^.*\//, ''), cuerpo)
      if (respuesta === null) {
        colgados.push(() => res.destroy())
        return
      }
      const contestar = () => {
        res.writeHead(respuesta.includes('Fault>') ? 500 : 200, { 'Content-Type': 'text/xml; charset=utf-8' })
        res.end(respuesta)
      }
      if (esWsaa && estado.demoraWsaa) setTimeout(contestar, estado.demoraWsaa)
      else contestar()
    })
  })

  await new Promise<void>((ok) => servidor.listen(puerto, '127.0.0.1', ok))
  const { port } = servidor.address() as AddressInfo
  estado.url = `http://127.0.0.1:${port}`
  estado.urlWsaa = `${estado.url}/wsaa`
  estado.urlWsfe = `${estado.url}/wsfe`
  estado.cerrar = async () => {
    colgados.forEach((f) => f())
    await new Promise<void>((ok) => servidor.close(() => ok()))
  }
  return estado
}

/** Un certificado y su clave, autofirmados, para firmar pedidos al simulado. */
export function certificadoDePrueba() {
  const claves = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = claves.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date(Date.now() - 86400 * 1000)
  cert.validity.notAfter = new Date(Date.now() + 365 * 86400 * 1000)
  const nombre = [{ name: 'commonName', value: 'prueba' }, { name: 'serialNumber', value: 'CUIT 20000000001' }]
  cert.setSubject(nombre)
  cert.setIssuer(nombre)
  cert.sign(claves.privateKey, forge.md.sha256.create())
  return { certificado: forge.pki.certificateToPem(cert), clave: forge.pki.privateKeyToPem(claves.privateKey) }
}
