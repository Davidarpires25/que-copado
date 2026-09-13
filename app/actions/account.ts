'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/env'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'

/**
 * Acciones sobre la cuenta del usuario logueado.
 *
 * A diferencia de `employees.ts`, ninguna pide `requirePermission`: son cambios
 * sobre uno mismo y tienen que funcionar con cualquier rol, incluso los que no
 * ven Configuracion. La guarda es otra: el id SIEMPRE sale de `getAuthUser()` y
 * nunca de un parametro, asi que no hay forma de editar la cuenta de otro.
 *
 * El cambio de email se aplica al instante con `email_confirm: true`, igual que
 * en `createEmployee`: este proyecto no manda mails. El resguardo contra el
 * tipeo esta en el formulario (se escribe dos veces) y en que el admin puede
 * corregirlo desde /admin/empleados.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8

/** Mensaje unico para no filtrar si fallo el usuario o la contraseña. */
const CREDENCIAL_INVALIDA = 'La contraseña actual no es correcta'

interface UsuarioActual {
  id: string
  email: string
}

/** Usuario logueado con su email, que `getAuthUser` no trae (solo devuelve el id). */
async function getUsuarioActual(): Promise<UsuarioActual | null> {
  const user = await getAuthUser()
  if (!user) return null

  const service = createServiceRoleClient()
  const { data, error } = await service.auth.admin.getUserById(user.id)
  if (error || !data.user?.email) return null

  return { id: user.id, email: data.user.email }
}

/**
 * Confirma que quien esta del otro lado sabe la contraseña, no solo que tiene
 * la pestaña abierta.
 *
 * Usa un cliente descartable con `persistSession: false`: si se hiciera el
 * `signInWithPassword` sobre `createAdminClient()` —que esta atado a las
 * cookies del request— se reescribiria la sesion en curso.
 */
async function verificarPassword(email: string, password: string): Promise<boolean> {
  if (!password) return false

  const efimero = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await efimero.auth.signInWithPassword({ email, password })
  return !error
}

// ─── Nombre ──────────────────────────────────────────────────────────────────

export async function updateMyName(fullName: string): Promise<{ error: string | null }> {
  const user = await getAuthUser()
  if (!user) return { error: 'No autorizado' }

  const nombre = fullName.trim()
  if (!nombre) return { error: 'El nombre es requerido' }
  if (nombre.length > 80) return { error: 'El nombre es demasiado largo' }

  try {
    const service = createServiceRoleClient()
    // Solo `full_name`. Incluir `role` o `is_active` aca seria el agujero por
    // el que un cajero se haria admin a si mismo.
    const { error } = await service
      .from('profiles')
      .update({ full_name: nombre })
      .eq('id', user.id)

    if (error) {
      devError('Error actualizando el nombre:', error)
      return { error: 'No se pudo guardar el nombre' }
    }

    // El sidebar lee el perfil en el layout; sin esto sigue mostrando el viejo.
    revalidatePath('/admin', 'layout')
    return { error: null }
  } catch (error) {
    devError('Error inesperado actualizando el nombre:', error)
    return { error: 'Error inesperado' }
  }
}

// ─── Email ───────────────────────────────────────────────────────────────────

export async function updateMyEmail(
  newEmail: string,
  currentPassword: string
): Promise<{ error: string | null }> {
  const actual = await getUsuarioActual()
  if (!actual) return { error: 'No autorizado' }

  const email = newEmail.trim().toLowerCase()
  if (!EMAIL_REGEX.test(email)) return { error: 'El email no es válido' }
  if (email === actual.email.toLowerCase()) {
    return { error: 'Ese ya es tu email actual' }
  }

  if (!(await verificarPassword(actual.email, currentPassword))) {
    return { error: CREDENCIAL_INVALIDA }
  }

  try {
    const service = createServiceRoleClient()
    const { error } = await service.auth.admin.updateUserById(actual.id, {
      email,
      email_confirm: true,
    })

    if (error) {
      devError('Error cambiando el email:', error)
      const yaExiste = error.message?.toLowerCase().includes('already')
      return {
        error: yaExiste ? 'Ya existe una cuenta con ese email' : 'No se pudo cambiar el email',
      }
    }

    revalidatePath('/admin', 'layout')
    return { error: null }
  } catch (error) {
    devError('Error inesperado cambiando el email:', error)
    return { error: 'Error inesperado' }
  }
}

// ─── Contraseña ──────────────────────────────────────────────────────────────

export async function updateMyPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error: string | null }> {
  const actual = await getUsuarioActual()
  if (!actual) return { error: 'No autorizado' }

  if (newPassword.length < MIN_PASSWORD) {
    return { error: `La contraseña nueva necesita al menos ${MIN_PASSWORD} caracteres` }
  }
  if (newPassword === currentPassword) {
    return { error: 'La contraseña nueva tiene que ser distinta de la actual' }
  }

  if (!(await verificarPassword(actual.email, currentPassword))) {
    return { error: CREDENCIAL_INVALIDA }
  }

  try {
    const service = createServiceRoleClient()
    const { error } = await service.auth.admin.updateUserById(actual.id, {
      password: newPassword,
    })

    if (error) {
      devError('Error cambiando la contraseña:', error)
      // Supabase rechaza las que no cumplen su politica (largo, simbolos).
      return { error: error.message || 'No se pudo cambiar la contraseña' }
    }

    return { error: null }
  } catch (error) {
    devError('Error inesperado cambiando la contraseña:', error)
    return { error: 'Error inesperado' }
  }
}

// ─── Lectura ─────────────────────────────────────────────────────────────────

export interface MyAccount {
  fullName: string
  email: string
  roleLabel: string
}

/** Datos que muestra el formulario de /admin/mi-cuenta. */
export async function getMyAccount(): Promise<MyAccount | null> {
  const actual = await getUsuarioActual()
  if (!actual) return null

  try {
    const service = createServiceRoleClient()
    const { data } = await service
      .from('profiles')
      .select('full_name, role, roles ( name )')
      .eq('id', actual.id)
      .maybeSingle()

    const perfil = data as unknown as
      | { full_name: string; role: string; roles: { name: string } | null }
      | null

    return {
      fullName: perfil?.full_name ?? '',
      email: actual.email,
      roleLabel: perfil?.roles?.name ?? perfil?.role ?? '',
    }
  } catch (error) {
    devError('Error leyendo la cuenta:', error)
    return { fullName: '', email: actual.email, roleLabel: '' }
  }
}
