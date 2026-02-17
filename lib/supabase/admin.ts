import { createServerClient } from '@supabase/ssr'
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
