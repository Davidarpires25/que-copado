import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { devError } from '@/lib/server/logger'
import type { AppRole, Profile } from '@/lib/types/database'

/**
 * Estado de roles del request actual.
 *
 * `not-installed` existe por una razon operativa concreta: si este codigo se
 * despliega antes de correr la migracion 016, la tabla `profiles` no existe y
 * cualquier guarda que pida un rol bloquearia el panel entero. En ese caso las
 * guardas dejan pasar, o sea que el comportamiento es exactamente el de hoy.
 * Apenas la migracion corre, empiezan a exigir de verdad.
 */
type RoleState =
  | { kind: 'not-installed' }
  | { kind: 'anonymous' }
  | { kind: 'ready'; profile: Profile }

/** Codigo de Postgres para "relation does not exist". */
const UNDEFINED_TABLE = '42P01'

const getRoleState = cache(async (): Promise<RoleState> => {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { kind: 'anonymous' }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    if (error.code === UNDEFINED_TABLE) return { kind: 'not-installed' }
    devError('Error leyendo el perfil del usuario:', error)
    return { kind: 'anonymous' }
  }

  if (!data) return { kind: 'anonymous' }
  return { kind: 'ready', profile: data as Profile }
})

/**
 * Perfil del empleado logueado, o null si no hay sesion, no tiene perfil o
 * esta dado de baja. Cacheado por request.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const state = await getRoleState()
  return state.kind === 'ready' ? state.profile : null
}

export async function getCurrentRole(): Promise<AppRole | null> {
  return (await getCurrentProfile())?.role ?? null
}

export async function hasRole(...roles: AppRole[]): Promise<boolean> {
  const state = await getRoleState()
  if (state.kind === 'not-installed') return true
  if (state.kind !== 'ready') return false
  return roles.includes(state.profile.role)
}

/**
 * Guarda para server actions.
 *
 * Es la SEGUNDA linea de defensa, no la primera: la que realmente protege son
 * las policies de RLS, porque se aplican aunque alguien llame la accion por
 * fuera de la interfaz. Esto corta antes y devuelve un error legible en vez de
 * una lista vacia.
 *
 *   const denied = await requireRole('admin')
 *   if (denied) return { data: null, ...denied }
 */
export async function requireRole(
  ...roles: AppRole[]
): Promise<{ error: string } | null> {
  const state = await getRoleState()

  // Roles todavia no instalados: no bloquear. Ver el comentario de RoleState.
  if (state.kind === 'not-installed') return null

  if (state.kind !== 'ready') return { error: 'No autenticado' }
  if (!roles.includes(state.profile.role)) {
    return { error: 'No tenés permiso para esta acción' }
  }
  return null
}
