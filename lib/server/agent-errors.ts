/**
 * Errores del contrato con el agente de WhatsApp.
 *
 * El agente ramifica su conversacion sobre el `code`, no sobre el texto. Por eso
 * el conjunto es cerrado: agregar un codigo es cambiar el contrato, y el texto
 * puede reescribirse sin romper nada del otro lado.
 */

export const AGENT_ERROR_CODES = [
  'unauthorized',
  'invalid_request',
  'business_closed',
  'business_paused',
  'out_of_coverage',
  'item_unavailable',
  'insufficient_stock',
  'rate_limited',
  'service_unavailable',
  'internal_error',
] as const

export type AgentErrorCode = (typeof AGENT_ERROR_CODES)[number]

/** Estado HTTP que le corresponde a cada codigo. */
const STATUS_BY_CODE: Record<AgentErrorCode, number> = {
  unauthorized: 401,
  invalid_request: 400,
  business_closed: 422,
  business_paused: 422,
  out_of_coverage: 422,
  item_unavailable: 409,
  insufficient_stock: 409,
  rate_limited: 429,
  service_unavailable: 503,
  internal_error: 500,
}

export interface AgentErrorBody {
  error: {
    code: AgentErrorCode
    message: string
    details?: unknown
  }
}

/**
 * Construye la respuesta de error del contrato.
 *
 * `status` solo se pasa cuando el mismo codigo necesita otro estado, como la
 * clave de idempotencia reutilizada con un cuerpo distinto: es
 * `invalid_request` pero responde 409, no 400.
 */
export function agentError(
  code: AgentErrorCode,
  message: string,
  details?: unknown,
  status?: number
): Response {
  const body: AgentErrorBody = { error: { code, message } }
  if (details !== undefined) body.error.details = details

  return Response.json(body, { status: status ?? STATUS_BY_CODE[code] })
}

/**
 * Error generico para excepciones no contempladas.
 *
 * Nunca propaga el error original: un stack trace o un nombre de tabla en la
 * respuesta es informacion que el otro lado no necesita y que no deberia salir
 * del servidor.
 */
export function agentInternalError(): Response {
  return agentError('internal_error', 'Error interno. Intentá de nuevo en unos minutos.')
}

export function statusForCode(code: AgentErrorCode): number {
  return STATUS_BY_CODE[code]
}
