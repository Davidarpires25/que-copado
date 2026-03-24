'use client'

import { useState, useMemo } from 'react'
import { printClientTicketAction } from '@/app/actions/print'
import {
  ChevronDown,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  Store,
  UtensilsCrossed,
  X,
  RotateCcw,
  Check,
  MessageSquare,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import type { PaymentMethod, Json } from '@/lib/types/database'
import type { OrderItem } from '@/lib/types/orders'
import type { OrderWithSplits } from '@/lib/types/cash-register'

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentFilter = 'all' | PaymentMethod
type StatusFilter = 'all' | 'activa' | 'anulada'

interface PosHistorialTabProps {
  orders: OrderWithSplits[]
  loading: boolean
  onRefresh: () => Promise<void>
  onCancelOrder: (orderId: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseOrderItems(items: Json): OrderItem[] {
  if (Array.isArray(items)) return items as unknown as OrderItem[]
  return []
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Payment method badge ─────────────────────────────────────────────────────

const PAYMENT_BADGE_CONFIG: Record<
  PaymentMethod,
  { label: string; icon: React.ElementType; textClass: string; bgClass: string }
> = {
  cash:        { label: 'Efectivo', icon: Banknote,       textClass: 'text-emerald-400', bgClass: 'bg-emerald-400/10 border-emerald-400/20' },
  card:        { label: 'Tarjeta',  icon: CreditCard,     textClass: 'text-sky-400',     bgClass: 'bg-sky-400/10 border-sky-400/20' },
  transfer:    { label: 'Transf.',  icon: ArrowLeftRight, textClass: 'text-violet-400',  bgClass: 'bg-violet-400/10 border-violet-400/20' },
  mercadopago: { label: 'M. Pago',  icon: ArrowLeftRight, textClass: 'text-sky-400',     bgClass: 'bg-sky-400/10 border-sky-400/20' },
}

function PaymentMethodBadge({ method, amount }: { method: PaymentMethod; amount?: number }) {
  const config = PAYMENT_BADGE_CONFIG[method]
  if (!config) return <span className="text-xs text-[var(--admin-text-muted)]">{method}</span>
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${config.textClass} ${config.bgClass}`}>
      <Icon className="h-3 w-3 shrink-0" />
      {config.label}
      {amount !== undefined && (
        <span className="opacity-70">{formatPrice(amount)}</span>
      )}
    </span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ isCancelled }: { isCancelled: boolean }) {
  if (isCancelled) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border text-red-400 bg-red-400/10 border-red-400/20">
        <X className="h-2.5 w-2.5 shrink-0" />
        Anulada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
      <Check className="h-2.5 w-2.5 shrink-0" />
      Pagada
    </span>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

// Columnas: indicador-expand | hora | detalle | método | total | estado
const ROW_GRID = 'grid-cols-[16px_52px_1fr_108px_88px_80px]'

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
  const items = parseOrderItems(order.items)

  const itemsSummary = items
    .slice(0, 3)
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(', ')
  const extraItems = items.length > 3 ? ` +${items.length - 3}` : ''

  return (
    <div className={`transition-opacity ${isCancelled ? 'opacity-55' : ''}`}>
      {/* Fila principal — clickeable para expandir */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className={`w-full grid ${ROW_GRID} gap-2 items-center px-4 py-2.5 text-left cursor-pointer transition-colors duration-150 ${
          isCancelled ? '' : 'hover:bg-[var(--admin-surface-2)]'
        }`}
        aria-expanded={expanded}
      >
        {/* Columna 1: Indicador de expansión */}
        <ChevronDown
          className={`h-3.5 w-3.5 text-[var(--admin-text-faint)] transition-transform duration-200 shrink-0 ${
            expanded ? 'rotate-180' : ''
          }`}
        />

        {/* Columna 2: Hora */}
        <span className="num-tabular text-sm font-medium text-[var(--admin-text)]">
          {formatTime(order.created_at)}
        </span>

        {/* Columna 3: Detalle — dos niveles de jerarquía */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {order.order_type === 'mesa' ? (
              <UtensilsCrossed className="h-3 w-3 text-orange-400 shrink-0" />
            ) : (
              <Store className="h-3 w-3 text-[var(--admin-text-faint)] shrink-0" />
            )}
            <span className="text-xs font-medium text-[var(--admin-text)] truncate">
              {order.order_type === 'mesa'
                ? `Mesa ${order.table_number || ''}`
                : 'Mostrador'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] text-[var(--admin-text-muted)] truncate leading-none">
              {itemsSummary}{extraItems}
            </p>
            {order.notes && (
              <MessageSquare className="h-2.5 w-2.5 text-[var(--admin-accent-text)]/60 shrink-0" />
            )}
          </div>
        </div>

        {/* Columna 4: Método de pago */}
        <div className="flex flex-col gap-0.5">
          {order.payment_splits && order.payment_splits.length > 1 ? (
            order.payment_splits.map((s, i) => (
              <PaymentMethodBadge key={i} method={s.method as PaymentMethod} />
            ))
          ) : (
            <PaymentMethodBadge method={order.payment_method as PaymentMethod} />
          )}
        </div>

        {/* Columna 5: Total */}
        <span
          className={`num-tabular text-sm font-bold text-right ${
            isCancelled
              ? 'line-through text-[var(--admin-text-faint)]'
              : 'text-[var(--admin-accent-text)]'
          }`}
        >
          {formatPrice(order.total)}
        </span>

        {/* Columna 6: Estado */}
        <div className="flex justify-end">
          <StatusBadge isCancelled={isCancelled} />
        </div>
      </button>

      {/* Panel expandido con detalle de items */}
      {expanded && (
        <div className="px-4 pb-3 bg-[var(--admin-bg)]/40 border-t border-[var(--admin-border)]/50">
          <div className="pt-2.5 space-y-1.5 pl-[76px]">
            {items.length > 0 ? (
              items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="num-tabular text-[var(--admin-text-muted)] shrink-0 w-6 text-right">
                      {item.quantity}x
                    </span>
                    <span className="text-[var(--admin-text)] truncate">{item.name}</span>
                  </div>
                  <span className="num-tabular text-[var(--admin-text-muted)] shrink-0 ml-4">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--admin-text-muted)]">Sin detalle disponible</p>
            )}
          </div>

          {/* Notas y acciones */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--admin-border)]/40 pl-[76px]">
            <div className="space-y-0.5">
              {order.payment_splits && order.payment_splits.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {order.payment_splits.map((s, i) => (
                    <span key={i} className="text-xs text-[var(--admin-text-muted)]">
                      <PaymentMethodBadge method={s.method as PaymentMethod} amount={s.amount} />
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
                    printClientTicketAction(order.id).then(r => { if (r.error) toast.error(r.error) })
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
      )}
    </div>
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

  const config = PAYMENT_BADGE_CONFIG[method]
  const Icon = config?.icon ?? Banknote

  return (
    <div className="flex items-center justify-between text-xs">
      <div className={`flex items-center gap-1.5 ${config?.textClass ?? 'text-[var(--admin-text-muted)]'}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{config?.label ?? method}</span>
        <span className="text-[var(--admin-text-faint)]">({count})</span>
      </div>
      <span className="num-tabular font-semibold text-[var(--admin-text)]">{formatPrice(total)}</span>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PosHistorialTab({
  orders,
  loading,
  onRefresh,
  onCancelOrder,
}: PosHistorialTabProps) {
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Filtrado reactivo
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const isCancelled = order.status === 'cancelado'
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'anulada' && isCancelled) ||
        (statusFilter === 'activa' && !isCancelled)
      if (!matchesStatus) return false
      if (paymentFilter === 'all') return true
      // Para órdenes híbridas, matchear si alguno de los splits usa el método
      if (order.payment_splits && order.payment_splits.length > 1) {
        return order.payment_splits.some((s) => s.method === paymentFilter)
      }
      return order.payment_method === paymentFilter
    })
  }, [orders, paymentFilter, statusFilter])

  // Totales por método de pago (sobre las órdenes activas filtradas)
  const paymentTotals = useMemo(() => {
    const active = filteredOrders.filter((o) => o.status !== 'cancelado')
    const totals: Record<string, { total: number; count: number }> = {}
    for (const order of active) {
      if (order.payment_splits && order.payment_splits.length > 1) {
        // Pago híbrido: acumular por split
        for (const split of order.payment_splits) {
          if (!totals[split.method]) totals[split.method] = { total: 0, count: 0 }
          totals[split.method].total += split.amount
        }
        // Contar la orden una sola vez en el método primario
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

  const activeCount = filteredOrders.filter((o) => o.status !== 'cancelado').length
  const cancelledCount = filteredOrders.filter((o) => o.status === 'cancelado').length

  const paymentMethods: { value: PaymentFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'mercadopago', label: 'Mercado Pago' },
  ]

  const filterBtnClass = (active: boolean) =>
    `px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
      active
        ? 'bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)] border border-[var(--admin-accent)]/30'
        : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] border border-transparent hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]'
    }`

  return (
    <div className="flex flex-col h-full bg-[var(--admin-bg)] overflow-hidden">

      {/* ── Barra de filtros ── */}
      <div className="shrink-0 px-4 py-3 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] space-y-2.5">
        {/* Fila 1: método de pago + refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--admin-text-faint)] font-medium shrink-0">Método:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {paymentMethods.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPaymentFilter(value)}
                className={filterBtnClass(paymentFilter === value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Fila 2: estado + contadores */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[var(--admin-text-faint)] font-medium shrink-0">Estado:</span>
          <div className="flex items-center gap-1.5">
            {(
              [
                { value: 'all' as StatusFilter, label: 'Todos' },
                { value: 'activa' as StatusFilter, label: 'Activas' },
                { value: 'anulada' as StatusFilter, label: 'Anuladas' },
              ] as { value: StatusFilter; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={filterBtnClass(statusFilter === value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 ml-auto text-xs text-[var(--admin-text-faint)]">
            <span>
              <span className="num-tabular text-[var(--admin-text)] font-semibold">{activeCount}</span>
              {' '}activas
            </span>
            {cancelledCount > 0 && (
              <span>
                <span className="num-tabular text-red-400 font-semibold">{cancelledCount}</span>
                {' '}anuladas
              </span>
            )}
            {(paymentFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => { setPaymentFilter('all'); setStatusFilter('all') }}
                className="flex items-center gap-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Cabecera de columnas ── */}
      <div className={`shrink-0 grid ${ROW_GRID} gap-2 px-4 py-2 border-b border-[var(--admin-border)] bg-[var(--admin-surface)]`}>
        <span /> {/* spacer para el indicador de expansión */}
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-faint)]">Hora</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-faint)]">Detalle</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-faint)]">Método</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-faint)] text-right">Total</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-faint)] text-right">Estado</span>
      </div>

      {/* ── Lista de órdenes ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-[var(--admin-border)]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-6 w-6 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <p className="text-[var(--admin-text-muted)] text-sm">
              {orders.length === 0
                ? 'No hay ventas registradas en esta sesion'
                : 'Ningun resultado para los filtros seleccionados'}
            </p>
            {(orders.length > 0 && paymentFilter !== 'all') || statusFilter !== 'all' ? (
              <button
                onClick={() => { setPaymentFilter('all'); setStatusFilter('all') }}
                className="text-xs text-[var(--admin-accent-text)] hover:text-[#E5B001] transition-colors cursor-pointer"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onCancelOrder={onCancelOrder}
            />
          ))
        )}
      </div>

      {/* ── Footer: resumen totales por método ── */}
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
              <p className="text-xs text-[var(--admin-text-faint)] font-medium mb-0.5">Total sesion</p>
              <p className="num-tabular text-xl font-bold text-[var(--admin-accent-text)]">
                {formatPrice(grandTotal)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
