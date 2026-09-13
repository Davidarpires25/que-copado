import { agentSecretMatches } from '../lib/server/agent-secret.ts'
import { AGENT_ERROR_CODES, agentError, statusForCode } from '../lib/server/agent-errors.ts'

let fallos = 0
const chequear = (nombre: string, cond: boolean, extra = '') => {
  if (!cond) { fallos++; console.log(`  ✗ ${nombre} ${extra}`) }
  else console.log(`  ✓ ${nombre}`)
}

console.log('\n— Secreto compartido —')
chequear('el secreto correcto pasa',
  agentSecretMatches('un-secreto-largo', 'un-secreto-largo') === true)
chequear('un secreto incorrecto no pasa',
  agentSecretMatches('otro-secreto', 'un-secreto-largo') === false)
chequear('el header ausente no pasa',
  agentSecretMatches(null, 'un-secreto-largo') === false)
chequear('el header vacio no pasa',
  agentSecretMatches('', 'un-secreto-largo') === false)

console.log('\n— Secreto no configurado en el servidor —')
chequear('sin secreto esperado, nada pasa',
  agentSecretMatches('lo-que-sea', undefined) === false)
chequear('un esperado vacio tampoco autoriza',
  agentSecretMatches('', '') === false)

console.log('\n— Largos distintos no rompen la comparacion —')
// timingSafeEqual lanza si los buffers miden distinto. Hashear los iguala; si
// alguien saca el hash, esto deja de pasar y empieza a tirar excepcion.
let lanzo = false
try {
  agentSecretMatches('a', 'una-clave-mucho-mas-larga')
} catch {
  lanzo = true
}
chequear('comparar largos distintos devuelve false en vez de lanzar', !lanzo)

console.log('\n— Codigos de error —')
const esperados = [
  'unauthorized', 'invalid_request', 'business_closed', 'business_paused',
  'out_of_coverage', 'item_unavailable', 'insufficient_stock', 'rate_limited',
  'service_unavailable', 'internal_error',
]
chequear('el conjunto de codigos es exactamente el que fija la spec',
  JSON.stringify([...AGENT_ERROR_CODES].sort()) === JSON.stringify([...esperados].sort()),
  JSON.stringify(AGENT_ERROR_CODES))

chequear('unauthorized responde 401', statusForCode('unauthorized') === 401)
chequear('invalid_request responde 400', statusForCode('invalid_request') === 400)
chequear('out_of_coverage responde 422', statusForCode('out_of_coverage') === 422)
chequear('insufficient_stock responde 409', statusForCode('insufficient_stock') === 409)
chequear('rate_limited responde 429', statusForCode('rate_limited') === 429)
chequear('service_unavailable responde 503', statusForCode('service_unavailable') === 503)

console.log('\n— Forma del cuerpo de error —')
const res = agentError('insufficient_stock', 'Solo quedan 2 unidades.', {
  items: [{ product_id: 'abc', name: 'Doble cheddar', requested: 5, available: 2 }],
})
chequear('usa el estado del codigo', res.status === 409, String(res.status))
const cuerpo = await res.json()
chequear('el cuerpo anida todo bajo `error`',
  typeof cuerpo.error === 'object' && cuerpo.error !== null, JSON.stringify(cuerpo))
chequear('trae code, message y details',
  cuerpo.error.code === 'insufficient_stock' &&
  typeof cuerpo.error.message === 'string' &&
  Array.isArray(cuerpo.error.details?.items), JSON.stringify(cuerpo))

const sinDetalle = await agentError('unauthorized', 'Credenciales inválidas').json()
chequear('sin details, la clave no aparece',
  !('details' in sinDetalle.error), JSON.stringify(sinDetalle))

console.log('\n— Estado forzado —')
// La clave de idempotencia reutilizada con otro cuerpo es invalid_request pero
// responde 409, no 400.
chequear('un estado explicito gana sobre el del codigo',
  agentError('invalid_request', 'Clave ya usada con otro cuerpo.', undefined, 409).status === 409)

console.log(fallos === 0 ? '\nTodo bien.\n' : `\n${fallos} fallo(s).\n`)
process.exit(fallos === 0 ? 0 : 1)
