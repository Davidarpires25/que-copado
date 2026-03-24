'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Printer, Banknote, CreditCard, Zap, QrCode,
  Loader2, AlertTriangle, Check, ChefHat,
} from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { clampAmountForSplitMethod } from '@/lib/utils/payment-split'
import type { PaymentMethod, Order } from '@/lib/types/database'
import type { PaymentSplit } from '@/lib/types/cash-register'
import type { OrderItem } from '@/lib/types/orders'
import { checkStockForItems } from '@/app/actions/stock'
import type { StockWarning } from '@/app/actions/stock'
import { printKitchenTicketAction } from '@/app/actions/print'
import { toast } from 'sonner'

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'cash',        label: 'Efectivo',     icon: Banknote },
  { value: 'card',        label: 'Tarjeta',       icon: CreditCard },
  { value: 'transfer',    label: 'Transferencia', icon: Zap },
  { value: 'mercadopago', label: 'Mercado Pago',  icon: QrCode },
]

interface ActivePayment {
  method: PaymentMethod
  amount: number
}

interface PendingOrderPayViewProps {
  order: Order
  loading: boolean
  onBack: () => void
  onPrint: () => void
  onConfirm: (method: PaymentMethod, splits?: PaymentSplit[]) => void
}

export function PendingOrderPayView({ order, loading, onBack, onPrint, onConfirm }: PendingOrderPayViewProps) {
  const [activePayments, setActivePayments] = useState<ActivePayment[]>([])
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([])
  const [stockChecking, setStockChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const total = order.total
  const orderItems = (order.items as OrderItem[] | null) ?? []

  const coveredAmount = activePayments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, total - coveredAmount)
  const isComplete = coveredAmount >= total - 0.01
  const isSplit = activePayments.length > 1
  const hasStockWarnings = stockWarnings.length > 0

  // Cash overpay → show change
  const cashEntry = activePayments.find(p => p.method === 'cash')
  const change = cashEntry && isComplete ? Math.max(0, coveredAmount - total) : 0

  // Reset when order changes
  useEffect(() => {
    setActivePayments([])
    setEditingMethod(null)
    setEditAmount('')
  }, [order.id])

  // Focus input when editing starts
  useEffect(() => {
    if (editingMethod) setTimeout(() => inputRef.current?.focus(), 30)
  }, [editingMethod])

  // Stock check
  useEffect(() => {
    const stockItems = orderItems
      .filter((i): i is OrderItem & { id: string } => !!i.id)
      .map(i => ({ product_id: i.id, quantity: i.quantity }))
    if (stockItems.length === 0) { setStockWarnings([]); return }
    let cancelled = false
    const run = async () => {
      setStockChecking(true)
      try {
        const result = await checkStockForItems(stockItems)
        if (!cancelled) setStockWarnings(result.data ?? [])
      } catch { /* graceful */ }
      finally { if (!cancelled) setStockChecking(false) }
    }
    void run()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id])

  const commitEdit = (method: PaymentMethod) => {
    const num = parseFloat(editAmount) || 0
    setActivePayments((prev) => {
      if (num <= 0) {
        return prev.filter((p) => p.method !== method)
      }
      const otherSum = prev.filter((p) => p.method !== method).reduce((s, p) => s + p.amount, 0)
      const amount = clampAmountForSplitMethod(method, num, otherSum, total)
      if (amount <= 0) {
        return prev.filter((p) => p.method !== method)
      }
      return prev.map((p) => (p.method === method ? { ...p, amount } : p))
    })
    setEditingMethod(null)
    setEditAmount('')
  }

  const handleToggleRow = (method: PaymentMethod) => {
    // If currently editing another method, commit it first
    if (editingMethod && editingMethod !== method) {
      commitEdit(editingMethod)
    }

    const isActive = activePayments.some(p => p.method === method)
    if (isActive) {
      // Deactivate
      setActivePayments(prev => prev.filter(p => p.method !== method))
      if (editingMethod === method) { setEditingMethod(null); setEditAmount('') }
    } else {
      // No sumar otro medio si el total ya está cubierto (evita duplicar importe)
      if (remaining <= 0.01 && activePayments.length > 0) return
      const defaultAmount = remaining
      setActivePayments(prev => [...prev, { method, amount: defaultAmount }])
      setEditAmount(defaultAmount.toFixed(0))
      setEditingMethod(method)
    }
  }

  const handleAmountPillClick = (e: React.MouseEvent, method: PaymentMethod) => {
    e.stopPropagation()
    if (editingMethod === method) return
    if (editingMethod) commitEdit(editingMethod)
    const entry = activePayments.find(p => p.method === method)
    if (!entry) return
    setEditAmount(entry.amount.toFixed(0))
    setEditingMethod(method)
  }

  const handleConfirm = () => {
    if (!isComplete || loading || activePayments.length === 0) return
    if (editingMethod) commitEdit(editingMethod)
    if (activePayments.length === 1) {
      onConfirm(activePayments[0].method)
    } else {
      onConfirm(activePayments[0].method, activePayments)
    }
  }

  const orderNum = order.id.slice(-4).toUpperCase()

  return (
    <div className="flex flex-col h-full bg-[var(--admin-surface)]">

      {/* Header: back arrow | title | printer */}
      <div
        className="flex items-center justify-between px-5 shrink-0 border-b border-[var(--admin-border)]"
        style={{ height: 52 }}
      >
        <span className="text-[15px] font-bold text-[var(--admin-text)]">
          Pedido <span className="text-[var(--admin-accent-text)]">#{orderNum}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => printKitchenTicketAction(order.id).then(r => { if (r.error) toast.error(r.error) })}
            className="text-[var(--admin-text-muted)] hover:text-orange-400 transition-colors cursor-pointer p-1"
            aria-label="Imprimir comanda cocina"
            title="Comanda cocina"
          >
            <ChefHat className="h-4 w-4" />
          </button>
          <button
            onClick={onPrint}
            className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer p-1"
            aria-label="Imprimir ticket"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Items — read-only, inset borders, takes remaining space */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5">
        {orderItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between py-2.5 border-b border-[var(--admin-border)]"
          >
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-[13px] font-medium text-[var(--admin-text)] truncate">{item.name}</p>
              <p className="text-[11px] mt-0.5 text-[var(--admin-text-muted)]">{formatPrice(item.price)} c/u</p>
            </div>
            <span className="text-[12px] font-semibold text-[var(--admin-text-muted)] tabular-nums mr-3 shrink-0">
              ×{item.quantity}
            </span>
            <p
              className="text-[13px] font-semibold tabular-nums text-right shrink-0 text-[var(--admin-text)]"
              style={{ width: 56 }}
            >
              {formatPrice(item.price * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      {/* Full-width divider */}
      <div className="h-px bg-[var(--admin-border)] shrink-0" />

      {/* Payment methods section */}
      <div className="px-5 py-4 space-y-2.5 shrink-0">
        {/* Section label + split badge */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--admin-text-muted)]">
            Métodos de pago
          </span>
          {isSplit && (
            <span className="text-[10px] font-bold text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/10 px-2 py-0.5 rounded-full">
              Pago dividido
            </span>
          )}
        </div>

        {PAYMENT_METHODS.map(({ value, label }) => {
          const entry = activePayments.find(p => p.method === value)
          const isActive = !!entry
          const isEditing = editingMethod === value

          return (
            <div
              key={value}
              onClick={() => handleToggleRow(value)}
              className={cn(
                'flex items-center justify-between rounded-xl px-3 cursor-pointer transition-all select-none',
                isActive
                  ? 'bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/35'
                  : 'bg-[var(--admin-surface-2)] border border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)]'
              )}
              style={{ height: 40 }}
            >
              {/* Checkbox + label */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all',
                  isActive ? 'bg-[var(--admin-accent)]' : 'border-[1.5px] border-[var(--admin-text-muted)]/40'
                )}>
                  {isActive && <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />}
                </div>
                <span className={cn(
                  'text-[13px] font-semibold',
                  isActive ? 'text-[var(--admin-text)]' : 'text-[var(--admin-text-muted)]'
                )}>
                  {label}
                </span>
              </div>

              {/* Amount pill or dash */}
              {isActive ? (
                isEditing ? (
                  <input
                    ref={inputRef}
                    type="number"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                      e.stopPropagation()
                      if (e.key === 'Enter') commitEdit(value)
                      if (e.key === 'Escape') { setEditingMethod(null); setEditAmount('') }
                    }}
                    onBlur={() => commitEdit(value)}
                    className="w-28 h-10 text-right text-[14px] font-bold tabular-nums px-2.5 rounded-md bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-accent-text)] outline-none focus:border-[var(--admin-accent)]/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                ) : (
                  <button
                    onClick={e => handleAmountPillClick(e, value)}
                    className="h-10 min-w-[72px] px-2.5 rounded-md bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[14px] font-bold tabular-nums text-[var(--admin-accent-text)] hover:border-[var(--admin-accent)]/40 transition-colors cursor-pointer"
                  >
                    {formatPrice(entry.amount)}
                  </button>
                )
              ) : (
                <span className="text-[13px] text-[var(--admin-text-muted)]">—</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Full-width divider */}
      <div className="h-px bg-[var(--admin-border)] shrink-0" />

      {/* Totals */}
      <div className="px-5 py-4 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-[var(--admin-text-muted)]">Subtotal</span>
          <span className="text-[14px] tabular-nums text-[var(--admin-text)]">{formatPrice(total)}</span>
        </div>
        {change > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-green-400">Vuelto</span>
            <span className="text-[14px] font-semibold tabular-nums text-green-400">{formatPrice(change)}</span>
          </div>
        )}
        {!isComplete && activePayments.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--admin-text-muted)]">Restante</span>
            <span className="text-[13px] font-semibold tabular-nums text-amber-400">{formatPrice(remaining)}</span>
          </div>
        )}
        <div className="h-px bg-[var(--admin-border)]" />
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[18px] font-bold text-[var(--admin-text)]">Total</span>
          <span className="text-[18px] font-bold tabular-nums text-[var(--admin-accent-text)]">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {/* Stock warnings */}
      {(stockChecking || hasStockWarnings) && (
        <div className="px-5 pb-2 shrink-0">
          {stockChecking && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--admin-surface-2)] border border-[var(--admin-border)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--admin-text-muted)]" />
              <span className="text-xs text-[var(--admin-text-muted)]">Verificando stock...</span>
            </div>
          )}
          {!stockChecking && hasStockWarnings && (
            <div className="rounded-xl bg-amber-950/50 border border-amber-500/40 px-3 py-2.5 space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs font-semibold text-amber-300">Stock insuficiente</p>
              </div>
              {stockWarnings.map(w => (
                <p key={w.product_id} className="text-xs text-amber-200 pl-6">
                  {w.product_name}: {w.available === 0 ? 'sin stock' : `${w.available} disponibles`}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Imprimir Ticket row — Pencil #F5F6FA bg */}
      <div
        onClick={onPrint}
        className="flex items-center justify-center gap-2 shrink-0 border-t border-[var(--admin-border)] cursor-pointer hover:bg-[var(--admin-hover)] transition-colors bg-[var(--admin-surface-2)]"
        style={{ height: 44 }}
      >
        <Printer className="h-4 w-4 text-[var(--admin-text-muted)]" />
        <span className="text-[13px] font-medium text-[var(--admin-text-muted)]">Imprimir Ticket</span>
      </div>

      {/* Cobrar — flush full width */}
      <button
        onClick={handleConfirm}
        disabled={!isComplete || loading || activePayments.length === 0}
        className={cn(
          'flex items-center justify-center gap-2 shrink-0 font-bold text-base transition-all cursor-pointer',
          'disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:brightness-95',
          hasStockWarnings ? 'bg-amber-500 text-black' : 'bg-[var(--admin-accent)] text-black'
        )}
        style={{ height: 52 }}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : activePayments.length === 0 ? (
          'Seleccioná un método'
        ) : !isComplete ? (
          `Faltan ${formatPrice(remaining)}`
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            {`Cobrar ${formatPrice(total)}`}
          </>
        )}
      </button>
    </div>
  )
}
