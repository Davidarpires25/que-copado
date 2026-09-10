import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { devError } from '@/lib/server/logger'
import type { AppRole, Profile } from '@/lib/types/database'
import type { PermissionKey } from '@/lib/constants/permissions'

/**
 * Estado de permisos del request actual.
 *
 * `not-installed` existe por una razon operativa: si este codigo se despliega
 * antes de correr las migraciones, las tablas no existen y cualquier guarda
 * bloquearia el panel entero. En ese caso las guardas dejan pasar, o sea que el
 * comportamiento es el de antes de que hubiera roles.
 */
type PermissionState =
  | { kind: 'not-installed' }
  | { kind: 'anonymous' }
  | { kind: 'ready'; profile: Profile; permissions: Set<string>; roleName: string }

/** Codigo de Postgres para "relation does not exist". */
const UNDEFINED_TABLE = '42P01'

const getPermissionState = cache(async (): Promise<PermissionState> => {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { kind: 'anonymous' }

  const { data, error } = await supabase
    .from('profiles')
    .select('*, roles ( name, key )')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    if (error.code === UNDEFINED_TABLE) return { kind: 'not-installed' }
    devError('Error leyendo el perfil del usuario:', error)
    return { kind: 'anonymous' }
  }
  if (!data) return { kind: 'anonymous' }

  const profile = data as unknown as Profile & { roles: { name: string; key: string } | null }

  const { data: perms, error: permError } = await supabase
    .from('role_permissions')
    .select('permission')
    .eq('role_key', profile.role)

  if (permError) {
    if (permError.code === UNDEFINED_TABLE) return { kind: 'not-installed' }
    devError('Error leyendo los permisos del rol:', permError)
    return { kind: 'anonymous' }
  }

  return {
    kind: 'ready',
    profile,
    permissions: new Set((perms ?? []).map((p) => p.permission)),
    roleName: profile.roles?.name ?? profile.role,
  }
})

export async function getCurrentProfile(): Promise<Profile | null> {
  const state = await getPermissionState()
  return state.kind === 'ready' ? state.profile : null
}

export async function getCurrentRole(): Promise<AppRole | null> {
  return (await getCurrentProfile())?.role ?? null
}

/** Nombre legible del rol, para mostrar en el sidebar. */
export async function getCurrentRoleName(): Promise<string | null> {
  const state = await getPermissionState()
  return state.kind === 'ready' ? state.roleName : null
}

/** Todos los permisos del usuario. Vacio si no hay sesion. */
export async function getCurrentPermissions(): Promise<string[]> {
  const state = await getPermissionState()
  return state.kind === 'ready' ? [...state.permissions] : []
}

/**
 * ¿El usuario tiene este permiso?
 *
 * Con las migraciones sin aplicar devuelve true, para no dejar el panel
 * bloqueado por un problema de despliegue.
 */
export async function can(permission: PermissionKey): Promise<boolean> {
  const state = await getPermissionState()
  if (state.kind === 'not-installed') return true
  if (state.kind !== 'ready') return false
  return state.permissions.has(permission)
}

/**
 * Guarda para server actions.
 *
 * Es la SEGUNDA linea de defensa: la que realmente protege son las policies de
 * RLS, porque se aplican aunque alguien llame la accion por fuera de la
 * interfaz. Esto corta antes y devuelve un error legible.
 *
 *   const denied = await requirePermission('users.manage')
 *   if (denied) return { data: null, ...denied }
 */
export async function requirePermission(
  permission: PermissionKey
): Promise<{ error: string } | null> {
  const state = await getPermissionState()
  if (state.kind === 'not-installed') return null
  if (state.kind !== 'ready') return { error: 'No autenticado' }
  if (!state.permissions.has(permission)) {
    return { error: 'No tenés permiso para esta acción' }
  }
  return null
}
