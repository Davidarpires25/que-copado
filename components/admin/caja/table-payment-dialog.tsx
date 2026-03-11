'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, Banknote, CreditCard, Zap, QrCode, Users, UtensilsCrossed, CheckCircle2, Circle, SplitSquareVertical } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { payTableOrder } from '@/app/actions/tables'
import type { Order, PaymentMethod } from '@/lib/types/database'
import type { PaymentSplit } from '@/lib/types/cash-register'
import type { OrderWithItems, RestaurantTable } from '@/lib/types/tables'
import { checkStockForItems } from '@/app/actions/stock'
import type { StockWarning } from '@/app/actions/stock'

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: Zap },
  { value: 'mercadopago', label: 'Mercado Pago', icon: QrCode },
]

type PayMode = 'full' | 'per_guest'

interface TablePaymentDialogProps {
  open: boolean
  order: OrderWithItems
  table: RestaurantTable
  sessionId: string
  onClose: () => void
  onPaid: () => void
}

export function TablePaymentDialog({
  open,
  order,
  table,
  sessionId,
  onClose,
  onPaid,
}: TablePaymentDialogProps) {
  const [payMode, setPayMode] = useState<PayMode>('full')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [loading, setLoading] = useState(false)
  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([])
  const [stockChecking, setStockChecking] = useState(false)
  // Per-guest: method selected for each sale_tag
  const [guestMethods, setGuestMethods] = useState<Record<string, PaymentMethod>>({})

  const total = order.total
  const cashAmount = parseFloat(cashReceived) || 0
  const change = method === 'cash' ? cashAmount - total : 0

  const canConfirm = method !== 'cash' || cashAmount >= total

  const hasStockWarnings = stockWarnings.length > 0

  const activeItems = order.order_items.filter(
    (item) => item.status !== 'cancelado'
  )

  useEffect(() => {
    if (!open) return

    const itemsToCheck = activeItems
      .filter((item) => item.product_id)
      .map((item) => ({ product_id: item.product_id!, quantity: item.quantity }))

    if (itemsToCheck.length === 0) {
      setStockWarnings([])
      return
    }

    let cancelled = false

    const run = async () => {
      setStockChecking(true)
      try {
        const result = await checkStockForItems(itemsToCheck)
        if (!cancelled) {
          setStockWarnings(result.data ?? [])
        }
      } catch {
        // Graceful degradation: nunca bloquear el flujo del POS
      } finally {
        if (!cancelled) setStockChecking(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [open])

  const handleConfirm = async () => {
    if (loading) return

    setLoading(true)

    let result: { data: Order | null; error: string | null }

    if (payMode === 'per_guest' && guestTags.length > 0) {
      // Build splits from per-guest methods
      const splits: PaymentSplit[] = guestTags.map(({ tag, subtotal }) => ({
        amount: subtotal,
        method: guestMethods[tag] ?? 'cash',
      }))
      // Primary method = highest amount split
      const primaryMethod = splits.reduce((a, b) => (a.amount >= b.amount ? a : b)).method
      result = await payTableOrder(order.id, table.id, primaryMethod, sessionId, splits)
    } else {
      if (!canConfirm) { setLoading(false); return }
      result = await payTableOrder(order.id, table.id, method, sessionId)
    }

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(`Mesa ${table.number} cobrada correctamente`)
    onPaid()
  }

  // Convenience: method for a tag (defaults to 'cash')
  const getGuestMethod = (tag: string): PaymentMethod => guestMethods[tag] ?? 'cash'
  const setGuestMethod = (tag: string, m: PaymentMethod) =>
    setGuestMethods((prev) => ({ ...prev, [tag]: m }))

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
    } else {
      setPayMode('full')
      setMethod('cash')
      setCashReceived('')
      setStockWarnings([])
      setGuestMethods({})
    }
  }

  // Tags with their item subtotals
  const guestTags = (() => {
    const tagMap = new Map<string, number>()
    for (const item of activeItems) {
      const tag = item.sale_tag ?? '(Sin asignar)'
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + item.product_price * item.quantity)
    }
    return Array.from(tagMap.entries()).map(([tag, subtotal]) => ({ tag, subtotal }))
  })()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-md max-h-[90vh] overflow-y-auto shadow-xl shadow-black/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[var(--admin-text)]">
            Cobrar Mesa {table.number}
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex rounded-xl border border-[var(--admin-border)] overflow-hidden bg-[var(--admin-surface-2)] p-1 gap-1">
          <button
            onClick={() => setPayMode('full')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer',
              payMode === 'full'
                ? 'bg-[var(--admin-accent)] text-black shadow-sm'
                : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            )}
          >
            <UtensilsCrossed className="h-4 w-4" />
            Mesa completa
          </button>
          <button
            onClick={() => guestTags.length > 0 && setPayMode('per_guest')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer',
              payMode === 'per_guest'
                ? 'bg-[var(--admin-accent)] text-black shadow-sm'
                : guestTags.length > 0
                  ? 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                  : 'text-[var(--admin-text-faint)] cursor-not-allowed opacity-50'
            )}
            title={guestTags.length === 0 ? 'No hay comensales registrados' : undefined}
          >
            <Users className="h-4 w-4" />
            Por comensal
            {guestTags.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/10">
                {guestTags.length}
              </span>
            )}
          </button>
        </div>

        <div className="space-y-5">
          {/* ── Vista: Por comensal ── */}
          {payMode === 'per_guest' && (
            <div className="space-y-4">
              {/* Guest list with method selectors */}
              <div className="space-y-3">
                {guestTags.map(({ tag, subtotal }) => {
                  const guestMethod = getGuestMethod(tag)
                  const displayTag = tag === '(Sin asignar)' ? 'Sin asignar' : tag
                  return (
                    <div
                      key={tag}
                      className="bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)] overflow-hidden"
                    >
                      {/* Guest header */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--admin-border)]">
                        <div className="flex items-center gap-2">
                          <Circle className="h-3.5 w-3.5 text-[var(--admin-text-faint)]" />
                          <p className="text-sm font-semibold text-[var(--admin-text)]">{displayTag}</p>
                        </div>
                        <span className="text-sm font-bold text-[var(--admin-accent-text)]">
                          {formatPrice(subtotal)}
                        </span>
                      </div>
                      {/* Method selector — compact 2×2 */}
                      <div className="grid grid-cols-4 gap-px bg-[var(--admin-border)]">
                        {PAYMENT_OPTIONS.map((opt) => {
                          const Icon = opt.icon
                          const selected = guestMethod === opt.value
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setGuestMethod(tag, opt.value)}
                              className={cn(
                                'flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors cursor-pointer',
                                selected
                                  ? 'bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)]'
                                  : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-faint)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]'
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span>{opt.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total breakdown */}
              <div className="bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)] px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--admin-text-muted)]">Total a cobrar</p>
                  <p className="text-lg font-bold text-[var(--admin-accent-text)]">{formatPrice(total)}</p>
                </div>
                {/* Method summary */}
                {(() => {
                  const byMethod: Record<string, number> = {}
                  for (const { tag, subtotal } of guestTags) {
                    const m = getGuestMethod(tag)
                    byMethod[m] = (byMethod[m] ?? 0) + subtotal
                  }
                  return Object.entries(byMethod).map(([m, amt]) => {
                    const opt = PAYMENT_OPTIONS.find((o) => o.value === m)
                    return (
                      <div key={m} className="flex items-center justify-between">
                        <p className="text-xs text-[var(--admin-text-faint)]">{opt?.label ?? m}</p>
                        <p className="text-xs font-medium text-[var(--admin-text-muted)]">{formatPrice(amt)}</p>
                      </div>
                    )
                  })
                })()}
              </div>

              {/* Confirm per-guest */}
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full h-14 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform shadow-lg bg-green-600 hover:bg-green-500 shadow-green-600/20"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <SplitSquareVertical className="h-4 w-4" />
                    Confirmar cobro dividido
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* ── Vista: Mesa completa ── */}
          {payMode === 'full' && (
            <>
              {/* Item breakdown */}
              <div className="bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[var(--admin-border)]">
                  <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">
                    Detalle del pedido
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {activeItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2 border-b border-[var(--admin-border)]/50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--admin-text)] truncate">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-[var(--admin-text-faint)]">
                          {item.quantity} x {formatPrice(item.product_price)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[var(--admin-text)] ml-3">
                        {formatPrice(item.product_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="text-center py-3 bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)]">
                <p className="text-sm text-[var(--admin-text-muted)]">Total a cobrar</p>
                <p className="text-3xl font-bold text-[var(--admin-accent-text)]">
                  {formatPrice(total)}
                </p>
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--admin-text-muted)]">
                  Método de pago
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setMethod(opt.value)
                          setCashReceived('')
                        }}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all active:scale-95 cursor-pointer',
                          method === opt.value
                            ? 'bg-[var(--admin-accent)]/10 border-[var(--admin-accent)] text-[var(--admin-accent-text)] shadow-lg shadow-[var(--admin-accent)]/10'
                            : 'bg-[var(--admin-surface-2)] border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:border-[var(--admin-text-placeholder)] hover:text-[var(--admin-text)]'
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-semibold">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Cash calculation — solo en mesa completa */}
          {payMode === 'full' && method === 'cash' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--admin-text-muted)]">
                  Recibido
                </label>
                <Input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0"
                  className="bg-[var(--admin-surface-2)] border-[var(--admin-border)] text-[var(--admin-text)] text-xl h-12 text-center font-bold placeholder:text-[var(--admin-text-placeholder)] focus:border-[var(--admin-accent)]/50"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                />
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                {[1000, 2000, 5000, 10000, 20000]
                  .filter((v) => v >= total)
                  .slice(0, 3)
                  .map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCashReceived(amount.toString())}
                      className="flex-1 py-2 rounded-lg bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] text-sm font-medium hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] transition-colors"
                    >
                      {formatPrice(amount)}
                    </button>
                  ))}
              </div>

              {cashAmount > 0 && (
                <div
                  className={cn(
                    'text-center py-2 rounded-lg',
                    change >= 0
                      ? 'bg-green-950/40 border border-green-800/40 text-green-300'
                      : 'bg-red-950/40 border border-red-800/40 text-red-300'
                  )}
                >
                  <p className="text-sm">Vuelto</p>
                  <p className="text-2xl font-bold">
                    {formatPrice(Math.max(0, change))}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stock warning banner — solo en mesa completa */}
          {payMode === 'full' && stockChecking && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--admin-surface-2)] border border-[var(--admin-border)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--admin-text-muted)] shrink-0" />
              <span className="text-sm text-[var(--admin-text-muted)]">Verificando stock...</span>
            </div>
          )}

          {payMode === 'full' && !stockChecking && hasStockWarnings && (
            <div className="rounded-xl bg-amber-950/50 border border-amber-500/40 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-sm font-semibold text-amber-300">
                  Stock insuficiente para este pedido
                </p>
              </div>
              <ul className="space-y-1 pl-6">
                {stockWarnings.map((w) => (
                  <li key={w.product_id} className="text-sm text-amber-200">
                    {w.available === 0
                      ? `${w.product_name}: pediste ${w.requested}, sin stock`
                      : `${w.product_name}: pediste ${w.requested}, hay ${w.available} disponibles`}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-200/70">
                Podés confirmar igual. La venta se registra pero el stock quedará en negativo.
              </p>
            </div>
          )}

          {/* Confirm button — solo en mesa completa */}
          {payMode === 'full' && (
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || loading}
              className={cn(
                'w-full h-14 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform shadow-lg',
                hasStockWarnings
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  : 'bg-green-600 hover:bg-green-500 shadow-green-600/20'
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : hasStockWarnings ? (
                `Confirmar con stock insuficiente · ${PAYMENT_OPTIONS.find((o) => o.value === method)?.label}`
              ) : (
                `Confirmar ${PAYMENT_OPTIONS.find((o) => o.value === method)?.label}`
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
