'use server'

import {
  getCurrentProfile, getCurrentRoleName, getCurrentPermissions,
} from '@/lib/server/profile'

export interface CurrentUserInfo {
  name: string
  /** Nombre legible del rol, ya resuelto desde la tabla `roles`. */
  roleLabel: string
  role: string | null
  /** Permisos del rol. El sidebar filtra con esto. */
  permissions: string[]
}

/**
 * Datos del empleado logueado para el sidebar.
 *
 * Devuelve null cuando todavia no hay perfil —por ejemplo antes de aplicar las
 * migraciones— para que quien llama use sus valores por defecto en vez de
 * romperse.
 */
export async function getCurrentUserInfo(): Promise<CurrentUserInfo | null> {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return null

    const [roleLabel, permissions] = await Promise.all([
      getCurrentRoleName(),
      getCurrentPermissions(),
    ])

    return {
      name: profile.full_name || 'Sin nombre',
      roleLabel: roleLabel ?? profile.role,
      role: profile.role,
      permissions,
    }
  } catch {
    // Las tablas de roles todavia no existen: el sidebar usa su placeholder.
    return null
  }
}
