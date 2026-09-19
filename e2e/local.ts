/**
 * Lo que hace falta para preparar el stack local antes de un test de navegador.
 *
 * Todo pasa por la API de Supabase local con la clave elevada: es el unico
 * lugar del proyecto donde usarla esta bien, porque la base es descartable y
 * se puede rehacer entera con `npm run db:reset`.
 */

export const SUPABASE = 'http://127.0.0.1:54321'

export const SERVICE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

export const USUARIO = { email: 'prueba@local.test', password: 'prueba1234' }

const cabeceras = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  'Content-Type': 'application/json',
}

/** Una llamada a PostgREST con la clave elevada. */
export async function rest(ruta: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE}/rest/v1/${ruta}`, {
    ...init,
    headers: { ...cabeceras, Prefer: 'return=representation', ...(init.headers ?? {}) },
  })
  const texto = await r.text()
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${ruta} -> ${r.status} ${texto}`)
  return texto ? JSON.parse(texto) : null
}

/**
 * El usuario con el que se entra al admin, exista o no de antes.
 *
 * La base local se resetea seguido, asi que el test no puede dar por sentado
 * que quedo alguien de una corrida anterior.
 */
export async function asegurarUsuario() {
  const lista = await fetch(`${SUPABASE}/auth/v1/admin/users`, { headers: cabeceras })
    .then((r) => r.json())
    .catch(() => ({ users: [] }))

  const existente = (lista.users ?? []).find(
    (u: { email?: string }) => u.email === USUARIO.email
  )

  if (existente) {
    await fetch(`${SUPABASE}/auth/v1/admin/users/${existente.id}`, {
      method: 'PUT',
      headers: cabeceras,
      body: JSON.stringify({ password: USUARIO.password, email_confirm: true }),
    })
    return
  }

  await fetch(`${SUPABASE}/auth/v1/admin/users`, {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify({ ...USUARIO, email_confirm: true }),
  })
}
