import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AppRole, Profile } from '@/lib/types/database'

/**
 * Perfil del empleado logueado.
 *
 * Se cachea por request con React.cache(), igual que getAuthUser(): varias
 * server actions llamadas en paralelo comparten el resultado sin ir de nuevo a
 * la base.
 *
 * Devuelve null si no hay sesion, si el usuario todavia no tiene perfil o si
 * esta dado de baja (is_active = false).
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data as Profile
})

export async function getCurrentRole(): Promise<AppRole | null> {
  return (await getCurrentProfile())?.role ?? null
}

export async function hasRole(...roles: AppRole[]): Promise<boolean> {
  const role = await getCurrentRole()
  return role !== null && roles.includes(role)
}

/**
 * Guarda para server actions que mutan.
 *
 * Es la SEGUNDA linea de defensa, no la primera: la que realmente protege son
 * las policies de RLS, porque se aplican aunque alguien llame la accion por
 * fuera de la interfaz. Esto existe para cortar antes y devolver un error
 * legible en vez de una fila vacia.
 *
 *   const denied = await requireRole('admin')
 *   if (denied) return denied
 */
export async function requireRole(
  ...roles: AppRole[]
): Promise<{ error: string } | null> {
  const role = await getCurrentRole()
  if (role === null) return { error: 'No autenticado' }
  if (!roles.includes(role)) return { error: 'No tenés permiso para esta acción' }
  return null
}
