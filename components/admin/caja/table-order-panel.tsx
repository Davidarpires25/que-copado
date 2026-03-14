'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { printClientTicketAction } from '@/app/actions/print'
import {
  X,
  Plus,
  Receipt,
  CreditCard,
  Loader2,
  AlertTriangle,
  UserPlus,
  Printer,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TableOrderItems } from './table-order-items'
import { TABLE_STATUS_CONFIG } from '@/lib/types/tables'
import {
  updateOrderItem,
  removeOrderItem,
  requestBill,
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
  /** Cuando se renderiza dentro de un BottomSheet: sin ancho fijo ni borde lateral */
  asSheet?: boolean
}

/**
 * Calcula el tiempo transcurrido desde opened_at
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

function getTimeColorClass(minutes: number): string {
  if (minutes > 90) return 'text-red-400'
  if (minutes > 60) return 'text-orange-400'
  return 'text-[var(--admin-text-muted)]'
}

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

  const activeItems = useMemo(() => {
    if (!order?.order_items) return []
    return order.order_items.filter((item) => item.status !== 'cancelado')
  }, [order?.order_items])

  // Extract unique sale tags from active items
  const existingTags = useMemo(() => {
    const tags = new Set<string>()
    for (const item of activeItems) {
      if (item.sale_tag) tags.add(item.sale_tag)
    }
    return Array.from(tags)
  }, [activeItems])

  // Merge existing tags with manually added tags
  const allTags = useMemo(() => {
    const merged = new Set([...existingTags, ...saleTags])
    return Array.from(merged)
  }, [existingTags, saleTags])

  const hasItems = activeItems.length > 0

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollDown, setCanScrollDown] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const checkScroll = () => {
      setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
    }

    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => el.removeEventListener('scroll', checkScroll)
  }, [activeItems])

  useEffect(() => {
    if (addingTag) tagInputRef.current?.focus()
  }, [addingTag])

  const handleUpdateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const result = await updateOrderItem(itemId, quantity)
      if (result.error) {
        toast.error(result.error)
      }
    },
    []
  )

  const handleRemoveItem = useCallback(async (itemId: string) => {
    const result = await removeOrderItem(itemId)
    if (result.error) {
      toast.error(result.error)
    }
  }, [])

  const handleRequestBill = async () => {
    if (!order) return
    setLoadingAction('bill')
    const result = await requestBill(order.id)
    setLoadingAction(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Cuenta pedida')
      onRequestBill()
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return
    setLoadingAction('cancel')
    const result = await cancelTableOrder(order.id, table.id)
    setLoadingAction(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Orden cancelada')
      onCancelOrder()
    }
  }

  const handleAddTag = () => {
    const name = newTagName.trim()
    if (!name) { setAddingTag(false); return }
    if (!saleTags.includes(name)) {
      setSaleTags((prev) => [...prev, name])
    }
    setActiveSaleTag(name)
    setNewTagName('')
    setAddingTag(false)
  }

  const handleRemoveTag = (tag: string) => {
    setSaleTags((prev) => prev.filter((t) => t !== tag))
    if (activeSaleTag === tag) setActiveSaleTag(null)
  }

  // Items filtered by active tag (null = todos)
  const displayedItems = useMemo(() => {
    if (!activeSaleTag) return activeItems
    return activeItems.filter((item) => item.sale_tag === activeSaleTag)
  }, [activeItems, activeSaleTag])

  if (!order) {
    return (
      <div className={cn(
        'bg-[var(--admin-bg)] flex flex-col items-center justify-center p-6 text-[var(--admin-text-muted)]',
        !asSheet && 'w-80 lg:w-96 border-l border-[var(--admin-border)]'
      )}>
        <p className="text-sm">Sin orden activa</p>
      </div>
    )
  }

  // Subtotal for currently displayed items (filtered by tag)
  const displayTotal = displayedItems.reduce(
    (s, i) => s + i.product_price * i.quantity,
    0
  )

  return (
    <div className={cn(
      'bg-[var(--admin-bg)] flex flex-col',
      asSheet ? 'min-h-0' : 'w-80 lg:w-96 border-l border-[var(--admin-border)] h-full'
    )}>
      {/* Header — oculto en modo sheet (el BottomSheet ya muestra el título) */}
      {!asSheet && <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--admin-border)]">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[var(--admin-text)]">
            Mesa {table.number}
          </h2>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
              statusConfig.bgColor,
              statusConfig.color
            )}
          >
            {statusConfig.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {order.opened_at && (() => {
            const { label, minutes } = getElapsedInfo(order.opened_at)
            return (
              <span className={cn('flex items-center gap-1 text-xs font-medium', getTimeColorClass(minutes))}>
                <Clock className="h-3 w-3" />
                {label}
              </span>
            )
          })()}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>}

      {/* Status badge en modo sheet (reemplaza al header completo) */}
      {asSheet && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--admin-border)]">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
              statusConfig.bgColor,
              statusConfig.color
            )}
          >
            {statusConfig.label}
          </span>
          {order.opened_at && (() => {
            const { label, minutes } = getElapsedInfo(order.opened_at)
            return (
              <span className={cn('flex items-center gap-1 text-xs font-medium', getTimeColorClass(minutes))}>
                <Clock className="h-3 w-3" />
                {label}
              </span>
            )
          })()}
        </div>
      )}

      {/* Sale tag chips (comensales) */}
      {(allTags.length > 0 || canModify) && (
        <div className="px-3 py-2 border-b border-[var(--admin-border)] flex flex-wrap gap-1.5 items-center">
          {/* "Todos" chip */}
          <button
            onClick={() => setActiveSaleTag(null)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors',
              !activeSaleTag
                ? 'bg-[var(--admin-accent)] text-black'
                : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            )}
          >
            Todos
          </button>

          {/* Tag chips */}
          {allTags.map((tag) => {
            const canPrint = orderStatus === 'cuenta_pedida' || order.status === 'pagado'
            const hasRight = canModify && !existingTags.includes(tag)
            const roundedRight = !canPrint && !hasRight ? 'rounded-r-full' : ''
            return (
              <div key={tag} className="flex items-center gap-0.5">
                <button
                  onClick={() => setActiveSaleTag(activeSaleTag === tag ? null : tag)}
                  className={cn(
                    'px-2.5 py-1 rounded-l-full text-xs font-semibold transition-colors',
                    roundedRight,
                    activeSaleTag === tag
                      ? 'bg-[var(--admin-accent)]/80 text-black'
                      : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                  )}
                >
                  {tag}
                </button>
                {canPrint && (
                  <button
                    onClick={() => printClientTicketAction(order.id, { guestTag: tag }).then(r => { if (r.error) toast.error(r.error) })}
                    className={cn(
                      'h-full px-1.5 bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] transition-colors',
                      !hasRight && 'rounded-r-full'
                    )}
                    aria-label={`Imprimir ticket de ${tag}`}
                  >
                    <Printer className="h-3 w-3" />
                  </button>
                )}
                {hasRight && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="h-full px-1.5 rounded-r-full bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}

          {/* Add tag button */}
          {canModify && !addingTag && (
            <button
              onClick={() => setAddingTag(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-[var(--admin-surface-2)] hover:bg-[var(--admin-border)] transition-colors"
            >
              <UserPlus className="h-3 w-3" />
              Comensal
            </button>
          )}

          {/* Tag name input */}
          {addingTag && (
            <div className="flex items-center gap-1">
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
              <button
                onClick={handleAddTag}
                className="text-xs text-[var(--admin-accent-text)] hover:underline"
              >
                OK
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scrollable item list */}
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto py-2">
          {hasItems ? (
            <TableOrderItems
              items={order.order_items}
              filterTag={activeSaleTag}
              canModify={canModify}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[var(--admin-text-muted)] px-6">
              <Receipt className="h-8 w-8 mb-2 text-[var(--admin-text-placeholder)]" />
              <p className="text-sm text-center">
                Sin productos - Agrega productos al pedido
              </p>
            </div>
          )}
        </div>

        {/* Scroll fade indicator */}
        {canScrollDown && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--admin-bg)] to-transparent pointer-events-none" />
        )}
      </div>

      {/* Add products button */}
      <div className="px-4 py-2">
        <Button
          onClick={() => onAddItems(activeSaleTag)}
          className="w-full h-11 bg-[var(--admin-accent)] hover:bg-[#e5b301] text-black font-bold text-sm active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Productos{activeSaleTag ? ` (${activeSaleTag})` : ''}
        </Button>
      </div>

      {/* Total */}
      <div className="px-4 py-3 border-t border-[var(--admin-border)]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--admin-text-muted)]">Total mesa</span>
          <span className="text-2xl font-bold text-[var(--admin-text)]">
            {formatPrice(order.total)}
          </span>
        </div>
        {activeSaleTag && (
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-[var(--admin-text-muted)]">
              {activeSaleTag}
            </span>
            <span className="text-sm font-semibold text-[var(--admin-accent-text)]">
              {formatPrice(displayTotal)}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 space-y-2">
        {orderStatus === 'abierto' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRequestBill}
              disabled={!hasItems || loadingAction === 'bill'}
              className="flex-1 h-11 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 disabled:opacity-40"
            >
              {loadingAction === 'bill' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Pedir Cuenta
                </>
              )}
            </Button>
            <Button
              onClick={onPayOrder}
              disabled={!hasItems}
              className="flex-1 h-11 bg-green-600 hover:bg-green-500 text-white font-bold disabled:opacity-40 shadow-lg shadow-green-600/20"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Cobrar
            </Button>
          </div>
        )}

        {orderStatus === 'cuenta_pedida' && (
          <>
            <p className="text-xs text-[var(--admin-text-muted)] text-center px-1 pb-1">
              El cliente pidió la cuenta. Aún podés agregar productos antes de cobrar.
            </p>
            <Button
              onClick={onPayOrder}
              disabled={!hasItems}
              className="w-full h-12 bg-green-600 hover:bg-green-500 text-white font-bold text-base disabled:opacity-40 shadow-lg shadow-green-600/20"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Cobrar
            </Button>
          </>
        )}

        {/* Ticket print */}
        {(orderStatus === 'cuenta_pedida' || order.status === 'pagado') && (
          <button
            onClick={() => printClientTicketAction(order.id).then(r => { if (r.error) toast.error(r.error) })}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-[var(--admin-surface-2)] hover:bg-[var(--admin-border)] transition-colors"
          >
            <Printer className="h-4 w-4" />
            Imprimir Ticket
          </button>
        )}

        {/* Cancel order — visually separated */}
        <div className="border-t border-red-500/20 mt-1 pt-2">
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={loadingAction === 'cancel'}
            className="w-full flex items-center justify-center gap-1.5 h-10 text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            {loadingAction === 'cancel' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            Cancelar Pedido
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title={`Cancelar pedido de Mesa ${table.number}`}
        description="Esta accion no se puede deshacer. Los items del pedido se perderan."
        confirmLabel="Si, cancelar"
        variant="destructive"
        onConfirm={handleCancelOrder}
      />
    </div>
  )
}
