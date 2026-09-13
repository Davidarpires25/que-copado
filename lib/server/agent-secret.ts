import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Compara el secreto recibido con el esperado en tiempo constante.
 *
 * Se comparan los SHA-256 y no los valores crudos por dos razones: hashear deja
 * ambos buffers en 32 bytes, que es lo que `timingSafeEqual` exige —con
 * longitudes distintas lanza en vez de devolver false—, y de paso la duracion
 * de la comparacion deja de depender del largo del secreto recibido.
 *
 * Vive en su propio modulo, sin imports del proyecto, para que el script de
 * verificacion pueda cargarlo con node: el alias `@/` no lo resuelve.
 */
export function agentSecretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!expected) return false
  if (provided === null) return false

  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()

  return timingSafeEqual(a, b)
}
