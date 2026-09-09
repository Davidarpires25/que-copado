/**
 * Parseo de montos en pesos argentinos escritos a mano.
 *
 * `formatPrice()` muestra los importes con `Intl.NumberFormat('es-AR')`, o sea
 * con el punto como separador de miles: `$39.400`. `parseFloat` interpreta ese
 * mismo punto como separador decimal, asi que leer un input con `parseFloat`
 * convierte "39.400" en 39,4 — mil veces menos.
 *
 * En el cierre de caja eso significa asentar un arqueo con un faltante enorme,
 * sin forma de revertirlo desde la interfaz. Estas funciones son el inverso
 * exacto de `formatPrice` y deben usarse en todo input de dinero.
 */

/**
 * Convierte texto escrito por una persona a un numero.
 *
 * Convencion es-AR: el punto separa miles, la coma separa decimales.
 *
 *   "39400"      -> 39400
 *   "39.400"     -> 39400
 *   "1.500.000"  -> 1500000
 *   "39.400,50"  -> 39400.5
 *   "39,50"      -> 39.5
 *   "$ 39.400"   -> 39400
 *   "1500.50"    -> 1500.5   (un punto con menos de 3 digitos detras es decimal)
 *   ""           -> null
 *   "abc"        -> null
 *
 * Devuelve `null` cuando no hay un numero interpretable, para que quien llama
 * distinga "no escribio nada" de "escribio cero".
 */
export function parseARS(input: string | number | null | undefined): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  if (input == null) return null

  // Nos quedamos solo con digitos, separadores y un eventual signo menos.
  const cleaned = input.replace(/[^\d.,-]/g, '').trim()
  if (!cleaned || !/\d/.test(cleaned)) return null

  const negative = cleaned.startsWith('-')
  const digits = cleaned.replace(/-/g, '')

  const lastDot = digits.lastIndexOf('.')
  const lastComma = digits.lastIndexOf(',')

  let normalized: string

  if (lastComma > -1 && lastDot > -1) {
    // Ambos presentes: el ultimo que aparece es el decimal.
    normalized = lastComma > lastDot
      ? digits.replace(/\./g, '').replace(',', '.')
      : digits.replace(/,/g, '')
  } else if (lastComma > -1) {
    // Solo coma: siempre decimal en es-AR.
    normalized = digits.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > -1) {
    // Solo punto. Es separador de miles si hay mas de uno, o si detras hay
    // exactamente 3 digitos ("39.400"). Si no, lo tomamos como decimal
    // ("1500.50"), que es lo que escribe quien viene de un teclado en ingles.
    const groups = digits.split('.')
    const isThousands = groups.length > 2 || groups[groups.length - 1].length === 3
    normalized = isThousands ? digits.replace(/\./g, '') : digits
  } else {
    normalized = digits
  }

  const value = Number(normalized)
  if (!Number.isFinite(value)) return null

  return negative ? -value : value
}

/**
 * Formatea un monto para mostrarlo dentro de un input mientras se escribe:
 * separadores de miles, sin simbolo de moneda.
 *
 *   39400 -> "39.400"
 */
export function formatARSInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ''
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)
}
