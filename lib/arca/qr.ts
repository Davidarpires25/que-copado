/**
 * El texto del código QR de un comprobante (RG 4892).
 *
 * Especificación de ARCA, versión 1 (ver "Datos verificados" en design.md):
 * la URL `https://www.arca.gob.ar/fe/qr/?p=` seguida de un JSON con los datos
 * del comprobante en base64. Los números van como números, no como texto.
 */

export const URL_QR = 'https://www.arca.gob.ar/fe/qr/'

export interface DatosQr {
  /** `yyyy-mm-dd` */
  fecha: string
  cuit: string
  puntoVenta: number
  tipo: number
  numero: number
  total: number
  docTipo: number
  docNro: number
  cae: string
}

export function textoDelQr(d: DatosQr): string {
  const json = {
    ver: 1,
    fecha: d.fecha,
    cuit: Number(d.cuit),
    ptoVta: d.puntoVenta,
    tipoCmp: d.tipo,
    nroCmp: d.numero,
    importe: Math.round(d.total * 100) / 100,
    moneda: 'PES',
    ctz: 1,
    // "De corresponder": sin receptor identificado (99 / 0) no van.
    ...(d.docTipo !== 99 && d.docNro ? { tipoDocRec: d.docTipo, nroDocRec: d.docNro } : {}),
    tipoCodAut: 'E',
    codAut: Number(d.cae),
  }
  return `${URL_QR}?p=${Buffer.from(JSON.stringify(json), 'utf8').toString('base64')}`
}
