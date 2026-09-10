'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createServiceRoleClient } from '@/lib/supabase/admin'
import { getCurrentProfile, requireRole } from '@/lib/server/profile'
import { devError } from '@/lib/server/logger'
import type { AppRole, Profile } from '@/lib/types/database'

export interface Employee extends Profile {
  email: string
  last_sign_in_at: string | null
}

const VALID_ROLES: AppRole[] = ['admin', 'cajero', 'cocina']

function isValidRole(value: string): value is AppRole {
  return (VALID_ROLES as string[]).includes(value)
}

/**
 * Contraseña temporal para dictarle al empleado una vez.
 *
 * Dos restricciones que se pelean entre si:
 *
 * - Se dicta en voz alta, asi que no lleva caracteres ambiguos (0/O, 1/l/I) ni
 *   simbolos raros de nombrar. Los que se usan se dicen facil: "signo de
 *   admiracion", "arroba", "numeral", "pesos", "porciento", "asterisco", "mas",
 *   "signo de pregunta".
 * - Tiene que pasar la politica de contraseñas de Supabase Auth. Si en
 *   Authentication > Email se exige "letters, digits and symbols", una clave sin
 *   simbolos se rechaza y el alta falla. Por eso se garantiza al menos uno de
 *   cada clase en vez de confiar en el azar.
 */
function generateTempPassword(): string {
  const grupos = [
    'ABCDEFGHJKMNPQRSTUVWXYZ',   // sin I ni O
    'abcdefghijkmnpqrstuvwxyz',  // sin l ni o
    '23456789',                  // sin 0 ni 1
    '!@#$%*+?',
  ]
  const todos = grupos.join('')
  const LARGO = 14

  const pick = (set: string) => {
    const [b] = crypto.getRandomValues(new Uint8Array(1))
    return set[b % set.length]
  }

  // Uno de cada grupo, el resto libre.
  const chars = [
    ...grupos.map(pick),
    ...Array.from({ length: LARGO - grupos.length }, () => pick(todos)),
  ]

  // Barajado Fisher-Yates para que los obligatorios no queden siempre al frente.
  for (let i = chars.length - 1; i > 0; i--) {
    const [b] = crypto.getRandomValues(new Uint8Array(1))
    const j = b % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

// ─── Lectura ─────────────────────────────────────────────────────────────────

export async function listEmployees(): Promise<{
  data: Employee[] | null
  error: string | null
}> {
  const denied = await requireRole('admin')
  if (denied) return { data: null, ...denied }

  try {
    const supabase = await createAdminClient()
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      devError('Error listando empleados:', error)
      return { data: null, error: 'No se pudo cargar el equipo' }
    }

    // El email vive en auth.users, que solo se lee con la clave de servicio.
    const service = createServiceRoleClient()
    const { data: authList } = await service.auth.admin.listUsers({ perPage: 1000 })
    const byId = new Map(authList?.users.map((u) => [u.id, u]) ?? [])

    const employees: Employee[] = (profiles ?? []).map((p) => {
      const u = byId.get(p.id)
      return {
        ...(p as Profile),
        email: u?.email ?? '—',
        last_sign_in_at: u?.last_sign_in_at ?? null,
      }
    })

    return { data: employees, error: null }
  } catch (error) {
    devError('Error inesperado listando empleados:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

// ─── Alta ────────────────────────────────────────────────────────────────────

export async function createEmployee(input: {
  fullName: string
  email: string
  role: string
}): Promise<{ data: { tempPassword: string } | null; error: string | null }> {
  const denied = await requireRole('admin')
  if (denied) return { data: null, ...denied }

  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()

  if (!fullName) return { data: null, error: 'El nombre es requerido' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { data: null, error: 'El email no es válido' }
  }
  if (!isValidRole(input.role)) return { data: null, error: 'Rol inválido' }

  try {
    const service = createServiceRoleClient()
    const tempPassword = generateTempPassword()

    // email_confirm evita el mail de confirmacion: el dueño le pasa la clave
    // en persona. `full_name` y `role` los levanta el trigger handle_new_user.
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: input.role },
    })

    if (error || !data.user) {
      devError('Error creando empleado:', error)
      const already = error?.message?.toLowerCase().includes('already')
      return {
        data: null,
        error: already ? 'Ya existe una cuenta con ese email' : 'No se pudo crear la cuenta',
      }
    }

    // El trigger ya creo el perfil. Se reafirma por si la migracion 016 no
    // estuviera aplicada en este entorno.
    await service.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      role: input.role as AppRole,
      is_active: true,
    })

    revalidatePath('/admin/empleados')
    return { data: { tempPassword }, error: null }
  } catch (error) {
    devError('Error inesperado creando empleado:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

// ─── Cambios ─────────────────────────────────────────────────────────────────

/** Impide quedarse sin ningun admin activo. */
async function wouldRemoveLastAdmin(targetId: string): Promise<boolean> {
  const service = createServiceRoleClient()
  const { data } = await service
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)

  const admins = data ?? []
  return admins.length <= 1 && admins.some((a) => a.id === targetId)
}

export async function updateEmployeeRole(
  employeeId: string,
  role: string
): Promise<{ error: string | null }> {
  const denied = await requireRole('admin')
  if (denied) return denied

  if (!isValidRole(role)) return { error: 'Rol inválido' }

  const me = await getCurrentProfile()
  if (me?.id === employeeId && role !== 'admin') {
    return { error: 'No podés quitarte a vos mismo el rol de administrador' }
  }

  if (role !== 'admin' && (await wouldRemoveLastAdmin(employeeId))) {
    return { error: 'Tiene que quedar al menos un administrador activo' }
  }

  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role: role as AppRole })
    .eq('id', employeeId)

  if (error) {
    devError('Error cambiando el rol:', error)
    return { error: 'No se pudo cambiar el rol' }
  }

  revalidatePath('/admin/empleados')
  return { error: null }
}

export async function setEmployeeActive(
  employeeId: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  const denied = await requireRole('admin')
  if (denied) return denied

  const me = await getCurrentProfile()
  if (me?.id === employeeId && !isActive) {
    return { error: 'No podés darte de baja a vos mismo' }
  }

  if (!isActive && (await wouldRemoveLastAdmin(employeeId))) {
    return { error: 'Tiene que quedar al menos un administrador activo' }
  }

  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', employeeId)

  if (error) {
    devError('Error cambiando el estado del empleado:', error)
    return { error: 'No se pudo cambiar el estado' }
  }

  revalidatePath('/admin/empleados')
  return { error: null }
}

/**
 * Genera una contraseña nueva. Para cuando alguien se la olvida: el dueño se la
 * dicta y listo, no hace falta mail de recuperacion.
 */
export async function resetEmployeePassword(
  employeeId: string
): Promise<{ data: { tempPassword: string } | null; error: string | null }> {
  const denied = await requireRole('admin')
  if (denied) return { data: null, ...denied }

  try {
    const service = createServiceRoleClient()
    const tempPassword = generateTempPassword()

    const { error } = await service.auth.admin.updateUserById(employeeId, {
      password: tempPassword,
    })

    if (error) {
      devError('Error reseteando la contraseña:', error)
      return { data: null, error: 'No se pudo generar la contraseña' }
    }

    return { data: { tempPassword }, error: null }
  } catch (error) {
    devError('Error inesperado reseteando la contraseña:', error)
    return { data: null, error: 'Error inesperado' }
  }
}
