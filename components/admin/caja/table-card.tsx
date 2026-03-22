'use client'

import { useMemo } from 'react'
import { cn, formatPrice } from '@/lib/utils'
import type { TableWithOrder } from '@/lib/types/tables'

interface TableCardProps {
  table: TableWithOrder
  isSelected: boolean
  onClick: () => void
}

const STATUS_STYLES = {
  libre: {
    label: 'Libre',
    dot: 'bg-green-400',
    text: 'text-green-400',
    badge: 'bg-green-400/15',
    border: 'border-green-400/20',
  },
  ocupada: {
    label: 'Ocupada',
    dot: 'bg-[var(--admin-accent)]',
    text: 'text-[var(--admin-accent-text)]',
    badge: 'bg-[var(--admin-accent)]/10',
    border: 'border-[var(--admin-accent)]/30',
  },
  cuenta_pedida: {
    label: 'Cuenta Pedida',
    dot: 'bg-red-400',
    text: 'text-red-400',
    badge: 'bg-red-400/15',
    border: 'border-red-400/20',
  },
} as const

export function TableCard({ table, isSelected, onClick }: TableCardProps) {
  const cfg = STATUS_STYLES[table.status] ?? STATUS_STYLES.libre
  const isOccupied = table.status !== 'libre'

  const orderInfo = useMemo(() => {
    if (!isOccupied || !table.orders) return null
    const activeItems = table.orders.order_items.filter((i) => i.status !== 'cancelado')
    const itemCount = activeItems.reduce((s, i) => s + i.quantity, 0)
    return { total: table.orders.total, itemCount }
  }, [isOccupied, table.orders])

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-1.5 w-full rounded-lg p-3 text-left',
        'bg-[var(--admin-surface)] transition-all duration-200 cursor-pointer',
        'hover:bg-[var(--admin-hover)]',
        isSelected
          ? 'border-2 border-[var(--admin-accent)] bg-[var(--admin-hover)]'
          : `border ${cfg.border}`
      )}
      style={{ height: 80 }}
    >
      {/* Top row: name + status badge */}
      <div className="flex items-center justify-between w-full">
        <span className={cn(
          'text-[13px] font-semibold leading-none',
          isSelected && isOccupied ? 'text-[var(--admin-accent-text)]' : 'text-[var(--admin-text)]'
        )}>
          Mesa {table.number}
        </span>

        <div className={cn(
          'flex items-center gap-1 px-1.5 rounded-full shrink-0',
          cfg.badge
        )} style={{ height: 18 }}>
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
          <span className={cn('text-[10px] font-semibold leading-none', cfg.text)}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Bottom row: capacity | total (when occupied) */}
      <div className="flex items-center justify-between w-full">
        <span className="text-[11px] text-[var(--admin-text-faint)]">
          {table.capacity} pers.
        </span>
        {isOccupied && orderInfo && (
          <span className={cn('text-[12px] font-semibold tabular-nums leading-none', cfg.text)}>
            {formatPrice(orderInfo.total)}
          </span>
        )}
      </div>
    </button>
  )
}
