import * as Sentry from '@sentry/nextjs'

/**
 * En desarrollo: imprime en consola.
 * En producción: envía a Sentry con contexto para debugging.
 */
export function devError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(context, error)
  } else {
    Sentry.captureException(error, { extra: { context } })
  }
}
