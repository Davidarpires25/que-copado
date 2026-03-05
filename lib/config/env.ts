function requireValue(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

// Use static property access so Next.js can inline NEXT_PUBLIC_ vars at build time
export const SUPABASE_URL = requireValue(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')
export const SUPABASE_ANON_KEY = requireValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
