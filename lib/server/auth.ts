import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Obtiene el usuario autenticado del cliente Supabase.
 * Centraliza la extracción del usuario para evitar duplicación
 * del patrón de destructuring en cada server action.
 */
export async function getAuthUser(supabase: SupabaseClient): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
