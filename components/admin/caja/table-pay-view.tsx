'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ArrowLeft, Users, Banknote, CreditCard, Zap, QrCode,
  Loader2, AlertTriangle, Printer, CreditCard as CreditCardIcon, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import { payTableOrder } from '@/app/actions/tables'
import { printClientTicketAction } from '@/app/actions/print'
import { checkStockForItems } from '@/app/actions/stock'
import type { StockWarning } from '@/app/actions/stock'
import type { PaymentMethod, Order } from '@/lib/types/database'
import type { PaymentSplit, CashRegisterSession } from '@/lib/types/cash-register'
import type { OrderWithItems, RestaurantTable } from '@/lib/types/tables'

type PayMode = 'full' | 'per_guest'

const PAYMENT_METHODS: { value: PaymentMethod; label: string; shortLabel: string; icon: React.ElementType; color: string; bg: string; border: string }[] = [
  { value: 'cash', label: 'Efectivo', shortLabel: 'Ef', icon: Banknote, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  { value: 'card', label: 'Tarjeta', shortLabel: 'Tarj', icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  { value: 'transfer', label: 'Transferencia', shortLabel: 'Transf', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  { value: 'mercadopago', label: 'Mercado Pago', shortLabel: 'MP', icon: QrCode, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
]

const GUEST_COLORS = [
  { dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-400/12' },
  { dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-400/12' },
  { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/12' },
  { dot: 'bg-purple-400', text: 'text-purple-400', bg: 'bg-purple-400/12' },
  { dot: 'bg-pink-400', text: 'text-pink-400', bg: 'bg-pink-400/12' },
]

interface TablePayViewProps {
  order: OrderWithItems
  table: RestaurantTable
  session: CashRegisterSession
  sectionLabel: string
  onBack: () => void
  onPaid: () => void
}

export function TablePayView({
  order,
  table,
  session,
  sectionLabel,
  onBack,
  onPaid,
}: TablePayViewProps) {
  const [payMode, setPayMode] = useState<PayMode>('full')
  // Hybrid payment (full mode)
  const [activePayments, setActivePayments] = useState<{ method: PaymentMethod; amount: number }[]>([])
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const amountInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([])
  const [stockChecking, setStockChecking] = useState(false)
  const [guestMethods, setGuestMethods] = useState<Record<string, PaymentMethod>>({})

  const total = order.total
  const coveredAmount = activePayments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, total - coveredAmount)
  const isComplete = coveredAmount >= total - 0.01
  const isSplit = activePayments.length > 1
  const cashEntry = activePayments.find(p => p.method === 'cash')
  const change = cashEntry && isComplete ? Math.max(0, coveredAmount - total) : 0
  const hasStockWarnings = stockWarnings.length > 0

  const activeItems = useMemo(
    () => order.order_items.filter((item) => item.status !== 'cancelado'),
    [order.order_items]
  )

  // Guest tags with subtotals — only items WITH a real sale_tag
  const guestTags = useMemo(() => {
    const tagMap = new Map<string, number>()
    for (const item of activeItems) {
      if (!item.sale_tag) continue
      tagMap.set(item.sale_tag, (tagMap.get(item.sale_tag) ?? 0) + item.product_price * item.quantity)
    }
    return Array.from(tagMap.entries()).map(([tag, subtotal]) => ({ tag, subtotal }))
  }, [activeItems])

  const hasGuests = guestTags.length > 0

  // Guest method helpers
  const getGuestMethod = (tag: string): PaymentMethod => guestMethods[tag] ?? 'cash'
  const setGuestMethod = (tag: string, m: PaymentMethod) =>
    setGuestMethods((prev) => ({ ...prev, [tag]: m }))

  // Method breakdown for right panel (per_guest)
  const methodBreakdown = useMemo(() => {
    if (payMode !== 'per_guest') return []
    const byMethod: Record<string, number> = {}
    for (const { tag, subtotal } of guestTags) {
      const m = getGuestMethod(tag)
      byMethod[m] = (byMethod[m] ?? 0) + subtotal
    }
    return Object.entries(byMethod).map(([m, amt]) => {
      const opt = PAYMENT_METHODS.find((o) => o.value === m)
      return { method: m, label: opt?.label ?? m, amount: amt, color: opt?.color ?? '' }
    })
  }, [payMode, guestTags, guestMethods])

  // Stock check on mount
  useEffect(() => {
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
        if (!cancelled) setStockWarnings(result.data ?? [])
      } catch {
        // Graceful degradation
      } finally {
        if (!cancelled) setStockChecking(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [activeItems])

  // Focus amount input when editing starts
  useEffect(() => {
    if (editingMethod) setTimeout(() => amountInputRef.current?.focus(), 30)
  }, [editingMethod])

  // Reset payments when switching modes
  useEffect(() => {
    setActivePayments([])
    setEditingMethod(null)
    setEditAmount('')
  }, [payMode])

  const commitEdit = (method: PaymentMethod) => {
    const num = parseFloat(editAmount) || 0
    if (num <= 0) {
      setActivePayments(prev => prev.filter(p => p.method !== method))
    } else {
      setActivePayments(prev => prev.map(p => p.method === method ? { ...p, amount: num } : p))
    }
    setEditingMethod(null)
    setEditAmount('')
  }

  const handleToggleMethod = (method: PaymentMethod) => {
    if (editingMethod && editingMethod !== method) commitEdit(editingMethod)
    const isActive = activePayments.some(p => p.method === method)
    if (isActive) {
      setActivePayments(prev => prev.filter(p => p.method !== method))
      if (editingMethod === method) { setEditingMethod(null); setEditAmount('') }
    } else {
      const defaultAmount = remaining > 0 ? remaining : total
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

  const handleConfirm = async () => {
    if (loading) return
    if (editingMethod) commitEdit(editingMethod)
    setLoading(true)

    let result: { data: Order | null; error: string | null }

    if (payMode === 'per_guest' && guestTags.length > 0) {
      const splits: PaymentSplit[] = guestTags.map(({ tag, subtotal }) => ({
        amount: subtotal,
        method: getGuestMethod(tag),
      }))
      const primaryMethod = splits.reduce((a, b) => (a.amount >= b.amount ? a : b)).method
      result = await payTableOrder(order.id, table.id, primaryMethod, session.id, splits)
    } else {
      if (!isComplete || activePayments.length === 0) { setLoading(false); return }
      const primaryMethod = activePayments.reduce((a, b) => a.amount >= b.amount ? a : b).method
      const splits = isSplit ? activePayments : undefined
      result = await payTableOrder(order.id, table.id, primaryMethod, session.id, splits)
    }

    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    onPaid()
  }

  const handlePrintAll = () => {
    for (const { tag } of guestTags) {
      printClientTicketAction(order.id, { guestTag: tag }).then((r) => { if (r.error) toast.error(r.error) })
    }
  }

  const handlePrintGuest = (tag: string) => {
    printClientTicketAction(order.id, { guestTag: tag }).then((r) => { if (r.error) toast.error(r.error) })
  }

  // Items grouped by guest tag (for per_guest cards) — only real tags
  const itemsByGuest = useMemo(() => {
    const map = new Map<string, typeof activeItems>()
    for (const item of activeItems) {
      if (!item.sale_tag) continue
      const list = map.get(item.sale_tag) ?? []
      list.push(item)
      map.set(item.sale_tag, list)
    }
    return map
  }, [activeItems])

  // Total items for badge
  const totalItemCount = activeItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--admin-bg)] min-w-0">
      <div className="flex-1 flex flex-row min-h-0">
        {/* ── Left Column ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col p-6 gap-5 bg-[var(--admin-bg)] min-h-0">
          {/* Back + Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
              <span className="text-[var(--admin-border)]">/</span>
              <h1 className="text-lg font-bold text-[var(--admin-text)]">
                Cobrar — Mesa {table.number}
              </h1>
            </div>
            {hasGuests && (
              <div className="flex items-center gap-1.5 px-2.5 rounded-full bg-[var(--admin-accent)]/12" style={{ height: 28 }}>
                <Users className="h-3.5 w-3.5 text-[var(--admin-accent-text)]" />
                <span className="text-xs font-semibold text-[var(--admin-accent-text)]">
                  {guestTags.length} comensales
                </span>
              </div>
            )}
          </div>

          {/* Pay mode row */}
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--admin-text-muted)]">Modo de cobro:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPayMode('full')}
                className={cn(
                  'px-4 rounded-full text-[13px] font-semibold transition-all cursor-pointer border',
                  payMode === 'full'
                    ? 'bg-[var(--admin-accent)] text-black border-[var(--admin-accent)]'
                    : 'bg-[var(--admin-surface)] text-[var(--admin-text-muted)] border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)]'
                )}
                style={{ height: 32 }}
              >
                Cuenta única
              </button>
              <button
                onClick={() => hasGuests && setPayMode('per_guest')}
                disabled={!hasGuests}
                className={cn(
                  'px-4 rounded-full text-[13px] font-semibold transition-all cursor-pointer border',
                  payMode === 'per_guest'
                    ? 'bg-[var(--admin-accent)] text-black border-[var(--admin-accent)]'
                    : hasGuests
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text-muted)] border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)]'
                      : 'bg-[var(--admin-surface)] text-[var(--admin-text-faint)] border-[var(--admin-border)] opacity-50 cursor-not-allowed'
                )}
                style={{ height: 32 }}
              >
                Dividir por comensal
              </button>
            </div>
          </div>

          {/* ── Full mode content ─────────────────────────────── */}
          {payMode === 'full' && (
            <div className="flex-1 min-h-0 flex flex-col bg-[var(--admin-surface)] rounded-xl border border-[var(--admin-border)] overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--admin-border)]/60 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[var(--admin-text)]">
                    Cuenta Mesa {table.number}
                  </span>
                </div>
                {totalItemCount > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 rounded-full bg-green-400/10 border border-green-400/20" style={{ height: 24 }}>
                    <span className="text-[11px] font-semibold text-green-400">
                      {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                )}
              </div>

              {/* Items list — scrollable */}
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--admin-border)]/40 min-h-0">
                {activeItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-5 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[var(--admin-text)] truncate">{item.product_name}</p>
                      <p className="text-[11px] text-[var(--admin-text-muted)]">
                        {item.quantity} x {formatPrice(item.product_price)}
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold text-[var(--admin-text)] tabular-nums ml-3">
                      {formatPrice(item.product_price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Payment method section */}
              <div className="border-t border-[var(--admin-border)]/60 px-5 pt-3.5 pb-4 space-y-2 shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-semibold text-[var(--admin-text-muted)] tracking-[0.5px]">
                    Métodos de pago
                  </p>
                  {isSplit && (
                    <div className="flex items-center justify-center px-2 rounded-[10px] bg-[var(--admin-accent)]/12" style={{ height: 20 }}>
                      <span className="text-[11px] font-semibold text-[var(--admin-accent-text)]">Pago dividido</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  {PAYMENT_METHODS.map((opt) => {
                    const entry = activePayments.find(p => p.method === opt.value)
                    const isActive = !!entry
                    const isEditing = editingMethod === opt.value
                    const dotColor = opt.color.replace('text-', 'bg-')
                    return (
                      <div
                        key={opt.value}
                        onClick={() => handleToggleMethod(opt.value)}
                        className={cn(
                          'flex items-center justify-between px-2 cursor-pointer transition-all select-none border',
                          isActive
                            ? `${opt.bg} ${opt.border}`
                            : 'bg-[var(--admin-surface-2)] border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)]'
                        )}
                        style={{ height: 30, borderRadius: 6 }}
                      >
                        {/* Check + label */}
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              'flex items-center justify-center shrink-0 transition-all',
                              isActive ? dotColor : 'border border-[var(--admin-text-muted)]/40 bg-transparent'
                            )}
                            style={{ width: 12, height: 12, borderRadius: 3 }}
                          >
                            {isActive && <Check className="h-2 w-2 text-white" strokeWidth={3} />}
                          </div>
                          <span className={cn(
                            'text-[11px] font-semibold',
                            isActive ? opt.color : 'text-[var(--admin-text-muted)]'
                          )}>
                            {opt.label}
                          </span>
                        </div>

                        {/* Amount editable */}
                        {isActive ? (
                          isEditing ? (
                            <input
                              ref={amountInputRef}
                              type="number"
                              value={editAmount}
                              onChange={e => setEditAmount(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => {
                                e.stopPropagation()
                                if (e.key === 'Enter') commitEdit(opt.value)
                                if (e.key === 'Escape') { setEditingMethod(null); setEditAmount('') }
                              }}
                              onBlur={() => commitEdit(opt.value)}
                              className={cn(
                                'w-24 h-9 text-right text-[13px] font-bold tabular-nums px-2 rounded-md bg-[var(--admin-surface-2)] border outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                                opt.border, opt.color
                              )}
                              placeholder="0"
                            />
                          ) : (
                            <button
                              onClick={e => handleAmountPillClick(e, opt.value)}
                              className={cn(
                                'h-9 min-w-[60px] px-2 rounded-md bg-[var(--admin-surface-2)] border text-[13px] font-bold tabular-nums transition-colors cursor-pointer hover:opacity-80',
                                opt.border, opt.color
                              )}
                            >
                              {formatPrice(entry.amount)}
                            </button>
                          )
                        ) : (
                          <span className="text-[11px] text-[var(--admin-text-muted)]">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Ticket row */}
              <div className="border-t border-[var(--admin-border)]/60 flex items-center justify-center shrink-0" style={{ height: 40 }}>
                <button
                  onClick={() => printClientTicketAction(order.id).then((r) => { if (r.error) toast.error(r.error) })}
                  className="flex items-center gap-2 text-[12px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir Ticket Mesa
                </button>
              </div>
            </div>
          )}

          {/* ── Per-guest mode content ────────────────────────── */}
          {payMode === 'per_guest' && (
            <div className="flex-1 flex gap-4 min-h-0">
              {guestTags.map(({ tag, subtotal }, idx) => {
                const colors = GUEST_COLORS[idx % GUEST_COLORS.length]
                const guestMethod = getGuestMethod(tag)
                const items = itemsByGuest.get(tag) ?? []

                return (
                  <div
                    key={tag}
                    className="flex-1 bg-[var(--admin-surface)] rounded-xl border border-[var(--admin-border)] flex flex-col overflow-hidden min-w-0"
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between px-4 border-b border-[var(--admin-border)]/60" style={{ paddingTop: 14, paddingBottom: 14 }}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full shrink-0', colors.dot)} />
                        <span className="text-[13px] font-semibold text-[var(--admin-text)]">{tag}</span>
                      </div>
                      <span className="text-[14px] font-bold text-[var(--admin-text)] tabular-nums">
                        {formatPrice(subtotal)}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-1">
                          <span className="text-[12px] text-[var(--admin-text)] truncate flex-1 min-w-0">
                            {item.product_name}
                            <span className="text-[var(--admin-text-muted)]"> ×{item.quantity}</span>
                          </span>
                          <span className="text-[12px] text-[var(--admin-text-muted)] ml-2 tabular-nums shrink-0">
                            {formatPrice(item.product_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Payment methods */}
                    <div className="px-4 border-t border-[var(--admin-border)]/60 space-y-1.5" style={{ paddingTop: 10, paddingBottom: 14 }}>
                      <p className="text-[10px] font-semibold text-[var(--admin-text-muted)] uppercase tracking-[0.5px] mb-2">
                        Métodos de pago
                      </p>
                      {PAYMENT_METHODS.map((opt) => {
                        const isActive = guestMethod === opt.value
                        const dotColor = opt.color.replace('text-', 'bg-')
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setGuestMethod(tag, opt.value)}
                            className={cn(
                              'w-full flex items-center justify-between px-2 border transition-all cursor-pointer select-none',
                              isActive
                                ? `${opt.bg} ${opt.border}`
                                : 'bg-[var(--admin-surface-2)] border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)]'
                            )}
                            style={{ height: 30, borderRadius: 6 }}
                          >
                            <div className="flex items-center gap-1.5">
                              <div
                                className={cn(
                                  'flex items-center justify-center shrink-0 transition-all',
                                  isActive ? dotColor : 'border border-[var(--admin-text-muted)]/40 bg-transparent'
                                )}
                                style={{ width: 12, height: 12, borderRadius: 3 }}
                              >
                                {isActive && <Check className="h-2 w-2 text-white" strokeWidth={3} />}
                              </div>
                              <span className={cn('text-[11px] font-semibold', isActive ? opt.color : 'text-[var(--admin-text-muted)]')}>
                                {opt.label}
                              </span>
                            </div>
                            <span className={cn('text-[11px] font-bold tabular-nums', isActive ? opt.color : 'text-[var(--admin-text-faint)]')}>
                              {isActive ? formatPrice(subtotal) : '—'}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Ticket row */}
                    <div className="border-t border-[var(--admin-border)]/60 flex items-center justify-center" style={{ height: 36 }}>
                      <button
                        onClick={() => handlePrintGuest(tag)}
                        className="flex items-center gap-1.5 text-[11px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer font-medium"
                      >
                        <Printer className="h-3 w-3" />
                        Imprimir ticket {tag}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right Column ────────────────────────────────────── */}
        <div className="w-[380px] bg-[var(--admin-surface)] border-l border-[var(--admin-border)] flex flex-col shrink-0">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[var(--admin-border)]">
            <h2 className="text-[16px] font-bold text-[var(--admin-text)]">Resumen de Cobro</h2>
            <p className="text-[12px] font-medium text-[var(--admin-text-muted)] mt-0.5">
              Mesa {table.number} — {sectionLabel}
            </p>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {payMode === 'per_guest' ? (
              <>
                {/* Por comensal */}
                <div className="space-y-3">
                  {guestTags.map(({ tag, subtotal }, idx) => {
                    const colors = GUEST_COLORS[idx % GUEST_COLORS.length]
                    const gm = getGuestMethod(tag)
                    const gmOpt = PAYMENT_METHODS.find((o) => o.value === gm)
                    return (
                      <div key={tag} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn('w-2 h-2 rounded-full shrink-0', colors.dot)} />
                          <span className="text-[13px] font-medium text-[var(--admin-text-muted)] truncate">
                            {tag} — {gmOpt?.label ?? gm}
                          </span>
                        </div>
                        <span className="text-[13px] font-semibold text-[var(--admin-text)] tabular-nums ml-2 shrink-0">
                          {formatPrice(subtotal)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Divider */}
                <div className="h-px bg-[var(--admin-border)]" />

                {/* Desglose por método */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-[var(--admin-text-muted)] uppercase tracking-[0.5px]">
                    Desglose por método
                  </p>
                  {methodBreakdown.map(({ method: m, label, amount }) => {
                    const opt = PAYMENT_METHODS.find((o) => o.value === m)
                    return (
                      <div key={m} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full shrink-0', opt?.color.replace('text-', 'bg-'))} />
                          <span className="text-[12px] font-medium text-[var(--admin-text-muted)]">{label}</span>
                        </div>
                        <span className="text-[12px] font-semibold text-[var(--admin-text)] tabular-nums">
                          {formatPrice(amount)}
                        </span>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[var(--admin-text-muted)]">Subtotal</span>
                    <span className="text-[13px] font-semibold text-[var(--admin-text)] tabular-nums">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Full mode — Desglose de pago */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-[var(--admin-text-muted)] uppercase tracking-[0.5px]">
                    Desglose de pago
                  </p>
                  {activePayments.length === 0 ? (
                    <p className="text-[12px] text-[var(--admin-text-faint)]">Sin métodos seleccionados</p>
                  ) : (
                    activePayments.map(({ method: m, amount }) => {
                      const opt = PAYMENT_METHODS.find(o => o.value === m)
                      return (
                        <div key={m} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn('w-2 h-2 rounded-full shrink-0', opt?.color.replace('text-', 'bg-'))} />
                            <span className="text-[13px] font-medium text-[var(--admin-text-muted)]">{opt?.label ?? m}</span>
                          </div>
                          <span className="text-[13px] font-semibold text-[var(--admin-text)] tabular-nums">
                            {formatPrice(amount)}
                          </span>
                        </div>
                      )
                    })
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[var(--admin-text-muted)]">Subtotal</span>
                    <span className="text-[13px] font-semibold text-[var(--admin-text)] tabular-nums">
                      {formatPrice(total)}
                    </span>
                  </div>
                  {!isComplete && activePayments.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-amber-400">Restante</span>
                      <span className="text-[13px] font-semibold text-amber-400 tabular-nums">
                        {formatPrice(remaining)}
                      </span>
                    </div>
                  )}
                  {change > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-green-400">Vuelto</span>
                      <span className="text-[13px] font-semibold text-green-400 tabular-nums">
                        {formatPrice(change)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Divider */}
            <div className="h-px bg-[var(--admin-border)]" />

            {/* Total — gold en ambos, como el diseño */}
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold text-[var(--admin-accent-text)]">Total</span>
              <span className="text-[16px] font-bold text-[var(--admin-accent-text)] tabular-nums">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pt-4 pb-6 border-t border-[var(--admin-border)] space-y-2.5">
            {/* Stock warnings */}
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
                  <p className="text-sm font-semibold text-amber-300">Stock insuficiente</p>
                </div>
                <ul className="space-y-1 pl-6">
                  {stockWarnings.map((w) => (
                    <li key={w.product_id} className="text-xs text-amber-200">
                      {w.available === 0
                        ? `${w.product_name}: pediste ${w.requested}, sin stock`
                        : `${w.product_name}: pediste ${w.requested}, hay ${w.available}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Print all (per_guest) */}
            {payMode === 'per_guest' && guestTags.length > 1 && (
              <button
                onClick={handlePrintAll}
                className="w-full flex items-center justify-center gap-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer text-sm font-medium"
                style={{ height: 40, borderRadius: 8 }}
              >
                <Printer className="h-4 w-4" />
                Imprimir Todos los Tickets
              </button>
            )}

            {/* Cobrar button */}
            <button
              onClick={handleConfirm}
              disabled={loading || (payMode === 'full' && (!isComplete || activePayments.length === 0))}
              className="w-full flex items-center justify-center gap-2 bg-[var(--admin-accent)] text-black font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
              style={{ height: 48, borderRadius: 10, fontSize: 15 }}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : payMode === 'full' && activePayments.length === 0 ? (
                'Seleccioná un método'
              ) : payMode === 'full' && !isComplete ? (
                `Faltan ${formatPrice(remaining)}`
              ) : (
                <>
                  <CreditCardIcon className="h-5 w-5" />
                  Cobrar {formatPrice(total)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
