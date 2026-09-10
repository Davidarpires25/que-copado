/**
 * Telefonos argentinos.
 *
 * El checkout solo exigia que el campo no estuviera vacio (use-checkout.ts:164),
 * asi que entraban pedidos con "asdasd" de telefono, y el servidor los escribia
 * tal cual. Para un negocio que confirma y entrega por WhatsApp eso deja el
 * pedido huerfano: no se puede avisar que salio ni preguntar por el timbre.
 */

/** Solo los digitos. */
export function digitosTelefono(raw: string): string {
  return (raw ?? '').replace(/\D/g, '')
}

/**
 * Un telefono plausible.
 *
 * Deliberadamente permisivo con el formato —la gente escribe "0383 15 412-3456",
 * "+54 9 383 4123456" o "3834123456"— y estricto con lo que no es un telefono.
 * Rechazar a un cliente real por como separa los numeros es peor que el problema
 * que estamos resolviendo.
 */
export function esTelefonoValido(raw: string): boolean {
  const s = (raw ?? '').trim()
  if (!s) return false
  if (/[a-zA-Z]/.test(s)) return false
  const d = digitosTelefono(s)
  return d.length >= 8 && d.length <= 15
}

/**
 * Numero listo para wa.me.
 *
 * Sin codigo de pais el link no abre ninguna conversacion: el panel armaba
 * `wa.me/42424254`, que no lleva a ningun lado. Un movil argentino se marca
 * 54 9 + los diez digitos, que es el mismo formato que ya usa
 * NEXT_PUBLIC_WHATSAPP_NUMBER (5491154997700).
 */
export function telefonoWhatsApp(raw: string): string | null {
  const d = digitosTelefono(raw)
  if (d.length < 8) return null
  if (d.startsWith('54')) return d
  const sinCero = d.replace(/^0/, '')
  return sinCero.length === 10 ? `549${sinCero}` : `54${sinCero}`
}
