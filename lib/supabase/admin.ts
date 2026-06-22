import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/env'
import { getSupabaseCookieConfig } from './cookies'

/**
 * Creates a Supabase client for server-side admin operations
 * This client should only be used in server actions that verify user authentication
 *
 * IMPORTANT: This uses the ANON key, not a service role key.
 * RLS policies must be properly configured in Supabase to protect admin operations.
 */
export async function createAdminClient() {
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    await getSupabaseCookieConfig()
  )
}

/**
 * Creates a Supabase client using the service role key (server-only).
 * Use this sparingly for operations that must bypass RLS (audit inserts, migrations).
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment')
  }
  return createClient(SUPABASE_URL, key)
}
