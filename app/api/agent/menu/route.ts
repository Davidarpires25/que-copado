import { createHash } from 'node:crypto'
import { requireAgentSecret } from '@/lib/server/agent-auth'
import { agentInternalError } from '@/lib/server/agent-errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMaxQuantities } from '@/lib/server/elaborado-stock'
import { devError } from '@/lib/server/logger'

// La disponibilidad depende del stock, que cambia durante el servicio.
export const dynamic = 'force-dynamic'

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category: { id: string; name: string } | null
  available: boolean
  /** Ausente cuando no hay tope: el producto no lleva control de stock. */
  max_quantity?: number
}

/**
 * GET /api/agent/menu
 *
 * Catalogo activo con disponibilidad real. El agente lo mete en su prompt, asi
 * que la respuesta esta ordenada de forma estable: si el contenido no cambio,
 * los bytes tampoco, y el cache de prompt del modelo sigue sirviendo.
 *
 * Los precios son informativos. El total lo recalcula el servidor al crear el
 * pedido; lo que el agente diga mientras conversa no obliga a nada.
 */
export async function GET(request: Request) {
  const denied = requireAgentSecret(request)
  if (denied) return denied

  try {
    const supabase = await createAdminClient()

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        product_type,
        is_out_of_stock,
        current_stock,
        stock_tracking_enabled,
        categories ( id, name, sort_order )
      `)
      .eq('is_active', true)

    if (error) {
      devError('[agent/menu] no se pudieron leer los productos:', error)
      return agentInternalError()
    }

    // La disponibilidad de un elaborado no es una columna: sale de recorrer sus
    // recetas. La de un combo tampoco: sale de sus recetas propias y de lo que
    // incluye. Se consultan en paralelo y solo los que hacen falta.
    const topePorProducto = await getMaxQuantities(supabase, products ?? [])

    const items: MenuItem[] = (products ?? []).map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cat = p.categories as any
      const base = {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        category: cat ? { id: cat.id, name: cat.name } : null,
        _sort: cat?.sort_order ?? 0,
      }

      // Agotado a mano gana sobre cualquier calculo de stock.
      if (p.is_out_of_stock) {
        return { ...base, available: false, max_quantity: 0 }
      }

      if (p.product_type === 'elaborado' || p.product_type === 'combo') {
        const tope = topePorProducto.get(p.id) ?? null
        // null = no tiene ingredientes trackeados, o sea sin tope.
        if (tope === null) return { ...base, available: true }
        return { ...base, available: tope > 0, max_quantity: Math.max(0, tope) }
      }

      if (p.stock_tracking_enabled && p.current_stock !== null) {
        return {
          ...base,
          available: p.current_stock > 0,
          max_quantity: Math.max(0, p.current_stock),
        }
      }

      return { ...base, available: true }
    })

    // Orden estable: por categoria y despues por nombre. Sin esto, Postgres
    // puede devolver las filas en otro orden entre llamadas y el agente
    // invalidaria su cache de prompt sin que nada haya cambiado.
    items.sort((a, b) => {
      const sa = (a as MenuItem & { _sort: number })._sort
      const sb = (b as MenuItem & { _sort: number })._sort
      if (sa !== sb) return sa - sb
      return a.name.localeCompare(b.name, 'es')
    })
    for (const it of items) delete (it as MenuItem & { _sort?: number })._sort

    // La version es un hash del contenido, no una fecha.
    //
    // `products` no tiene `updated_at`, pero aunque lo tuviera no alcanzaria: la
    // disponibilidad de un elaborado cambia cuando se mueve el stock de un
    // ingrediente, sin que el producto se toque. Un hash del payload cambia
    // exactamente cuando cambia lo que el agente veria.
    const version = createHash('sha256')
      .update(JSON.stringify(items))
      .digest('hex')
      .slice(0, 16)

    return Response.json({ version, items })
  } catch (e) {
    devError('[agent/menu] error inesperado:', e)
    return agentInternalError()
  }
}
