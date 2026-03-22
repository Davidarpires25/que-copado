'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, ShoppingCart, Loader2, ChefHat, CreditCard, Printer, Trash2, MessageSquare } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { OrderItem } from '@/lib/types/orders'

export interface PosCartItem extends OrderItem {
  quantity: number
}

interface OrderBuilderProps {
  items: PosCartItem[]
  notes: string
  loading?: boolean
  hasKitchenItems?: boolean
  onUpdateQuantity: (id: string, delta: number) => void
  onRemoveItem: (id: string) => void
  onSetNotes: (notes: string) => void
  onSetItemNotes: (id: string, notes: string) => void
  onCheckout: () => void
}

export function OrderBuilder({
  items,
  loading = false,
  hasKitchenItems = true,
  onUpdateQuantity,
  onRemoveItem,
  onSetNotes,
  onSetItemNotes,
  onCheckout,
}: OrderBuilderProps) {
  const [confirmClear, setConfirmClear] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notesLocal, setNotesLocal] = useState('')
  const [itemNotesOpen, setItemNotesOpen] = useState<Set<string>>(new Set())

  const toggleItemNote = (id: string) => {
    setItemNotesOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleClearCart = () => {
    if (confirmClear) {
      items.forEach((item) => onRemoveItem(item.id))
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 2500)
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="flex flex-col h-full bg-[var(--admin-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 shrink-0 h-[52px] border-b border-[var(--admin-border)]">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-[var(--admin-text)]">
            {items.length === 0 ? 'Sin pedido' : 'Pedido actual'}
          </h2>
          {totalItems > 0 && (
            <span className="text-xs font-black px-2 py-0.5 rounded-full tabular-nums bg-[var(--admin-accent)] text-black">
              {totalItems}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearCart}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              confirmClear
                ? 'bg-red-500/10 text-red-400'
                : 'text-[var(--admin-text-faint)] hover:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <Trash2 className="h-3 w-3" />
            {confirmClear ? 'Confirmar' : 'Limpiar'}
          </button>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--admin-text-faint)]">
            <ShoppingCart className="h-10 w-10" />
            <p className="text-sm font-medium">Sin productos</p>
            <p className="text-xs">Seleccioná del menú</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.12 }}
                className="flex items-center justify-between py-2.5 border-b border-[var(--admin-border)]"
              >
                {/* Left: name + price per unit + note */}
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-[13px] font-medium text-[var(--admin-text)] truncate leading-tight">
                    {item.name}
                  </p>
                  <p className="text-[11px] mt-0.5 text-[var(--admin-text-faint)]">
                    {formatPrice(item.price)} c/u
                  </p>
                  <button
                    onClick={() => toggleItemNote(item.id)}
                    className="flex items-center gap-1 mt-0.5 text-[11px] text-[var(--admin-text-faint)] hover:text-[var(--admin-accent-text)] transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{item.notes ? item.notes : 'nota'}</span>
                  </button>
                  {itemNotesOpen.has(item.id) && (
                    <input
                      autoFocus
                      value={item.notes ?? ''}
                      onChange={(e) => onSetItemNotes?.(item.id, e.target.value)}
                      onBlur={() => { if (!item.notes) toggleItemNote(item.id) }}
                      placeholder="sin queso, sin lechuga..."
                      className="mt-1 w-full text-[11px] bg-transparent border-b border-[var(--admin-border)] focus:border-[var(--admin-accent)]/50 text-[var(--admin-text)] placeholder:text-[var(--admin-text-faint)] outline-none py-0.5"
                    />
                  )}
                </div>

                {/* Qty control */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="flex items-center justify-center rounded-md bg-[var(--admin-surface-2)] border border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40 transition-all active:scale-90 cursor-pointer"
                    style={{ width: 26, height: 26 }}
                    aria-label="Disminuir"
                  >
                    <Minus className="h-3 w-3 text-[var(--admin-text-muted)]" />
                  </button>
                  <motion.span
                    key={item.quantity}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.1 }}
                    className="text-[13px] font-semibold tabular-nums text-center text-[var(--admin-text)]"
                    style={{ width: 18 }}
                  >
                    {item.quantity}
                  </motion.span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="flex items-center justify-center rounded-md bg-[var(--admin-accent)] hover:opacity-90 active:scale-90 transition-all cursor-pointer"
                    style={{ width: 26, height: 26 }}
                    aria-label="Aumentar"
                  >
                    <Plus className="h-3 w-3 text-black" />
                  </button>
                </div>

                {/* Line total */}
                <p className="text-[13px] font-semibold tabular-nums text-right ml-3 shrink-0 text-[var(--admin-text)]"
                   style={{ width: 52 }}>
                  {formatPrice(item.price * item.quantity)}
                </p>

                {/* Remove item */}
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="ml-2 text-[var(--admin-text-faint)] hover:text-red-400 transition-colors cursor-pointer shrink-0"
                  aria-label="Eliminar producto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Notes — minimal */}
      {items.length > 0 && (
        <div className="px-5 pb-3 shrink-0">
          {showNotes ? (
            <input
              autoFocus
              value={notesLocal}
              onChange={(e) => { setNotesLocal(e.target.value); onSetNotes(e.target.value) }}
              onBlur={() => { if (!notesLocal) setShowNotes(false) }}
              placeholder="Nota del pedido..."
              className="w-full text-xs py-1.5 bg-transparent outline-none border-b border-[var(--admin-border)] focus:border-[var(--admin-accent)]/50 text-[var(--admin-text)] placeholder:text-[var(--admin-text-faint)]"
            />
          ) : (
            <button
              onClick={() => setShowNotes(true)}
              className="text-xs cursor-pointer transition-colors text-[var(--admin-text-faint)] hover:text-[var(--admin-text-muted)]"
            >
              + Agregar nota
            </button>
          )}
        </div>
      )}

      {/* Totals */}
      {items.length > 0 && (
        <div className="px-5 py-4 space-y-2.5 shrink-0 border-t border-[var(--admin-border)]">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-[var(--admin-text-muted)]">Subtotal</span>
            <span className="text-[14px] tabular-nums text-[var(--admin-text)]">
              {formatPrice(subtotal)}
            </span>
          </div>
          <div className="h-px bg-[var(--admin-border)]" />
          <div className="flex items-center justify-between">
            <span className="text-[18px] font-bold text-[var(--admin-text)]">Total</span>
            <motion.span
              key={subtotal}
              initial={{ scale: 1.06 }}
              animate={{ scale: 1 }}
              className="text-[18px] font-bold tabular-nums text-[var(--admin-accent-text)]"
            >
              {formatPrice(subtotal)}
            </motion.span>
          </div>
        </div>
      )}

      {/* Print ticket row — bg-sidebar, centered */}
      {items.length > 0 && (
        <div className="flex items-center justify-center gap-2 shrink-0 bg-[var(--admin-surface-2)] border-t border-[var(--admin-border)]"
             style={{ height: 44 }}>
          <Printer className="h-4 w-4 text-[var(--admin-text-muted)]" />
          <span className="text-[13px] font-medium text-[var(--admin-text-muted)]">
            Imprimir Ticket
          </span>
        </div>
      )}

      {/* Cobrar / Enviar a cocina — flush, full width */}
      <button
        onClick={onCheckout}
        disabled={items.length === 0 || loading}
        className="flex items-center justify-center gap-2 shrink-0 font-bold text-base transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:brightness-95 bg-[var(--admin-accent)] text-black"
        style={{ height: 52 }}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : hasKitchenItems ? (
          <>
            <ChefHat className="h-5 w-5" />
            {items.length > 0 ? `Enviar a cocina · ${formatPrice(subtotal)}` : 'Enviar a cocina'}
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            {items.length > 0 ? `Cobrar ${formatPrice(subtotal)}` : 'Cobrar'}
          </>
        )}
      </button>
    </div>
  )
}
