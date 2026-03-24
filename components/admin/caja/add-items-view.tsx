'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ArrowLeft, Check, Minus, Plus, Trash2, MessageSquare, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import { PosProductGrid } from './product-grid'
import { addItemsToOrder } from '@/app/actions/tables'
import { printKitchenTicketAction } from '@/app/actions/print'
import type { Product, Category, ProductWithHalfConfig } from '@/lib/types/database'
import { sendsToKitchen } from '@/lib/types/database'
import type { RestaurantTable } from '@/lib/types/tables'

interface CartItem {
  id: string            // composite key: product_id or product_id__notes
  product_id: string    // real DB product_id
  product_name: string
  product_price: number
  product_type?: string | null
  quantity: number
  notes?: string
  metadata?: Record<string, unknown> | null
}

interface AddItemsViewProps {
  products: ProductWithHalfConfig[]
  categories: Category[]
  table: RestaurantTable
  orderId: string
  saleTag?: string | null
  getHalfOptions?: (product: ProductWithHalfConfig) => Product[]
  onClose: () => void
  onItemsAdded: () => void
}

export function AddItemsView({
  products,
  categories,
  table,
  orderId,
  saleTag,
  getHalfOptions,
  onClose,
  onItemsAdded,
}: AddItemsViewProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [notesOpen, setNotesOpen] = useState<Set<string>>(new Set())

  const cartTotal = cart.reduce((s, i) => s + i.product_price * i.quantity, 0)
  const cartItemCount = cart.reduce((s, i) => s + i.quantity, 0)

  const handleAddItem = useCallback((
    product: ProductWithHalfConfig,
    notes?: string,
    price?: number,
    metadata?: Record<string, unknown>
  ) => {
    const finalPrice = price ?? product.price
    setCart((prev) => {
      const key = notes ? `${product.id}__${notes}` : product.id
      const existing = prev.find((i) => i.id === key)
      if (existing) {
        return prev.map((i) =>
          i.id === key ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, {
        id: key,
        product_id: product.id,
        product_name: product.name,
        product_price: finalPrice,
        product_type: product.product_type,
        quantity: 1,
        notes: notes,
        metadata: metadata ?? null,
      }]
    })
  }, [])

  const handleUpdateQty = (id: string, qty: number) => {
    if (qty < 1) {
      setCart((prev) => prev.filter((i) => i.id !== id))
      return
    }
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, quantity: qty } : i)
    )
  }

  const handleRemove = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id))
  }

  const toggleNote = (id: string) => {
    setNotesOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSetNotes = (id: string, notes: string) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, notes } : i)
    )
  }

  const handleSubmit = async () => {
    if (cart.length === 0 || loading) return
    setLoading(true)
    const result = await addItemsToOrder(
      orderId,
      cart.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        product_price: i.product_price,
        quantity: i.quantity,
        notes: i.notes || null,
        metadata: i.metadata || null,
      })),
      saleTag
    )
    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    const hasKitchenItems = cart.some((i) => sendsToKitchen(i.product_type ?? ''))
    if (hasKitchenItems) {
      printKitchenTicketAction(orderId).then((r) => { if (r.error) toast.error(r.error) })
    }
    toast.success(`${cartItemCount} ${cartItemCount === 1 ? 'producto agregado' : 'productos agregados'}`)
    onItemsAdded()
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">

      {/* Left — product grid */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <PosProductGrid
          products={products}
          categories={categories}
          cartItems={cart.map((i) => ({ id: i.id, name: i.product_name, price: i.product_price, quantity: i.quantity }))}
          getHalfOptions={getHalfOptions}
          onAddItem={handleAddItem}
        />
      </div>

      {/* Right — new items panel (same design as OrderBuilder) */}
      <div className="w-[380px] shrink-0 border-l border-[var(--admin-border)] flex flex-col bg-[var(--admin-surface)]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 shrink-0 h-[52px] border-b border-[var(--admin-border)]">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[15px] font-bold text-[var(--admin-text)]">
              {cart.length === 0 ? 'Sin productos' : 'Nuevos items'}
            </h2>
            {cartItemCount > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full tabular-nums bg-[var(--admin-accent)] text-black">
                {cartItemCount}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-[var(--admin-text-faint)] hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--admin-text-faint)]">
              <ShoppingCart className="h-10 w-10" />
              <p className="text-sm font-medium">Sin productos</p>
              <p className="text-xs">Seleccioná del menú</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center justify-between py-2.5 border-b border-[var(--admin-border)]"
                >
                  {/* Left: name + price + note */}
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[13px] font-medium text-[var(--admin-text)] truncate leading-tight">
                      {item.product_name}
                    </p>
                    <p className="text-[11px] mt-0.5 text-[var(--admin-text-faint)]">
                      {formatPrice(item.product_price)} c/u
                    </p>
                    {item.id !== item.product_id ? (
                      item.notes && (
                        <p className="flex items-center gap-1 mt-0.5 text-[11px] text-[var(--admin-accent-text)]/80">
                          <MessageSquare className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[100px]">{item.notes}</span>
                        </p>
                      )
                    ) : (
                      <>
                        <button
                          onClick={() => toggleNote(item.id)}
                          className="flex items-center gap-1 mt-0.5 text-[11px] text-[var(--admin-text-faint)] hover:text-[var(--admin-accent-text)] transition-colors cursor-pointer"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span className="truncate max-w-[100px]">{item.notes ? item.notes : 'nota'}</span>
                        </button>
                        {notesOpen.has(item.id) && (
                          <input
                            autoFocus
                            value={item.notes ?? ''}
                            onChange={(e) => handleSetNotes(item.id, e.target.value)}
                            onBlur={() => { if (!item.notes) toggleNote(item.id) }}
                            placeholder="sin queso, sin lechuga..."
                            className="mt-1 w-full text-[11px] bg-transparent border-b border-[var(--admin-border)] focus:border-[var(--admin-accent)]/50 text-[var(--admin-text)] placeholder:text-[var(--admin-text-faint)] outline-none py-0.5"
                          />
                        )}
                      </>
                    )}
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                      className="flex items-center justify-center rounded-md bg-[var(--admin-surface-2)] border border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40 transition-all active:scale-90 cursor-pointer"
                      style={{ width: 26, height: 26 }}
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
                      onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                      className="flex items-center justify-center rounded-md bg-[var(--admin-accent)] hover:opacity-90 active:scale-90 transition-all cursor-pointer"
                      style={{ width: 26, height: 26 }}
                    >
                      <Plus className="h-3 w-3 text-black" />
                    </button>
                  </div>

                  {/* Line total */}
                  <p className="text-[13px] font-semibold tabular-nums text-right ml-3 shrink-0 text-[var(--admin-text)]"
                     style={{ width: 52 }}>
                    {formatPrice(item.product_price * item.quantity)}
                  </p>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="ml-2 text-[var(--admin-text-faint)] hover:text-red-400 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Totals */}
        {cart.length > 0 && (
          <div className="px-5 py-4 space-y-2.5 shrink-0 border-t border-[var(--admin-border)]">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--admin-text-muted)]">Subtotal</span>
              <span className="text-[14px] tabular-nums text-[var(--admin-text)]">{formatPrice(cartTotal)}</span>
            </div>
            <div className="h-px bg-[var(--admin-border)]" />
            <div className="flex items-center justify-between">
              <span className="text-[18px] font-bold text-[var(--admin-text)]">Total</span>
              <motion.span
                key={cartTotal}
                initial={{ scale: 1.06 }}
                animate={{ scale: 1 }}
                className="text-[18px] font-bold tabular-nums text-[var(--admin-accent-text)]"
              >
                {formatPrice(cartTotal)}
              </motion.span>
            </div>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleSubmit}
          disabled={cart.length === 0 || loading}
          className={cn(
            'flex items-center justify-center gap-2 shrink-0 font-bold text-base transition-all cursor-pointer',
            'disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:brightness-95',
            'bg-[var(--admin-accent)] text-black'
          )}
          style={{ height: 52 }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : cart.length === 0 ? (
            'Seleccioná productos'
          ) : (
            <>
              <Check className="h-5 w-5" strokeWidth={2.5} />
              {`Confirmar · ${formatPrice(cartTotal)}`}
            </>
          )}
        </button>
      </div>

    </div>
  )
}
