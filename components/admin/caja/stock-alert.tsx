'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import type { StockWarning } from '@/app/actions/stock'

interface StockAlertProps {
  checking: boolean
  warnings: StockWarning[]
}

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
      <div className="flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--admin-text-muted)]" />
        <span className="text-xs text-[var(--admin-text-muted)]">Verificando stock…</span>
      </div>
    )
  }

  if (warnings.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-50 px-3 py-2.5 dark:bg-amber-950/50">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
          {warnings.length === 1 ? 'Falta stock de un producto' : `Falta stock de ${warnings.length} productos`}
        </p>
      </div>

      <ul className="mt-1.5 space-y-1 pl-6">
        {warnings.map((w) => (
          <li
            key={w.product_id}
            className="flex items-baseline justify-between gap-3 text-xs text-amber-800 dark:text-amber-200"
          >
            <span className="min-w-0 truncate">{w.product_name}</span>
            <span className="shrink-0 tabular-nums opacity-80">{disponibilidad(w)}</span>
          </li>
        ))}
      </ul>

      {/* La venta no se bloquea, asi que conviene decirlo en vez de dejar la
          duda justo cuando hay alguien esperando. */}
      <p className="mt-2 pl-6 text-[11px] text-amber-700/80 dark:text-amber-300/70">
        Se puede cobrar igual.
      </p>
    </div>
  )
}

/**
 * `available` es el stock actual y puede venir negativo o nulo. Un negativo
 * significa que ya se vendio de mas: para quien cobra es lo mismo que cero.
 */
function disponibilidad(w: StockWarning): string {
  if (w.available === null) return `pediste ${w.requested} · sin datos`
  if (w.available <= 0) return `pediste ${w.requested} · no queda`
  return `pediste ${w.requested} · hay ${w.available}`
}
