import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/env'
import { getSupabaseCookieConfig } from './cookies'

/**
 * Creates a Supabase client for server-side operations
 * Used in Server Components and Server Actions for public data access
 */
export async function createClient() {
  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    await getSupabaseCookieConfig()
  )
}
