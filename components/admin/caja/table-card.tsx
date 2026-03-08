'use client'

import { useMemo } from 'react'
import { UtensilsCrossed, Users, Clock, AlertTriangle } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { TABLE_STATUS_CONFIG } from '@/lib/types/tables'
import type { TableWithOrder } from '@/lib/types/tables'

interface TableCardProps {
  table: TableWithOrder
  isSelected: boolean
  onClick: () => void
}

function getElapsedInfo(openedAt: string): { label: string; minutes: number } {
  const now = Date.now()
  const opened = new Date(openedAt).getTime()
  const diffMs = now - opened
  const diffMin = Math.floor(diffMs / 60000)

  let label: string
  if (diffMin < 1) label = '< 1 min'
  else if (diffMin < 60) label = `${diffMin} min`
  else {
    const hours = Math.floor(diffMin / 60)
    const mins = diffMin % 60
    label = mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  return { label, minutes: diffMin }
}

type TimeStatus = 'normal' | 'warning' | 'critical'

function getTimeStatus(minutes: number): TimeStatus {
  if (minutes > 90) return 'critical'
  if (minutes > 60) return 'warning'
  return 'normal'
}

export function TableCard({ table, isSelected, onClick }: TableCardProps) {
  const statusConfig = TABLE_STATUS_CONFIG[table.status]
  const isOccupied = table.status === 'ocupada' || table.status === 'cuenta_pedida'

  const orderInfo = useMemo(() => {
    if (!isOccupied || !table.orders) return null

    const activeItems = table.orders.order_items.filter(
      (item) => item.status !== 'cancelado'
    )
    const itemCount = activeItems.reduce((sum, item) => sum + item.quantity, 0)

    const elapsedInfo = table.orders.opened_at
      ? getElapsedInfo(table.orders.opened_at)
      : null

    return {
      total: table.orders.total,
      itemCount,
      elapsed: elapsedInfo?.label ?? null,
      timeStatus: elapsedInfo ? getTimeStatus(elapsedInfo.minutes) : ('normal' as TimeStatus),
    }
  }, [isOccupied, table.orders])

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center gap-0.5',
        'bg-[var(--admin-surface)] rounded-xl border-2 p-3',
        'transition-all duration-200 active:scale-95 cursor-pointer',
        'h-[115px] w-full',
        'hover:bg-[var(--admin-hover)]',
        statusConfig.borderColor,
        isSelected && table.status === 'libre' && 'border-green-500 shadow-md shadow-green-500/10',
        isSelected && table.status === 'ocupada' && 'border-[var(--admin-accent)] shadow-md shadow-[var(--admin-accent)]/10',
        isSelected && table.status === 'cuenta_pedida' && 'border-orange-500 shadow-md shadow-orange-500/10'
      )}
    >
      {/* Pulsing dot for cuenta_pedida */}
      {table.status === 'cuenta_pedida' && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
        </span>
      )}

      {/* Icon */}
      <UtensilsCrossed className={cn('h-4 w-4', statusConfig.color)} />

      {/* Table number */}
      <span className={cn('text-xl font-bold leading-tight', statusConfig.color)}>
        {table.number}
      </span>

      {/* Status label */}
      <span className={cn('text-xs font-semibold uppercase tracking-wider', statusConfig.color)}>
        {statusConfig.label}
      </span>

      {/* Divider + info row */}
      {isOccupied && orderInfo ? (
        <div className="w-full mt-1 pt-1 border-t border-[var(--admin-border)]/60 flex items-center justify-between px-0.5">
          {/* Time */}
          {orderInfo.elapsed ? (
            <div className={cn(
              'flex items-center gap-0.5',
              orderInfo.timeStatus === 'critical' && 'text-red-400',
              orderInfo.timeStatus === 'warning' && 'text-orange-400',
              orderInfo.timeStatus === 'normal' && 'text-[var(--admin-text-muted)]'
            )}>
              <Clock className="h-2.5 w-2.5" />
              <span className="text-xs font-medium">{orderInfo.elapsed}</span>
              {orderInfo.timeStatus === 'critical' && <AlertTriangle className="h-2.5 w-2.5" />}
            </div>
          ) : <span />}
          {/* Total */}
          <span className="text-xs font-bold text-[var(--admin-text)]">
            {formatPrice(orderInfo.total)}
          </span>
        </div>
      ) : table.status === 'libre' ? (
        <div className="flex items-center gap-1 text-[var(--admin-text-muted)] mt-1">
          <Users className="h-2.5 w-2.5" />
          <span className="text-xs">{table.capacity} pers.</span>
        </div>
      ) : null}
    </button>
  )
}
