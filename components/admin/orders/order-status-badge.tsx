import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types/database'
import { ORDER_STATUS_CONFIG } from '@/lib/types/orders'

interface OrderStatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md'
  className?: string
}

export function OrderStatusBadge({
  status,
  size = 'md',
  className
}: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full',
        config.bgColor,
        config.textColor,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      <span
        className={cn(
          'rounded-full mr-1.5',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
        )}
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  )
}

/**
 * El estado como texto, para las tablas. En una lista de pedidos el estado
 * esta en todas las filas: en pildora, el color deja de señalar (spec
 * tablas-del-admin). El tono separa lo que falta resolver —recibido, abierto,
 * cuenta pedida— de lo que ya se cobro, y lo cancelado.
 *
 * La pildora (`OrderStatusBadge`) queda para donde hay un solo estado: el
 * detalle del pedido y el dialogo de cambiarlo.
 */
export function OrderStatusText({ status, className }: { status: OrderStatus; className?: string }) {
  const pendiente = status === 'recibido' || status === 'abierto' || status === 'cuenta_pedida'
  return (
    <span
      className={cn(
        'text-sm whitespace-nowrap',
        pendiente ? 'font-medium text-aviso-texto'
          : status === 'cancelado' ? 'text-peligro-texto'
          : 'text-[var(--admin-text-muted)]',
        className
      )}
    >
      {ORDER_STATUS_CONFIG[status].label}
    </span>
  )
}

