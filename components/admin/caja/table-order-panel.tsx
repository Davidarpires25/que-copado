'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { printClientTicketAction, printKitchenTicketAction } from '@/app/actions/print'
import {
  Plus, Receipt, CreditCard, Loader2, AlertTriangle, Printer, ChefHat,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TableOrderItems } from './table-order-items'
import { TABLE_STATUS_CONFIG, TABLE_SECTION_LABELS } from '@/lib/types/tables'
import {
  updateOrderItem,
  removeOrderItem,
  cancelTableOrder,
} from '@/app/actions/tables'
import type { TableWithOrder } from '@/lib/types/tables'
import type { CashRegisterSession } from '@/lib/types/cash-register'

interface TableOrderPanelProps {
  table: TableWithOrder
  session: CashRegisterSession
  onAddItems: (saleTag?: string | null) => void
  onRequestBill: () => void
  onPayOrder: () => void
  onCancelOrder: () => void
  onClose: () => void
  asSheet?: boolean
}

// Color palette matching Pencil — index-based assignment per tag
const TAG_COLORS = [
  { dot: 'bg-green-400',  text: 'text-green-400',  bg: 'bg-green-400/12',  print: 'bg-green-400/10 border-green-400/20 text-green-400'  },
  { dot: 'bg-blue-400',   text: 'text-blue-400',   bg: 'bg-blue-400/12',   print: 'bg-blue-400/10 border-blue-400/20 text-blue-400'   },
  { dot: 'bg-amber-400',  text: 'text-amber-400',  bg: 'bg-amber-400/12',  print: 'bg-amber-400/10 border-amber-400/20 text-amber-400'  },
  { dot: 'bg-purple-400', text: 'text-purple-400', bg: 'bg-purple-400/12', print: 'bg-purple-400/10 border-purple-400/20 text-purple-400' },
  { dot: 'bg-pink-400',   text: 'text-pink-400',   bg: 'bg-pink-400/12',   print: 'bg-pink-400/10 border-pink-400/20 text-pink-400'   },
]

export function TableOrderPanel({
  table,
  session,
  onAddItems,
  onRequestBill,
  onPayOrder,
  onCancelOrder,
  onClose,
  asSheet = false,
}: TableOrderPanelProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Sale tags (comensales)
  const [saleTags, setSaleTags] = useState<string[]>([])
  const [activeSaleTag, setActiveSaleTag] = useState<string | null>(null)
  const [addingTag, setAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  const order = table.orders
  const statusConfig = TABLE_STATUS_CONFIG[table.status]
  const orderStatus = order?.status as 'abierto' | 'cuenta_pedida' | undefined
  const canModify = orderStatus === 'abierto' || orderStatus === 'cuenta_pedida'
  const sectionLabel = TABLE_SECTION_LABELS[table.section] || table.section

  const activeItems = useMemo(() => {
    if (!order?.order_items) return []
    return order.order_items.filter((item) => item.status !== 'cancelado')
  }, [order?.order_items])

  const existingTags = useMemo(() => {
    const tags = new Set<string>()
    for (const item of activeItems) {
      if (item.sale_tag) tags.add(item.sale_tag)
    }
    return Array.from(tags)
  }, [activeItems])

  const allTags = useMemo(() => {
    const merged = new Set([...existingTags, ...saleTags])
    return Array.from(merged)
  }, [existingTags, saleTags])

  // Items filtered by tag for display + total
  const displayedItems = useMemo(() => {
    if (!activeSaleTag) return activeItems
    return activeItems.filter((item) => item.sale_tag === activeSaleTag)
  }, [activeItems, activeSaleTag])

  const totalItemCount = activeItems.reduce((s, i) => s + i.quantity, 0)
  const displayTotal = displayedItems.reduce((s, i) => s + i.product_price * i.quantity, 0)

  useEffect(() => {
    if (addingTag) tagInputRef.current?.focus()
  }, [addingTag])

  const handleUpdateQuantity = useCallback(async (itemId: string, quantity: number) => {
    const result = await updateOrderItem(itemId, quantity)
    if (result.error) toast.error(result.error)
  }, [])

  const handleRemoveItem = useCallback(async (itemId: string) => {
    const result = await removeOrderItem(itemId)
    if (result.error) toast.error(result.error)
  }, [])

  const handleCancelOrder = async () => {
    if (!order) return
    setLoadingAction('cancel')
    const result = await cancelTableOrder(order.id, table.id)
    setLoadingAction(null)
    if (result.error) { toast.error(result.error) } else {
      toast.success('Orden cancelada')
      onCancelOrder()
    }
  }

  const handleAddTag = () => {
    const name = newTagName.trim()
    if (!name) { setAddingTag(false); return }
    if (!saleTags.includes(name)) setSaleTags((prev) => [...prev, name])
    setActiveSaleTag(name)
    setNewTagName('')
    setAddingTag(false)
  }

  const handleRemoveTag = (tag: string) => {
    setSaleTags((prev) => prev.filter((t) => t !== tag))
    if (activeSaleTag === tag) setActiveSaleTag(null)
  }

  // ─── Empty state (no order) ──────────────────────────────────────────────
  if (!order) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-6 text-[var(--admin-text-muted)] bg-[var(--admin-surface)]',
        !asSheet && 'w-[520px] border-l border-[var(--admin-border)] h-full'
      )}>
        <Receipt className="h-8 w-8 mb-2 text-[var(--admin-text-placeholder)]" />
        <p className="text-sm">Sin orden activa</p>
      </div>
    )
  }

  const canPrintPerTag = orderStatus === 'cuenta_pedida' || order.status === 'pagado'

  return (
    <div className={cn(
      'bg-[var(--admin-surface)] flex flex-col',
      asSheet ? 'min-h-0' : 'w-[520px] border-l border-[var(--admin-border)] h-full'
    )}>

      {/* ── Header ─────────────────────────────────────────────── */}
      {!asSheet && (
        <div
          className="flex items-center justify-between px-5 shrink-0 border-b border-[var(--admin-border)]"
          style={{ height: 52 }}
        >
          {/* Left: Mesa + zone + item count */}
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-[var(--admin-text)]">
              Mesa {table.number}
            </span>
            <span className="text-[13px] text-[var(--admin-text-muted)]">—</span>
            <span className="text-[13px] text-[var(--admin-text-muted)]">{sectionLabel}</span>
            {totalItemCount > 0 && (
              <div className="flex items-center gap-1 px-2 rounded-full bg-green-400/12" style={{ height: 22 }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-[11px] font-semibold text-green-400">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
            )}
          </div>
          {/* Right: print buttons */}
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
              onClick={() => printClientTicketAction(order.id).then(r => { if (r.error) toast.error(r.error) })}
              className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer p-1"
              aria-label="Imprimir ticket cliente"
              title="Ticket cliente"
            >
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sheet mode: compact header */}
      {asSheet && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--admin-border)]">
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
            statusConfig.bgColor, statusConfig.color
          )}>
            {statusConfig.label}
          </span>
          {totalItemCount > 0 && (
            <span className="text-xs text-[var(--admin-text-muted)] tabular-nums">
              {totalItemCount} items · {formatPrice(order.total)}
            </span>
          )}
        </div>
      )}

      {/* ── Comensal bar ───────────────────────────────────────── */}
      {(allTags.length > 0 || canModify) && (
        <div
          className="flex items-center gap-2 px-5 border-b border-[var(--admin-border)] overflow-x-auto scrollbar-hide shrink-0"
          style={{ paddingTop: 10, paddingBottom: 10 }}
        >
          {/* Todos tab */}
          <button
            onClick={() => setActiveSaleTag(null)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 rounded-full shrink-0 transition-colors cursor-pointer',
              !activeSaleTag
                ? 'bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/30'
                : 'bg-[var(--admin-surface-2)] border border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)]'
            )}
            style={{ height: 30 }}
          >
            <span className={cn('text-[11px] font-semibold', !activeSaleTag ? 'text-[var(--admin-accent-text)]' : 'text-[var(--admin-text-muted)]')}>
              Todos
            </span>
            {totalItemCount > 0 && (
              <div className="flex items-center justify-center rounded-full shrink-0"
                style={{ width: 18, height: 18, background: !activeSaleTag ? 'var(--admin-accent)' : 'var(--admin-surface-2)' }}>
                <span className={cn('text-[9px] font-bold', !activeSaleTag ? 'text-black' : 'text-[var(--admin-text-muted)]')}>
                  {totalItemCount}
                </span>
              </div>
            )}
          </button>

          {/* Per-tag tabs */}
          {allTags.map((tag, idx) => {
            const colors = TAG_COLORS[idx % TAG_COLORS.length]!
            const isActive = activeSaleTag === tag
            const tagItems = activeItems.filter((i) => i.sale_tag === tag)
            const tagCount = tagItems.reduce((s, i) => s + i.quantity, 0)
            const canDelete = canModify && !existingTags.includes(tag)

            return (
              <div key={tag} className="flex items-center shrink-0">
                <button
                  onClick={() => setActiveSaleTag(isActive ? null : tag)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 rounded-full transition-colors cursor-pointer',
                    canDelete ? 'rounded-r-none' : '',
                    isActive ? `${colors.bg} border border-current/30` : 'bg-[var(--admin-surface-2)] border border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)]'
                  )}
                  style={{ height: 30 }}
                >
                  <span className={cn('text-[11px] font-semibold', isActive ? colors.text : 'text-[var(--admin-text-muted)]')}>
                    {tag}
                  </span>
                  {tagCount > 0 && (
                    <div
                      className={cn('flex items-center justify-center rounded-full shrink-0', isActive ? colors.dot : 'bg-[var(--admin-text-faint)]')}
                      style={{ width: 18, height: 18 }}
                    >
                      <span className="text-[9px] font-bold text-white">{tagCount}</span>
                    </div>
                  )}
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="h-[30px] px-1.5 rounded-r-full bg-[var(--admin-surface-2)] border border-l-0 border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}

          {/* Add comensal input / button */}
          {canModify && !addingTag && (
            <button
              onClick={() => setAddingTag(true)}
              className="flex items-center justify-center rounded-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer shrink-0"
              style={{ width: 30, height: 30 }}
              aria-label="Agregar comensal"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          {addingTag && (
            <div className="flex items-center gap-1 shrink-0">
              <input
                ref={tagInputRef}
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag()
                  if (e.key === 'Escape') { setAddingTag(false); setNewTagName('') }
                }}
                placeholder="Nombre..."
                className="w-20 text-xs px-2 py-1 rounded-full bg-[var(--admin-surface-2)] border border-[var(--admin-accent)]/40 text-[var(--admin-text)] outline-none placeholder:text-[var(--admin-text-muted)]"
                maxLength={20}
              />
              <button onClick={handleAddTag} className="text-xs text-[var(--admin-accent-text)] hover:underline cursor-pointer">OK</button>
            </div>
          )}
        </div>
      )}

      {/* ── Items list ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 min-h-0">
        <TableOrderItems
          items={order.order_items}
          filterTag={activeSaleTag}
          allTags={allTags}
          canModify={canModify}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
        />
      </div>

      {/* ── Subtotal row ────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 shrink-0 border-t border-[var(--admin-border)]"
        style={{ paddingTop: 16, paddingBottom: 16 }}
      >
        <span className="text-[14px] text-[var(--admin-text-muted)]">
          Subtotal ({displayedItems.reduce((s, i) => s + i.quantity, 0)} items)
        </span>
        <span className="text-[18px] font-bold text-[var(--admin-text)] tabular-nums">
          {formatPrice(displayTotal)}
        </span>
      </div>

      {/* ── Ticket section ─────────────────────────────────────── */}
      {canPrintPerTag && allTags.length > 0 && (
        <div className="px-5 shrink-0 border-t border-[var(--admin-border)]" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold uppercase tracking-widest text-[var(--admin-text-muted)]">
              Imprimir Tickets
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => printKitchenTicketAction(order.id).then(r => { if (r.error) toast.error(r.error) })}
                className="flex items-center gap-1.5 px-2.5 rounded-md bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-orange-400 hover:border-orange-400/40 transition-colors cursor-pointer"
                style={{ height: 26 }}
              >
                <ChefHat className="h-3 w-3" />
                <span className="text-[11px] font-medium">Comanda</span>
              </button>
              <button
                onClick={() => printClientTicketAction(order.id).then(r => { if (r.error) toast.error(r.error) })}
                className="flex items-center gap-1.5 px-2.5 rounded-md bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-text-placeholder)] transition-colors cursor-pointer"
                style={{ height: 26 }}
              >
                <Printer className="h-3 w-3" />
                <span className="text-[11px] font-medium">Ticket Completo</span>
              </button>
            </div>
          </div>
          <div className="flex gap-1.5">
            {allTags.map((tag, idx) => {
              const colors = TAG_COLORS[idx % TAG_COLORS.length]!
              return (
                <button
                  key={tag}
                  onClick={() => printClientTicketAction(order.id, { guestTag: tag }).then(r => { if (r.error) toast.error(r.error) })}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer hover:opacity-80',
                    colors.print
                  )}
                  style={{ height: 32 }}
                >
                  <Printer className="h-3 w-3" />
                  {tag}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Action row ─────────────────────────────────────────── */}
      <div className="flex gap-2.5 px-5 pb-4 pt-3 shrink-0">
        <button
          onClick={() => onAddItems(activeSaleTag)}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[var(--admin-accent)] text-[var(--admin-accent-text)] text-[13px] font-semibold hover:bg-[var(--admin-accent)]/5 transition-colors cursor-pointer"
          style={{ height: 40 }}
        >
          <Plus className="h-4 w-4" />
          Agregar Items
        </button>
        <button
          onClick={onPayOrder}
          disabled={activeItems.length === 0 || loadingAction === 'pay'}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--admin-accent)] text-black text-[13px] font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          style={{ height: 40 }}
        >
          {loadingAction === 'pay' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Cobrar
            </>
          )}
        </button>
      </div>

      {/* ── Cancel order — subtle ────────────────────────────────── */}
      <div className="px-5 pb-3 shrink-0">
        <button
          onClick={() => setShowCancelConfirm(true)}
          disabled={loadingAction === 'cancel'}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-40 cursor-pointer"
          style={{ height: 28 }}
        >
          {loadingAction === 'cancel' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          Cancelar Pedido
        </button>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title={`Cancelar pedido de Mesa ${table.number}`}
        description="Esta acción no se puede deshacer. Los ítems del pedido se perderán."
        confirmLabel="Sí, cancelar"
        variant="destructive"
        onConfirm={handleCancelOrder}
      />
    </div>
  )
}
