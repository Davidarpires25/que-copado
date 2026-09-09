'use server'

import { getCurrentProfile } from '@/lib/server/profile'
import { APP_ROLE_LABELS, type AppRole } from '@/lib/types/database'

export interface CurrentUserInfo {
  name: string
  roleLabel: string
  role: AppRole | null
}

/**
 * Datos del empleado logueado para mostrar en el sidebar.
 *
 * Devuelve null cuando todavia no hay perfil —por ejemplo antes de aplicar la
 * migracion 016— para que quien llama use sus valores por defecto en vez de
 * romperse.
 */
export async function getCurrentUserInfo(): Promise<CurrentUserInfo | null> {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return null

    return {
      name: profile.full_name || 'Sin nombre',
      roleLabel: APP_ROLE_LABELS[profile.role] ?? profile.role,
      role: profile.role,
    }
  } catch {
    // La tabla profiles todavia no existe: el sidebar sigue con su placeholder.
    return null
  }
}
