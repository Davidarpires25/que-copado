import { agentSecretMatches } from '@/lib/server/agent-secret'
import { agentError } from '@/lib/server/agent-errors'

export { agentSecretMatches }

export const AGENT_SECRET_HEADER = 'x-agent-secret'

/**
 * Guarda de todos los endpoints bajo `/api/agent/`.
 *
 * Devuelve `null` cuando el request esta autorizado, o la respuesta de error que
 * el handler debe retornar tal cual.
 */
export function requireAgentSecret(request: Request): Response | null {
  const expected = process.env.AGENT_API_SECRET

  // Sin secreto configurado el endpoint no puede autenticar a nadie. Tratarlo
  // como "todo pasa" convertiria un despliegue mal configurado en una puerta
  // abierta, asi que se cierra el servicio.
  if (!expected) {
    return agentError(
      'service_unavailable',
      'El servicio no está disponible en este momento.'
    )
  }

  const provided = request.headers.get(AGENT_SECRET_HEADER)

  if (!agentSecretMatches(provided, expected)) {
    // El mismo mensaje para header ausente y para secreto incorrecto: distinguirlos
    // le confirmaria a quien prueba que el endpoint existe y que le falta un header.
    return agentError('unauthorized', 'Credenciales inválidas')
  }

  return null
}
