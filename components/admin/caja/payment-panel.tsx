'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, Banknote, CreditCard, Zap, QrCode, SplitSquareVertical, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatPrice } from '@/lib/utils'
import type { PaymentMethod } from '@/lib/types/database'
import type { PaymentSplit } from '@/lib/types/cash-register'
import { checkStockForItems } from '@/app/actions/stock'
import type { StockCheckItem, StockWarning } from '@/app/actions/stock'

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: Zap },
  { value: 'mercadopago', label: 'Mercado Pago', icon: QrCode },
]

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
}

interface PaymentPanelProps {
  open: boolean
  total: number
  loading: boolean
  items?: StockCheckItem[]
  onClose: () => void
  onConfirm: (method: PaymentMethod, splits?: PaymentSplit[]) => void
}

export function PaymentPanel({
  open,
  total,
  loading,
  items = [],
  onClose,
  onConfirm,
}: PaymentPanelProps) {
  // ── Single-method state ──
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState('')

  // ── Split (hybrid) state ──
  const [splitMode, setSplitMode] = useState(false)
  const [splits, setSplits] = useState<PaymentSplit[]>([])
  const [splitMethod, setSplitMethod] = useState<PaymentMethod>('cash')
  const [splitAmount, setSplitAmount] = useState('')

  // ── Stock ──
  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([])
  const [stockChecking, setStockChecking] = useState(false)

  const cashAmount = parseFloat(cashReceived) || 0
  const change = method === 'cash' && !splitMode ? cashAmount - total : 0
  const canConfirmSingle = method !== 'cash' || cashAmount >= total
  const hasStockWarnings = stockWarnings.length > 0

  // ── Split derived values ──
  const splitsTotal = splits.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, total - splitsTotal)
  const splitAmountNum = parseFloat(splitAmount) || 0
  const canAddSplit = splitAmountNum > 0 && splitAmountNum <= remaining + 0.01
  const splitsComplete = splitsTotal >= total - 0.01

  // ── Handlers ──
  const handleConfirm = () => {
    if (loading) return
    if (splitMode) {
      if (!splitsComplete) return
      onConfirm(splits[0]?.method ?? 'cash', splits)
    } else {
      if (!canConfirmSingle) return
      onConfirm(method)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
    } else {
      setMethod('cash')
      setCashReceived('')
      setSplitMode(false)
      setSplits([])
      setSplitMethod('cash')
      setSplitAmount('')
    }
  }

  const handleEnterSplitMode = () => {
    setSplitMode(true)
    setSplits([])
    setSplitMethod('cash')
    setSplitAmount('')
  }

  const handleAddSplit = () => {
    if (!canAddSplit) return
    const amount = Math.min(splitAmountNum, remaining)
    setSplits((prev) => [...prev, { method: splitMethod, amount }])
    setSplitAmount('')
    // Auto-advance to next method if remaining is covered
  }

  const handleRemoveSplit = (idx: number) => {
    setSplits((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleUseExactRemaining = () => {
    setSplitAmount(remaining.toFixed(0))
  }

  useEffect(() => {
    if (!open) return
    if (items.length === 0) { setStockWarnings([]); return }
    let cancelled = false
    const run = async () => {
      setStockChecking(true)
      try {
        const result = await checkStockForItems(items)
        if (!cancelled) setStockWarnings(result.data ?? [])
      } catch { /* graceful degradation */ }
      finally { if (!cancelled) setStockChecking(false) }
    }
    void run()
    return () => { cancelled = true }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-md shadow-xl shadow-black/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[var(--admin-text)]">
            Cobrar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total */}
          <div className="text-center py-3 bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)]">
            <p className="text-sm text-[var(--admin-text-muted)]">Total a cobrar</p>
            <p className="text-3xl font-bold text-[var(--admin-accent-text)]">
              {formatPrice(total)}
            </p>
          </div>

          {/* ── MODO ÚNICO ── */}
          {!splitMode && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--admin-text-muted)]">Método de pago</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.value}
                        onClick={() => { setMethod(opt.value); setCashReceived('') }}
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

              {/* Cash input */}
              {method === 'cash' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[var(--admin-text-muted)]">Recibido</label>
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
                  <div className="flex gap-2">
                    {[1000, 2000, 5000, 10000, 20000]
                      .filter((v) => v >= total)
                      .slice(0, 3)
                      .map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setCashReceived(amount.toString())}
                          className="flex-1 py-2 rounded-lg bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] text-sm font-medium hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] transition-colors cursor-pointer"
                        >
                          {formatPrice(amount)}
                        </button>
                      ))}
                  </div>
                  {cashAmount > 0 && (
                    <div className={cn('text-center py-2 rounded-lg border', change >= 0 ? 'bg-green-950/40 border-green-800/40 text-green-300' : 'bg-red-950/40 border-red-800/40 text-red-300')}>
                      <p className="text-sm">Vuelto</p>
                      <p className="text-2xl font-bold">{formatPrice(Math.max(0, change))}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Split mode trigger */}
              <button
                onClick={handleEnterSplitMode}
                className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer py-1"
              >
                <SplitSquareVertical className="h-3.5 w-3.5" />
                Pago dividido (múltiples métodos)
              </button>
            </>
          )}

          {/* ── MODO SPLIT ── */}
          {splitMode && (
            <div className="space-y-3">
              {/* Splits registered */}
              {splits.length > 0 && (
                <div className="bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)] overflow-hidden">
                  <div className="px-3 py-2 border-b border-[var(--admin-border)]">
                    <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">
                      Pagos registrados
                    </p>
                  </div>
                  {splits.map((s, i) => {
                    const Icon = PAYMENT_OPTIONS.find((o) => o.value === s.method)?.icon ?? Banknote
                    return (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--admin-border)]/50 last:border-0">
                        <Check className="h-4 w-4 text-green-400 shrink-0" />
                        <Icon className="h-4 w-4 text-[var(--admin-text-muted)] shrink-0" />
                        <span className="flex-1 text-sm text-[var(--admin-text)]">{METHOD_LABEL[s.method]}</span>
                        <span className="text-sm font-bold text-[var(--admin-accent-text)]">{formatPrice(s.amount)}</span>
                        <button
                          onClick={() => handleRemoveSplit(i)}
                          className="h-6 w-6 flex items-center justify-center rounded-md text-[var(--admin-text-muted)] hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Remaining badge */}
              <div className={cn(
                'flex items-center justify-between px-4 py-2.5 rounded-xl border font-semibold',
                splitsComplete
                  ? 'bg-green-950/30 border-green-500/30 text-green-400'
                  : 'bg-[var(--admin-surface-2)] border-[var(--admin-border)] text-[var(--admin-text)]'
              )}>
                <span className="text-sm">{splitsComplete ? '¡Cubierto!' : 'Restante'}</span>
                <span className="text-lg">{formatPrice(remaining)}</span>
              </div>

              {/* Add next split — only if not complete */}
              {!splitsComplete && (
                <div className="space-y-2.5 bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)] p-3">
                  <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">
                    Agregar pago
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PAYMENT_OPTIONS.map((opt) => {
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setSplitMethod(opt.value)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all active:scale-95 cursor-pointer',
                            splitMethod === opt.value
                              ? 'bg-[var(--admin-accent)]/10 border-[var(--admin-accent)] text-[var(--admin-accent-text)]'
                              : 'border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-text-placeholder)]'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="font-medium">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={splitAmount}
                      onChange={(e) => setSplitAmount(e.target.value)}
                      placeholder="Monto"
                      className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-center font-bold placeholder:text-[var(--admin-text-placeholder)] focus:border-[var(--admin-accent)]/50"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSplit()}
                      autoFocus={splits.length > 0}
                    />
                    <button
                      onClick={handleUseExactRemaining}
                      className="shrink-0 h-10 px-3 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-text-placeholder)] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      = {formatPrice(remaining)}
                    </button>
                  </div>

                  <button
                    onClick={handleAddSplit}
                    disabled={!canAddSplit}
                    className="w-full h-9 rounded-lg bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/40 text-[var(--admin-accent-text)] text-sm font-semibold disabled:opacity-40 hover:bg-[var(--admin-accent)]/20 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    + Agregar {splitAmount ? formatPrice(splitAmountNum) : ''}
                  </button>
                </div>
              )}

              {/* Exit split mode */}
              <button
                onClick={() => { setSplitMode(false); setSplits([]) }}
                className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
              >
                ← Volver a método único
              </button>
            </div>
          )}

          {/* Stock warning */}
          {stockChecking && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--admin-surface-2)] border border-[var(--admin-border)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--admin-text-muted)] shrink-0" />
              <span className="text-sm text-[var(--admin-text-muted)]">Verificando stock...</span>
            </div>
          )}
          {!stockChecking && hasStockWarnings && (
            <div className="rounded-xl bg-amber-950/50 border border-amber-500/40 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-sm font-semibold text-amber-300">Stock insuficiente para este pedido</p>
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
                Podés confirmar igual. La venta se registra pero el stock queda en negativo.
              </p>
            </div>
          )}

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            disabled={splitMode ? (!splitsComplete || loading) : (!canConfirmSingle || loading)}
            className={cn(
              'w-full h-14 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform shadow-lg',
              hasStockWarnings
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                : 'bg-green-600 hover:bg-green-500 shadow-green-600/20'
            )}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : splitMode ? (
              splitsComplete
                ? `Confirmar pago dividido · ${formatPrice(total)}`
                : `Faltan ${formatPrice(remaining)}`
            ) : hasStockWarnings ? (
              `Confirmar con stock insuficiente · ${METHOD_LABEL[method]}`
            ) : (
              `Confirmar ${METHOD_LABEL[method]}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
