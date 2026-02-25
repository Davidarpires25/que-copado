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

/**
 * Calcula el tiempo transcurrido desde opened_at hasta ahora
 */
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
        'relative flex flex-col items-center justify-center',
        'bg-[#12151a] rounded-xl border-2 p-4',
        'transition-all duration-200 active:scale-95',
        'min-h-[140px] aspect-square w-full',
        'hover:bg-[#1e222b]',
        // Status border color
        statusConfig.borderColor,
        // Selected state: full opacity border
        isSelected && table.status === 'libre' && 'border-green-500 shadow-lg shadow-green-500/10',
        isSelected && table.status === 'ocupada' && 'border-[#FEC501] shadow-lg shadow-[#FEC501]/10',
        isSelected && table.status === 'cuenta_pedida' && 'border-orange-500 shadow-lg shadow-orange-500/10'
      )}
    >
      {/* Pulsing dot for cuenta_pedida */}
      {table.status === 'cuenta_pedida' && (
        <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
        </span>
      )}

      {/* Table icon */}
      <UtensilsCrossed
        className={cn('h-5 w-5 mb-1', statusConfig.color)}
      />

      {/* Table number */}
      <span className={cn('text-2xl font-bold', statusConfig.color)}>
        {table.number}
      </span>

      {/* Status label */}
      <span
        className={cn(
          'text-[10px] font-semibold uppercase tracking-wider mt-0.5 mb-2',
          statusConfig.color
        )}
      >
        {statusConfig.label}
      </span>

      {/* Occupied: elapsed time, total, item count */}
      {isOccupied && orderInfo && (
        <div className="w-full space-y-1 mt-auto">
          {orderInfo.elapsed && (
            <div className={cn(
              'flex items-center justify-center gap-1',
              orderInfo.timeStatus === 'critical' && 'text-red-400 animate-pulse',
              orderInfo.timeStatus === 'warning' && 'text-orange-400',
              orderInfo.timeStatus === 'normal' && 'text-[#a8b5c9]'
            )}>
              <Clock className="h-3 w-3" />
              <span className="text-xs font-semibold">{orderInfo.elapsed}</span>
              {orderInfo.timeStatus === 'critical' && (
                <AlertTriangle className="h-3 w-3" />
              )}
            </div>
          )}
          <p className="text-sm font-bold text-[#f0f2f5] text-center">
            {formatPrice(orderInfo.total)}
          </p>
          <p className="text-[10px] text-[#a8b5c9] text-center">
            {orderInfo.itemCount} {orderInfo.itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
      )}

      {/* Free: capacity and section */}
      {table.status === 'libre' && (
        <div className="w-full mt-auto text-center">
          <div className="flex items-center justify-center gap-1 text-[#a8b5c9]">
            <Users className="h-3 w-3" />
            <span className="text-xs">
              {table.capacity} {table.capacity === 1 ? 'persona' : 'personas'}
            </span>
          </div>
        </div>
      )}
    </button>
  )
}
