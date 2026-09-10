'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import type { StockWarning } from '@/app/actions/stock'

interface StockAlertProps {
  checking: boolean
  warnings: StockWarning[]
}

/** Barra a la izquierda y esquinas rectas de ese lado: ocupa poco y no compite
 *  con las tarjetas redondeadas del resto del panel. */
const CAJA = 'flex gap-2 rounded-r-md border-l-2 px-3 py-2'

/**
 * Aviso de stock al cobrar.
 *
 * Vivia escrito dos veces con dos redacciones distintas: mostrador decia
 * "PIZZA ESPECIAL: -4 disponibles" y mesa "PIZZA ESPECIAL: pediste 1, hay -4".
 * Ninguna de las dos servia con stock negativo, que es justo cuando el aviso
 * aparece: -4 no es una cantidad disponible, es un contador en rojo. Y como
 * `available` puede ser null, la version de mostrador llegaba a imprimir
 * "null disponibles".
 *
 * Aca nunca se muestra un numero negativo. Lo que necesita saber quien cobra es
 * si puede servir lo que le pidieron, no cuanto debe el inventario.
 */
export function StockAlert({ checking, warnings }: StockAlertProps) {
  if (checking) {
    return (
      <div className={`${CAJA} border-[var(--admin-text-placeholder)] bg-[var(--admin-surface-2)]`}>
        <Loader2 className="mt-px h-3.5 w-3.5 shrink-0 animate-spin text-[var(--admin-text-muted)]" />
        <span className="text-[11.5px] leading-snug text-[var(--admin-text-muted)]">Verificando stock…</span>
      </div>
    )
  }

  if (warnings.length === 0) return null

  const unico = warnings.length === 1 ? warnings[0] : null

  return (
    <div className={`${CAJA} border-amber-500 bg-amber-500/10`}>
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />

      <div className="min-w-0 space-y-0.5 text-[11.5px] leading-snug text-amber-800 dark:text-amber-200">
        {/* Con un solo producto, el titulo y la linea dicen lo mismo. */}
        {unico ? (
          <p>
            <span className="font-semibold">{unico.product_name}</span> — {disponibilidad(unico)}
          </p>
        ) : (
          <>
            <p className="font-semibold">Falta stock de {warnings.length} productos</p>
            <ul>
              {warnings.map((w) => (
                <li key={w.product_id}>
                  {w.product_name} — {disponibilidad(w)}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* La venta no se bloquea, asi que conviene decirlo en vez de dejar la
            duda justo cuando hay alguien esperando. */}
        <p className="text-amber-700/80 dark:text-amber-300/70">Se puede cobrar igual.</p>
      </div>
    </div>
  )
}

/**
 * `available` es el stock actual y puede venir negativo o nulo. Un negativo
 * significa que ya se vendio de mas: para quien cobra es lo mismo que cero.
 */
function disponibilidad(w: StockWarning): string {
  if (w.available === null) return `pediste ${w.requested}, sin datos de stock`
  if (w.available <= 0) return `pediste ${w.requested}, no queda`
  return `pediste ${w.requested}, hay ${w.available}`
}
