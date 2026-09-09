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


export function TableCard({ table, isSelected, onClick }: TableCardProps) {
  const cfg = TABLE_STATUS_CONFIG[table.status] ?? TABLE_STATUS_CONFIG.libre
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
          : `border ${cfg.borderColor}`
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
          cfg.bgColor
        )} style={{ height: 18 }}>
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dotColor)} />
          <span className={cn('text-[11px] font-semibold leading-none', cfg.color)}>
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
          <span className={cn('text-[12px] font-semibold tabular-nums leading-none', cfg.color)}>
            {formatPrice(orderInfo.total)}
          </span>
        )}
      </div>
    </button>
  )
}
