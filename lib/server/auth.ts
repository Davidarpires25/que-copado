import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Cached auth check — deduplicates within a single React server render.
 * When multiple server actions are called via Promise.all from the same
 * page, they all share this result without extra round-trips to Supabase Auth.
 */
const _getCachedUser = cache(async (): Promise<User | null> => {
  const supabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/**
 * Returns the authenticated user.
 * The `supabase` parameter is kept for backward compatibility but the
 * result is cached per-request via React.cache().
 */
export async function getAuthUser(_supabase: SupabaseClient): Promise<User | null> {
  return _getCachedUser()
}
