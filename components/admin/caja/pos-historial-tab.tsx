'use client'

import { useState, useMemo, Fragment } from 'react'
import { printClientTicketAction } from '@/app/actions/print'
import {
  ChevronDown,
  Banknote,
  CreditCard,
  Landmark,
  QrCode,
  Store,
  Table2,
  X,
  MessageSquare,
  Printer,
  ClipboardList,
  SearchX,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OrderStatusBadge } from '@/components/admin/orders'
import { formatPrice, cn } from '@/lib/utils'
import type { PaymentMethod, Json } from '@/lib/types/database'
import type { OrderItem } from '@/lib/types/orders'
import type { OrderWithSplits } from '@/lib/types/cash-register'

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentFilter = 'all' | PaymentMethod
type StatusFilter = 'all' | 'activa' | 'anulada'

interface PosHistorialTabProps {
  orders: OrderWithSplits[]
  loading: boolean
  onCancelOrder: (orderId: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseItems(items: Json): OrderItem[] {
  if (Array.isArray(items)) return items as unknown as OrderItem[]
  return []
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatPaymentMethod(method: PaymentMethod | string): string {
  if (method === 'cash') return 'Efectivo'
  if (method === 'card') return 'Tarjeta'
  if (method === 'transfer' || method === 'mercadopago') return 'Transferencia'
  return '—'
}

const PAYMENT_ICON_CONFIG: Record<
  PaymentMethod,
  { label: string; icon: React.ElementType; textClass: string }
> = {
  cash:        { label: 'Efectivo', icon: Banknote,   textClass: 'text-emerald-400' },
  card:        { label: 'Tarjeta',  icon: CreditCard, textClass: 'text-sky-400' },
  transfer:    { label: 'Transf.',  icon: Landmark,   textClass: 'text-violet-400' },
  mercadopago: { label: 'M. Pago',  icon: QrCode,     textClass: 'text-sky-400' },
}

const TABLE_HEAD_CLASS =
  'text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold'

// ─── Fila de orden (expandible) ───────────────────────────────────────────────

function OrderRow({
  order,
  onCancelOrder,
}: {
  order: OrderWithSplits
  onCancelOrder: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isCancelled = order.status === 'cancelado'
  const items = parseItems(order.items)

  const itemsSummary = items
    .slice(0, 3)
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(', ')
  const extraItems = items.length > 3 ? ` +${items.length - 3}` : ''

  const paymentMethods =
    order.payment_splits && order.payment_splits.length > 1
      ? order.payment_splits.map((s) => s.method as PaymentMethod)
      : [order.payment_method as PaymentMethod]

  return (
    <Fragment>
      <TableRow
        onClick={() => setExpanded((p) => !p)}
        className={cn(
          'border-[var(--admin-border)] transition-colors group cursor-pointer',
          isCancelled ? 'opacity-55' : 'hover:bg-[var(--admin-surface-2)]'
        )}
        aria-expanded={expanded}
      >
        <TableCell className="w-8 pr-0">
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-[var(--admin-text-faint)] transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        </TableCell>

        <TableCell>
          <span className="text-sm text-[var(--admin-text-muted)] tabular-nums">
            {formatTime(order.created_at)}
          </span>
        </TableCell>

        <TableCell className="max-w-[240px]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {order.order_type === 'mesa' ? (
                <Table2 className="h-3.5 w-3.5 text-[var(--admin-text-faint)] shrink-0" />
              ) : (
                <Store className="h-3.5 w-3.5 text-[var(--admin-text-faint)] shrink-0" />
              )}
              <span className="font-semibold text-sm text-[var(--admin-text)] truncate group-hover:text-[var(--admin-accent-text)] transition-colors">
                {order.order_type === 'mesa'
                  ? `Mesa ${order.table_number || ''}`
                  : 'Mostrador'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-[var(--admin-text-muted)] truncate">
                {itemsSummary}{extraItems}
              </p>
              {order.notes && (
                <MessageSquare className="h-2.5 w-2.5 text-[var(--admin-accent-text)]/60 shrink-0" />
              )}
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden sm:table-cell">
          <div className="flex flex-col gap-0.5">
            {paymentMethods.map((method, i) => (
              <span
                key={i}
                className="text-sm text-[var(--admin-text-muted)] capitalize"
              >
                {formatPaymentMethod(method)}
              </span>
            ))}
          </div>
        </TableCell>

        <TableCell>
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              isCancelled
                ? 'line-through text-[var(--admin-text-faint)]'
                : 'text-[var(--admin-accent-text)]'
            )}
          >
            {formatPrice(order.total)}
          </span>
        </TableCell>

        <TableCell>
          <OrderStatusBadge
            status={isCancelled ? 'cancelado' : 'pagado'}
            size="sm"
          />
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="border-[var(--admin-border)] hover:bg-transparent">
          <TableCell colSpan={6} className="p-0 bg-[var(--admin-bg)]/40">
            <div className="px-4 py-3 border-t border-[var(--admin-border)]/50">
              <div className="space-y-1.5 pl-6">
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="tabular-nums text-[var(--admin-text-muted)] shrink-0 w-6 text-right">
                          {item.quantity}x
                        </span>
                        <span className="text-[var(--admin-text)] truncate">{item.name}</span>
                      </div>
                      <span className="tabular-nums text-[var(--admin-text-muted)] shrink-0 ml-4">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--admin-text-muted)]">Sin detalle disponible</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--admin-border)]/40 pl-6">
                <div className="space-y-0.5">
                  {order.payment_splits && order.payment_splits.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.payment_splits.map((s, i) => (
                        <span key={i} className="text-xs text-[var(--admin-text-muted)]">
                          {formatPaymentMethod(s.method)}: {formatPrice(s.amount)}
                        </span>
                      ))}
                    </div>
                  )}
                  {order.notes && (
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      Nota: {order.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isCancelled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        printClientTicketAction(order.id)
                          .then((r) => { if (r.error) toast.error(r.error) })
                          .catch(() => toast.error('Error al imprimir'))
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-[var(--admin-surface-2)] hover:bg-[var(--admin-border)] transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Ticket
                    </button>
                  )}
                  {!isCancelled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCancelOrder(order.id)
                      }}
                      className="h-7 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 active:scale-95 transition-all"
                    >
                      Anular
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}

// ─── Totalizador por método de pago ───────────────────────────────────────────

function PaymentSummaryRow({
  method,
  total,
  count,
}: {
  method: PaymentMethod
  total: number
  count: number
}) {
  if (count === 0) return null

  const config = PAYMENT_ICON_CONFIG[method]
  const Icon = config?.icon ?? Banknote

  return (
    <div className="flex items-center justify-between text-xs">
      <div className={cn('flex items-center gap-1.5', config?.textClass ?? 'text-[var(--admin-text-muted)]')}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{config?.label ?? method}</span>
        <span className="text-[var(--admin-text-faint)]">({count})</span>
      </div>
      <span className="tabular-nums font-semibold text-[var(--admin-text)]">{formatPrice(total)}</span>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PosHistorialTab({
  orders,
  loading,
  onCancelOrder,
}: PosHistorialTabProps) {
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const isCancelled = order.status === 'cancelado'
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'anulada' && isCancelled) ||
        (statusFilter === 'activa' && !isCancelled)
      if (!matchesStatus) return false
      if (paymentFilter === 'all') return true
      if (order.payment_splits && order.payment_splits.length > 1) {
        return order.payment_splits.some((s) => s.method === paymentFilter)
      }
      return order.payment_method === paymentFilter
    })
  }, [orders, paymentFilter, statusFilter])

  const paymentTotals = useMemo(() => {
    const active = filteredOrders.filter((o) => o.status !== 'cancelado')
    const totals: Record<string, { total: number; count: number }> = {}
    for (const order of active) {
      if (order.payment_splits && order.payment_splits.length > 1) {
        for (const split of order.payment_splits) {
          if (!totals[split.method]) totals[split.method] = { total: 0, count: 0 }
          totals[split.method].total += split.amount
        }
        const primary = order.payment_method
        if (!totals[primary]) totals[primary] = { total: 0, count: 0 }
        totals[primary].count += 1
      } else {
        const key = order.payment_method
        if (!totals[key]) totals[key] = { total: 0, count: 0 }
        totals[key].total += order.total
        totals[key].count += 1
      }
    }
    return totals
  }, [filteredOrders])

  const grandTotal = useMemo(
    () =>
      filteredOrders
        .filter((o) => o.status !== 'cancelado')
        .reduce((sum, o) => sum + o.total, 0),
    [filteredOrders]
  )

  const statusCounts = useMemo(() => ({
    all: orders.length,
    activa: orders.filter((o) => o.status !== 'cancelado').length,
    anulada: orders.filter((o) => o.status === 'cancelado').length,
  }), [orders])

  const paymentCounts = useMemo(() => {
    const counts: Record<PaymentFilter, number> = {
      all: orders.length,
      cash: 0,
      card: 0,
      transfer: 0,
      mercadopago: 0,
    }
    for (const order of orders) {
      if (order.payment_splits && order.payment_splits.length > 1) {
        const methods = new Set(order.payment_splits.map((s) => s.method))
        methods.forEach((m) => {
          if (m in counts) counts[m as PaymentFilter]++
        })
      } else if (order.payment_method in counts) {
        counts[order.payment_method as PaymentFilter]++
      }
    }
    return counts
  }, [orders])

  const hasActiveFilters = paymentFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    setPaymentFilter('all')
    setStatusFilter('all')
  }

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'activa', label: 'Pagadas' },
    { value: 'anulada', label: 'Anuladas' },
  ]

  const paymentTabs: { value: PaymentFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'mercadopago', label: 'Mercado Pago' },
  ]

  return (
    <div className="flex flex-col h-full bg-[var(--admin-bg)] overflow-hidden">

      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-[var(--admin-border)] bg-[var(--admin-surface)]">
        <p className="text-[var(--admin-text-muted)] text-sm">
          {filteredOrders.length} {filteredOrders.length === 1 ? 'venta' : 'ventas'}
        </p>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
          >
            <X className="h-3 w-3" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Status tabs — orders-table style */}
      <div className="shrink-0 flex items-center gap-0 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] overflow-x-auto no-scrollbar px-2">
        {statusTabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer',
              statusFilter === value
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent-text)]'
                : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            )}
          >
            {label}
            {statusCounts[value] > 0 && (
              <span
                className={cn(
                  'ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium',
                  statusFilter === value
                    ? 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent-text)]'
                    : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)]'
                )}
              >
                {statusCounts[value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Payment method tabs */}
      <div className="shrink-0 flex items-center gap-0 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] overflow-x-auto no-scrollbar px-2">
        {paymentTabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPaymentFilter(value)}
            className={cn(
              'px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer',
              paymentFilter === value
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent-text)]'
                : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            )}
          >
            {label}
            {paymentCounts[value] > 0 && (
              <span
                className={cn(
                  'ml-1 text-[10px] px-1 py-0.5 rounded-full font-medium tabular-nums',
                  paymentFilter === value
                    ? 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent-text)]'
                    : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)]'
                )}
              >
                {paymentCounts[value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla / estados vacíos */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-6 w-6 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-16">
            {orders.length === 0 ? (
              <>
                <ClipboardList className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--admin-text-muted)]">
                    No hay ventas registradas en esta sesión
                  </p>
                  <p className="text-xs text-[var(--admin-text-faint)] mt-1">
                    Las ventas del turno aparecerán aquí
                  </p>
                </div>
              </>
            ) : (
              <>
                <SearchX className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--admin-text-muted)]">Sin resultados</p>
                  <p className="text-xs text-[var(--admin-text-faint)] mt-1">
                    No se encontraron ventas con los filtros aplicados
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-[var(--admin-accent-text)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 text-xs h-8"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-[var(--admin-surface)]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-8')} />
                  <TableHead className={TABLE_HEAD_CLASS}>Hora</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Detalle</TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'hidden sm:table-cell')}>Método</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Total</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onCancelOrder={onCancelOrder}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Footer: resumen totales por método */}
      {filteredOrders.length > 0 && (
        <div className="shrink-0 border-t border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              {(Object.keys(paymentTotals) as PaymentMethod[]).map((method) => (
                <PaymentSummaryRow
                  key={method}
                  method={method}
                  total={paymentTotals[method].total}
                  count={paymentTotals[method].count}
                />
              ))}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-[var(--admin-text-faint)] font-medium mb-0.5">Total sesión</p>
              <p className="tabular-nums text-xl font-bold text-[var(--admin-accent-text)]">
                {formatPrice(grandTotal)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
