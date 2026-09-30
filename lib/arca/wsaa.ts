import forge from 'node-forge'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ErrorArca, type ConfigArca } from './config'
import { leerXml, pedirSoap, x } from './soap'

/**
 * El permiso para usar un servicio de ARCA (WSAA).
 *
 * Se pide firmando con el certificado un "pedido de acceso" y ARCA devuelve un
 * ticket (token y firma) que vale unas 12 horas. Dos reglas del manual
 * (Especificación Técnica WSAA 1.2.2) mandan cómo se guarda:
 *
 * - Mientras haya un ticket vigente, ARCA **rechaza** pedir otro
 *   (`coe.alreadyAuthenticated`). Vercel no guarda memoria entre llamadas, así
 *   que el ticket vive en la base (`arca_ticket_de_acceso`).
 * - Después de un error que no sea `wsaa.*` ni `wsn.unavailable` —la
 *   delegación que falta, el certificado vencido— no hay que insistir: se
 *   corrige primero. Por eso acá no se reintenta.
 */

export interface TicketDeAcceso {
  token: string
  firma: string
  vence: Date
}

/** Cuánto antes del vencimiento se renueva: no arrancar una factura con un ticket que se muere en el medio. */
const MARGEN_MS = 10 * 60 * 1000

/** Cuántas veces (cada medio segundo) se relee el ticket que está guardando otro pedido. */
const ESPERAS_DEL_OTRO = 6

/** El pedido de acceso (LoginTicketRequest.xml). */
export function pedidoDeAcceso(servicio: string, ahora = new Date()): string {
  // La tolerancia de ARCA es de 24 h; 10 minutos para cada lado cubren un
  // reloj corrido sin dejar un pedido reutilizable por mucho tiempo.
  const desde = new Date(ahora.getTime() - 10 * 60 * 1000).toISOString()
  const hasta = new Date(ahora.getTime() + 10 * 60 * 1000).toISOString()
  const id = Math.floor(ahora.getTime() / 1000) % 4_294_967_295
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<loginTicketRequest version="1.0">' +
    `<header><uniqueId>${id}</uniqueId><generationTime>${desde}</generationTime><expirationTime>${hasta}</expirationTime></header>` +
    `<service>${x(servicio)}</service>` +
    '</loginTicketRequest>'
  )
}

/**
 * El pedido firmado: un CMS "SignedData" con el XML adentro, en base64.
 *
 * El manual dice SHA1+RSA; se firma con SHA-256, que es lo que hacen hoy
 * OpenSSL (`smime -sign`) y las librerías que usan otros sistemas, y ARCA lo
 * acepta. Si homologación lo rechazara (`cms.sign.invalid`), es este valor.
 */
export function firmar(xml: string, certificadoPem: string, clavePem: string): string {
  const certificado = forge.pki.certificateFromPem(certificadoPem)
  const clave = forge.pki.privateKeyFromPem(clavePem)
  const p7 = forge.pkcs7.createSignedData()
  p7.content = forge.util.createBuffer(xml, 'utf8')
  p7.addCertificate(certificado)
  p7.addSigner({
    key: clave,
    certificate: certificado,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      // forge acepta una Date acá aunque sus tipos digan string.
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  })
  p7.sign()
  return forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes())
}

/** Pide un ticket nuevo a ARCA. */
export async function pedirTicket(config: ConfigArca, servicio: string): Promise<TicketDeAcceso> {
  const cms = firmar(pedidoDeAcceso(servicio), config.certificado, config.clave)
  const cuerpo = await pedirSoap(
    config.urlWsaa,
    '',
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">' +
      `<soapenv:Header/><soapenv:Body><wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms></soapenv:Body>` +
      '</soapenv:Envelope>'
  )
  const devuelto = (cuerpo.loginCmsResponse as Record<string, unknown> | undefined)?.loginCmsReturn
  if (typeof devuelto !== 'string') throw new ErrorArca('red', 'ARCA no devolvió el ticket de acceso.')

  const ticket = leerXml(devuelto).loginTicketResponse as
    | { header?: { expirationTime?: string }; credentials?: { token?: string; sign?: string } }
    | undefined
  const token = ticket?.credentials?.token
  const firma = ticket?.credentials?.sign
  const vence = ticket?.header?.expirationTime
  if (!token || !firma || !vence) throw new ErrorArca('red', 'El ticket de acceso de ARCA vino incompleto.')
  return { token, firma, vence: new Date(vence) }
}

/**
 * El ticket vigente para un servicio: el guardado si le queda tiempo, o uno
 * nuevo.
 *
 * Si dos funciones lo renuevan a la vez, ARCA le da el ticket a la primera y
 * a la segunda le contesta `coe.alreadyAuthenticated`: la segunda relee el que
 * guardó la primera.
 */
export async function ticketVigente(
  base: SupabaseClient,
  config: ConfigArca,
  servicio = 'wsfe',
  ahora = new Date()
): Promise<TicketDeAcceso> {
  const leer = async () => {
    const { data, error } = await base
      .from('arca_ticket_de_acceso')
      .select('token, firma, vence')
      .eq('servicio', servicio)
      .eq('ambiente', config.ambiente)
      .maybeSingle()
    if (error) throw new Error(`No se pudo leer el ticket de ARCA: ${error.message}`)
    return data ? { token: data.token, firma: data.firma, vence: new Date(data.vence) } : null
  }

  const guardado = await leer()
  if (guardado && guardado.vence.getTime() - ahora.getTime() > MARGEN_MS) return guardado

  let nuevo: TicketDeAcceso
  try {
    nuevo = await pedirTicket(config, servicio)
  } catch (e) {
    if (e instanceof ErrorArca && e.codigo === 'coe.alreadyAuthenticated') {
      // El otro pedido puede estar todavía guardándolo: se espera un poco.
      for (let intento = 0; intento < ESPERAS_DEL_OTRO; intento++) {
        const deOtro = await leer()
        if (deOtro && deOtro.vence > ahora && deOtro.token !== guardado?.token) return deOtro
        await new Promise((ok) => setTimeout(ok, 500))
      }
      // El que había guardado sigue sirviendo si no venció: mejor que nada.
      if (guardado && guardado.vence > ahora) return guardado
      // ARCA dice que hay uno vigente y acá no está: se perdió (una base
      // restaurada, otra instalación con el mismo certificado). Hay que esperar
      // a que venza; se dice así en vez de insistir.
      throw new ErrorArca(
        'arca',
        'ARCA ya dio un permiso que esta instalación no tiene guardado. Se puede volver a pedir cuando venza (hasta 12 horas).',
        e.codigo
      )
    }
    throw e
  }

  const { error } = await base.from('arca_ticket_de_acceso').upsert({
    servicio,
    ambiente: config.ambiente,
    token: nuevo.token,
    firma: nuevo.firma,
    vence: nuevo.vence.toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(`No se pudo guardar el ticket de ARCA: ${error.message}`)
  return nuevo
}
