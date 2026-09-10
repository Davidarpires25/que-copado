'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/server/profile'
import { devError } from '@/lib/server/logger'
import { PERMISSION_KEYS } from '@/lib/constants/permissions'
import type { RoleWithPermissions } from '@/lib/types/database'

const CLAVE_VALIDA = /^[a-z][a-z0-9_]{1,30}$/

/** Deriva una clave a partir del nombre: "Mozo de salón" -> "mozo_de_salon". */
function claveDesdeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 31)
}

/** Descarta claves que el codigo no conoce: el catalogo lo define la app. */
function soloPermisosConocidos(permisos: string[]): string[] {
  const validas = new Set<string>(PERMISSION_KEYS)
  return [...new Set(permisos)].filter((p) => validas.has(p))
}

// ─── Lectura ─────────────────────────────────────────────────────────────────

export async function listRoles(): Promise<{
  data: RoleWithPermissions[] | null
  error: string | null
}> {
  const denied = await requirePermission('users.view')
  if (denied) return { data: null, ...denied }

  try {
    const supabase = await createAdminClient()

    const [rolesRes, permsRes, profilesRes] = await Promise.all([
      supabase.from('roles').select('*').order('sort_order').order('name'),
      supabase.from('role_permissions').select('role_key, permission'),
      supabase.from('profiles').select('role').eq('is_active', true),
    ])

    if (rolesRes.error) {
      devError('Error listando roles:', rolesRes.error)
      return { data: null, error: 'No se pudieron cargar los roles' }
    }

    const porRol = new Map<string, string[]>()
    for (const row of permsRes.data ?? []) {
      const lista = porRol.get(row.role_key) ?? []
      lista.push(row.permission)
      porRol.set(row.role_key, lista)
    }

    const miembros = new Map<string, number>()
    for (const row of profilesRes.data ?? []) {
      miembros.set(row.role, (miembros.get(row.role) ?? 0) + 1)
    }

    const data: RoleWithPermissions[] = (rolesRes.data ?? []).map((r) => ({
      ...r,
      permissions: porRol.get(r.key) ?? [],
      member_count: miembros.get(r.key) ?? 0,
    }))

    return { data, error: null }
  } catch (error) {
    devError('Error inesperado listando roles:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

// ─── Alta ────────────────────────────────────────────────────────────────────

export async function createRole(input: {
  name: string
  description?: string
  permissions: string[]
}): Promise<{ data: { key: string } | null; error: string | null }> {
  const denied = await requirePermission('roles.manage')
  if (denied) return { data: null, ...denied }

  const name = input.name.trim()
  if (!name) return { data: null, error: 'El nombre es requerido' }

  const key = claveDesdeNombre(name)
  if (!CLAVE_VALIDA.test(key)) {
    return { data: null, error: 'El nombre tiene que empezar con una letra y tener al menos 2 caracteres' }
  }

  const permisos = soloPermisosConocidos(input.permissions)

  try {
    const supabase = await createAdminClient()

    const { error: insertError } = await supabase.from('roles').insert({
      key,
      name,
      description: input.description?.trim() || null,
      is_system: false,
      sort_order: 100,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return { data: null, error: 'Ya existe un rol con ese nombre' }
      }
      devError('Error creando rol:', insertError)
      return { data: null, error: 'No se pudo crear el rol' }
    }

    if (permisos.length > 0) {
      const { error: permError } = await supabase
        .from('role_permissions')
        .insert(permisos.map((permission) => ({ role_key: key, permission })))

      if (permError) devError('Error asignando permisos al rol nuevo:', permError)
    }

    revalidatePath('/admin/empleados')
    return { data: { key }, error: null }
  } catch (error) {
    devError('Error inesperado creando rol:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

// ─── Edición ─────────────────────────────────────────────────────────────────

export async function updateRole(
  key: string,
  input: { name?: string; description?: string; permissions?: string[] }
): Promise<{ error: string | null }> {
  const denied = await requirePermission('roles.manage')
  if (denied) return denied

  // `admin` es la salida de emergencia: si se le pudieran sacar permisos,
  // alcanzaria un clic para dejar el panel sin nadie que pueda administrarlo.
  if (key === 'admin') {
    return { error: 'El rol Administrador no se puede modificar' }
  }

  try {
    const supabase = await createAdminClient()

    if (input.name !== undefined || input.description !== undefined) {
      const patch: Record<string, string | null> = {}
      if (input.name !== undefined) {
        const name = input.name.trim()
        if (!name) return { error: 'El nombre es requerido' }
        patch.name = name
      }
      if (input.description !== undefined) {
        patch.description = input.description.trim() || null
      }

      const { error } = await supabase.from('roles').update(patch).eq('key', key)
      if (error) {
        devError('Error actualizando rol:', error)
        return { error: 'No se pudo actualizar el rol' }
      }
    }

    if (input.permissions) {
      const permisos = soloPermisosConocidos(input.permissions)

      // Reemplazo completo: borrar y volver a insertar es mas simple que
      // calcular el diff, y son pocas filas.
      const { error: delError } = await supabase
        .from('role_permissions').delete().eq('role_key', key)
      if (delError) {
        devError('Error limpiando permisos:', delError)
        return { error: 'No se pudieron actualizar los permisos' }
      }

      if (permisos.length > 0) {
        const { error: insError } = await supabase
          .from('role_permissions')
          .insert(permisos.map((permission) => ({ role_key: key, permission })))
        if (insError) {
          devError('Error asignando permisos:', insError)
          return { error: 'No se pudieron actualizar los permisos' }
        }
      }
    }

    revalidatePath('/admin/empleados')
    return { error: null }
  } catch (error) {
    devError('Error inesperado actualizando rol:', error)
    return { error: 'Error inesperado' }
  }
}

// ─── Baja ────────────────────────────────────────────────────────────────────

export async function deleteRole(key: string): Promise<{ error: string | null }> {
  const denied = await requirePermission('roles.manage')
  if (denied) return denied

  try {
    const supabase = await createAdminClient()

    const { data: role } = await supabase
      .from('roles').select('is_system').eq('key', key).maybeSingle()

    if (!role) return { error: 'El rol no existe' }
    if (role.is_system) return { error: 'Los roles del sistema no se pueden eliminar' }

    // La FK de profiles.role no tiene ON DELETE, asi que borrar un rol en uso
    // fallaria con un error de base. Mejor decirlo en castellano.
    const { data: enUso } = await supabase
      .from('profiles').select('id').eq('role', key).limit(1)

    if (enUso && enUso.length > 0) {
      return { error: 'Hay empleados con este rol. Cambiáselos antes de eliminarlo.' }
    }

    const { error } = await supabase.from('roles').delete().eq('key', key)
    if (error) {
      devError('Error eliminando rol:', error)
      return { error: 'No se pudo eliminar el rol' }
    }

    revalidatePath('/admin/empleados')
    return { error: null }
  } catch (error) {
    devError('Error inesperado eliminando rol:', error)
    return { error: 'Error inesperado' }
  }
}
