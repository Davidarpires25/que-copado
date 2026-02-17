'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/env'

/**
 * Creates a Supabase client for client-side operations
 * Used in Client Components for real-time subscriptions and client-side queries
 *
 * @returns SupabaseClient<Database> - Configured Supabase browser client
 */
export function createClient() {
  return createBrowserClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )
}
