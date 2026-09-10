'use client'

import { useMemo } from 'react'
import { cn, formatPrice } from '@/lib/utils'
import { TABLE_STATUS_CONFIG } from '@/lib/types/tables'
import type { TableWithOrder } from '@/lib/types/tables'

interface TableCardProps {
  table: TableWithOrder
  isSelected: boolean
  onClick: () => void
}

/**
 * Una mesa en la grilla del salon.
 *
 * El borde dice si la mesa esta seleccionada y nada mas. Antes codificaba el
 * estado y la seleccion a la vez —borde ambar por "ocupada", borde ambar por
 * "elegida"— asi que una mesa ocupada y seleccionada quedaba ambar sobre ambar
 * y no se distinguia de sus vecinas. El estado vive en el badge, que ya lo dice
 * con punto, color y palabra.
 *
 * Y seleccionar ya no la pinta de gris: el fondo era `--admin-hover` (#ECEDF2),
 * el mismo del hover, con lo cual la tarjeta elegida parecia apagada en vez de
 * destacada.
 */
export function TableCard({ table, isSelected, onClick }: TableCardProps) {
  const cfg = TABLE_STATUS_CONFIG[table.status] ?? TABLE_STATUS_CONFIG.libre
  const isOccupied = table.status !== 'libre'

  const consumo = useMemo(() => {
    if (!isOccupied || !table.orders) return 0
    return table.orders.total
  }, [isOccupied, table.orders])

  return (
    <button
      onClick={onClick}
      style={{ height: 80 }}
      className={cn(
        'relative flex w-full flex-col justify-between rounded-lg border p-3 text-left transition-colors cursor-pointer',
        // El ring va por dentro: engrosar el borde al seleccionar corria el
        // contenido un pixel.
        'ring-1 ring-inset ring-transparent',
        isSelected
          ? 'border-[var(--admin-accent)] ring-[var(--admin-accent)] bg-[var(--admin-accent)]/10'
          : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-text-placeholder)]'
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-[13px] font-semibold leading-none text-[var(--admin-text)]">
          Mesa {table.number}
        </span>

        <span
          className={cn('flex h-[18px] shrink-0 items-center gap-1 rounded-full px-1.5', cfg.bgColor)}
        >
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', cfg.dotColor)} />
          <span className={cn('text-[11px] font-semibold leading-none', cfg.color)}>
            {cfg.label}
          </span>
        </span>
      </div>

      <div className="flex w-full items-baseline justify-between gap-2">
        <span className="text-[11px] text-[var(--admin-text-faint)]">
          {table.capacity} pers.
        </span>
        {/* Sin consumo no se escribe "$ 0": una mesa recien sentada no debe cero
            pesos, todavia no pidio. */}
        {consumo > 0 && (
          <span className="text-[13px] font-bold leading-none tabular-nums text-[var(--admin-price)]">
            {formatPrice(consumo)}
          </span>
        )}
      </div>
    </button>
  )
}
