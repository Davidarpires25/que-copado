/**
 * Log de errores solo en desarrollo.
 * Reemplaza el patrón repetido:
 *   if (process.env.NODE_ENV === 'development') console.error(...)
 */
export function devError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(context, error)
  }
}
