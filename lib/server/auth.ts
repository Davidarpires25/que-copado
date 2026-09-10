import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Lo unico que las acciones usan del usuario. Se verificaron los 17 usos. */
export interface UsuarioAutenticado {
  id: string
}

/**
 * Quien esta operando, verificado sin salir a la red.
 *
 * Antes esto llamaba a `supabase.auth.getUser()`, que valida el token contra el
 * servidor de auth en cada invocacion. Medido sobre los logs de produccion de 24
 * horas, `/auth/v1/user` era el endpoint MAS llamado de todo el sistema —mas que
 * pedidos, mas que productos— y de los mas lentos:
 *
 *     ruta                llamadas   p50     promedio   p95
 *     /auth/v1/user         3.224   165ms    220ms     485ms
 *     /rest/v1/orders       1.595   186ms    217ms     549ms
 *
 * Casi once minutos por dia contestando "quien sos" antes de empezar a trabajar,
 * y ese peaje lo paga cada server action: React.cache lo deduplica dentro de un
 * render, pero cada action es su propia request.
 *
 * `getClaims()` verifica la firma localmente contra el JWKS del proyecto, que la
 * libreria cachea. El proyecto emite tokens ES256 —asimetricos— asi que no hace
 * falta preguntarle a nadie si la firma es buena. Con claves simetricas la
 * libreria cae sola de nuevo en getUser(), asi que esto no se rompe si algun dia
 * cambia la configuracion.
 *
 * Sobre la revocacion, que es lo que se pierde al no consultar el servidor: la
 * verificacion local no sabe si la sesion fue cerrada, y el token vive una hora.
 * No importa, porque el token solo prueba identidad. El permiso lo revalida la
 * base en CADA consulta:
 *
 *     has_permission(perm) -> SELECT ... FROM profiles p ...
 *                             WHERE p.id = auth.uid() AND p.is_active AND ...
 *
 * y de esa funcion cuelgan todas las policies de RLS. Un empleado dado de baja
 * deja de poder leer y escribir al instante, aunque le quede token.
 */
const _getCachedUser = cache(async (): Promise<UsuarioAutenticado | null> => {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  return { id: data.claims.sub }
})

/**
 * Returns the authenticated user.
 * The `supabase` parameter is kept for backward compatibility but the
 * result is cached per-request via React.cache().
 */
export async function getAuthUser(_supabase?: SupabaseClient): Promise<UsuarioAutenticado | null> {
  return _getCachedUser()
}
