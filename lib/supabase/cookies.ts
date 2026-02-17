import { cookies } from 'next/headers'

/**
 * Configuración compartida de cookies para los clientes Supabase SSR.
 * Evita duplicar el manejo de cookies entre server.ts y admin.ts.
 */
export async function getSupabaseCookieConfig() {
  const cookieStore = await cookies()

  return {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component context - cookie writes are silently ignored
        }
      },
    },
  }
}
