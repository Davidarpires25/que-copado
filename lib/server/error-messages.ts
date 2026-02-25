/**
 * Maps common Supabase/Postgres error codes and patterns to user-friendly messages in Spanish.
 * Use `friendlyError(error)` in server actions to return clear, actionable messages.
 */

const ERROR_MAP: Array<{ match: (msg: string, code?: string) => boolean; message: string }> = [
  // Duplicate key (unique constraint)
  {
    match: (_msg, code) => code === '23505',
    message: 'Ya existe un registro con esos datos. Verifica que no este duplicado.',
  },
  // Foreign key violation (referenced by other records)
  {
    match: (_msg, code) => code === '23503',
    message: 'No se puede eliminar porque esta siendo usado en otros registros.',
  },
  // Not null violation
  {
    match: (_msg, code) => code === '23502',
    message: 'Faltan campos obligatorios. Completa todos los datos requeridos.',
  },
  // Check constraint violation
  {
    match: (_msg, code) => code === '23514',
    message: 'Uno de los valores ingresados no es valido.',
  },
  // RLS policy violation
  {
    match: (msg) => msg.toLowerCase().includes('rls') || msg.toLowerCase().includes('policy'),
    message: 'No tenes permisos para realizar esta accion.',
  },
  // Row not found
  {
    match: (msg) => msg.includes('PGRST116') || msg.includes('0 rows'),
    message: 'El registro no fue encontrado. Puede haber sido eliminado.',
  },
  // Timeout
  {
    match: (msg) => msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out'),
    message: 'La operacion tardo demasiado. Intenta de nuevo.',
  },
  // Network / connection errors
  {
    match: (msg) =>
      msg.toLowerCase().includes('fetch') ||
      msg.toLowerCase().includes('network') ||
      msg.toLowerCase().includes('econnrefused'),
    message: 'Error de conexion. Verifica tu internet e intenta de nuevo.',
  },
]

/**
 * Converts a Supabase/Postgres error into a user-friendly Spanish message.
 * If the error message is already user-friendly (set manually in server actions), it passes through.
 *
 * @param error - The error object from Supabase, or a string message
 * @returns A user-friendly error string
 */
export function friendlyError(error: { message: string; code?: string } | string): string {
  const msg = typeof error === 'string' ? error : error.message
  const code = typeof error === 'string' ? undefined : error.code

  // Check against known patterns
  for (const entry of ERROR_MAP) {
    if (entry.match(msg, code)) {
      return entry.message
    }
  }

  // If the message looks user-friendly already (starts with capital, no technical jargon), pass through
  if (msg && !msg.includes('PGRST') && !msg.includes('ERROR:') && !msg.startsWith('{')) {
    return msg
  }

  // Fallback for truly unknown errors
  return 'Ocurrio un error inesperado. Intenta de nuevo.'
}

/**
 * Wraps a Supabase error into the standard server action return format.
 * Logs the original error for debugging while returning a friendly message.
 */
export function devError(error: { message: string; code?: string } | string): { data: null; error: string } {
  const original = typeof error === 'string' ? error : `[${error.code}] ${error.message}`
  if (process.env.NODE_ENV === 'development') {
    console.error('[Server Action Error]', original)
  }
  return { data: null, error: friendlyError(error) }
}
