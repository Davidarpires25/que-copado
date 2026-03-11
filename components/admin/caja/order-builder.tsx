'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Minus, Plus, Trash2, ShoppingCart, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  notes,
  loading = false,
  hasKitchenItems = true,
  onUpdateQuantity,
  onRemoveItem,
  onSetNotes,
  onSetItemNotes,
  onCheckout,
}: OrderBuilderProps) {
  const [notesOpen, setNotesOpen] = useState<Set<string>>(new Set())

  const toggleNote = (id: string) => {
    setNotesOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="flex flex-col h-full bg-[var(--admin-bg)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--admin-border)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--admin-text)] flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[var(--admin-accent-text)]" />
            Venta Mostrador
          </h2>
          {totalItems > 0 && (
            <span className="text-xs bg-[var(--admin-accent)] text-black font-bold px-2 py-0.5 rounded-full">
              {totalItems}
            </span>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-hide">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--admin-text-muted)]">
            <ShoppingCart className="h-12 w-12 mb-3 text-[var(--admin-text-placeholder)]" />
            <p className="text-sm font-medium">Agrega productos</p>
            <p className="text-xs text-[var(--admin-text-faint)] mt-1">Selecciona del menu</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 bg-[var(--admin-surface)] rounded-lg p-3 border border-[var(--admin-border)] hover:border-[var(--admin-text-placeholder)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--admin-text)] truncate">
                  {item.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-[var(--admin-accent-text)] font-bold">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                  <button
                    onClick={() => toggleNote(item.id)}
                    className="flex items-center gap-0.5 text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-accent-text)] transition-colors"
                  >
                    <MessageSquare className="h-3 w-3" />
                    {!item.notes && !notesOpen.has(item.id) && (
                      <span>nota</span>
                    )}
                  </button>
                </div>
                {item.notes && !notesOpen.has(item.id) && (
                  <p
                    className="text-xs italic text-[var(--admin-text-muted)] mt-0.5 cursor-pointer"
                    onClick={() => toggleNote(item.id)}
                  >
                    {item.notes}
                  </p>
                )}
                {notesOpen.has(item.id) && (
                  <input
                    autoFocus
                    value={item.notes ?? ''}
                    onChange={(e) => onSetItemNotes(item.id, e.target.value)}
                    onBlur={() => {
                      // hide input if empty on blur
                      if (!item.notes) toggleNote(item.id)
                    }}
                    placeholder="sin queso, sin lechuga..."
                    className="mt-1 w-full text-xs bg-transparent border-b border-[var(--admin-border)] focus:border-[var(--admin-accent)]/50 text-[var(--admin-text)] placeholder:text-[var(--admin-text-faint)] outline-none py-0.5"
                  />
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  className="w-9 h-9 rounded-lg bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] flex items-center justify-center transition-colors active:scale-95"
                  aria-label="Disminuir cantidad"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <motion.span
                  key={item.quantity}
                  initial={{ scale: 1.4 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="w-8 text-center text-base font-bold text-[var(--admin-text)]"
                >
                  {item.quantity}
                </motion.span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  className="w-9 h-9 rounded-lg bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] flex items-center justify-center transition-colors active:scale-95"
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => onRemoveItem(item.id)}
                className="w-9 h-9 rounded-lg text-red-500/70 hover:text-red-400 hover:bg-red-950/30 flex items-center justify-center transition-colors active:scale-95"
                aria-label="Eliminar producto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Notes */}
      {items.length > 0 && (
        <div className="px-4 py-2">
          <Input
            value={notes}
            onChange={(e) => onSetNotes(e.target.value)}
            placeholder="Notas (opcional)"
            className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-9 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50"
          />
        </div>
      )}

      {/* Total + checkout button */}
      <div className="px-4 py-4 border-t border-[var(--admin-border)] space-y-3 bg-[var(--admin-bg)]">
        <div className="flex justify-between items-center bg-gradient-to-r from-[var(--admin-accent)]/5 to-transparent rounded-lg p-3 border-l-4 border-[var(--admin-accent)]">
          <span className="text-xs text-[var(--admin-text-muted)] font-semibold uppercase tracking-wide">Total a cobrar</span>
          <motion.span
            key={subtotal}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-3xl font-black text-[var(--admin-accent-text)] tabular-nums"
          >
            {formatPrice(subtotal)}
          </motion.span>
        </div>
        <Button
          onClick={onCheckout}
          disabled={items.length === 0 || loading}
          className="w-full h-14 bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-bold text-lg shadow-lg shadow-[var(--admin-accent)]/25 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : hasKitchenItems ? (
            'Confirmar pedido'
          ) : (
            'Confirmar y cobrar'
          )}
        </Button>
      </div>
    </div>
  )
}
