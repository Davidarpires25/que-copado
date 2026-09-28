'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, ClipboardList, Loader2, ChefHat, CircleDollarSign, Trash2, MessageSquare } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { OrderItem } from '@/lib/types/orders'
import type { DeliveryZone } from '@/lib/types/database'
import { Switch } from '@/components/ui/switch'

export interface PosCartItem extends OrderItem {
  quantity: number
  halfPizzaProductId?: string  // real product_id when item id is composite
  metadata?: Record<string, unknown> | null
}

interface OrderBuilderProps {
  items: PosCartItem[]
  loading?: boolean
  hasKitchenItems?: boolean
  deliveryZones?: DeliveryZone[]
  shippingEnabled?: boolean
  selectedDeliveryZoneId?: string | null
  shippingCost?: number
  total?: number
  onShippingEnabledChange?: (enabled: boolean) => void
  onSelectDeliveryZone?: (zoneId: string | null) => void
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
  deliveryZones = [],
  shippingEnabled = false,
  selectedDeliveryZoneId = null,
  shippingCost = 0,
  total,
  onShippingEnabledChange,
  onSelectDeliveryZone,
  onUpdateQuantity,
  onRemoveItem,
  onSetNotes,
  onSetItemNotes,
  onCheckout,
}: OrderBuilderProps) {
  const [confirmClear, setConfirmClear] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (clearTimerRef.current) clearTimeout(clearTimerRef.current) }
  }, [])
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
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
      items.forEach((item) => onRemoveItem(item.id))
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      clearTimerRef.current = setTimeout(() => setConfirmClear(false), 2500)
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const finalTotal = total ?? subtotal
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const checkoutDisabled = items.length === 0 || Boolean(loading)

  return (
    <div className="flex flex-col h-full bg-[var(--admin-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 shrink-0 h-[52px] border-b border-[var(--admin-border)]">
        <div className="flex items-center gap-2">
          <h2 className="text-panel-lg font-bold text-[var(--admin-text)]">
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
            className={`text-panel-base flex items-center gap-1.5 h-9 tactil:h-11 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
 confirmClear
 ? 'bg-peligro/10 text-peligro-texto'
 : 'text-[var(--admin-text-faint)] hover:text-peligro-texto hover:bg-peligro/10'
 }`}
          >
            <Trash2 className="h-4 w-4" />
            {confirmClear ? 'Confirmar' : 'Limpiar'}
          </button>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--admin-text-faint)]">
            <ClipboardList className="h-10 w-10" />
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
                data-renglon-carrito
                className="py-2.5 border-b border-[var(--admin-border)]"
              >
                {/* Renglon 1: el nombre con todo el ancho, y quitar a su lado.
                    Compartia la fila con la cantidad y el monto, y en la netbook
                    se cortaba en "Combo Clásico (b…": tres combos parecidos ya no
                    se distinguian. */}
                <div className="flex items-start gap-2">
                  <p className="flex-1 min-w-0 text-panel-base font-medium leading-snug text-[var(--admin-text)] line-clamp-2">
                    {item.name}
                  </p>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="-mt-1 grid size-7 shrink-0 place-items-center rounded-md text-[var(--admin-text-faint)] hover:bg-peligro/10 hover:text-peligro-texto transition-colors cursor-pointer tactil:size-11"
                    aria-label="Eliminar producto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {item.halfPizzaProductId && item.notes && (
                  <p className="flex items-center gap-1 mt-0.5 text-panel-xs text-[var(--admin-text-muted)]">
                    <MessageSquare className="h-3 w-3 shrink-0" />
                    <span className="min-w-0">{item.notes}</span>
                  </p>
                )}

                {/* Renglon 2: precio y nota | cantidad | subtotal. El subtotal
                    tenia 52px fijos y "$ 29.000" se montaba sobre el tacho. */}
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex flex-1 min-w-0 items-center gap-3">
                    <span className="whitespace-nowrap text-panel-sm tabular-nums text-[var(--admin-text-faint)]">
                      {formatPrice(item.price)} c/u
                    </span>
                    {!item.halfPizzaProductId && (
                      <button
                        onClick={() => toggleItemNote(item.id)}
                        className="flex min-w-0 items-center gap-1 tactil:min-h-11 text-panel-sm text-[var(--admin-text-faint)] hover:text-[var(--admin-accent-text)] transition-colors cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.notes ? item.notes : 'nota'}</span>
                      </button>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="flex size-control items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-2)] hover:border-[var(--admin-accent)]/40 transition-all active:scale-90 cursor-pointer tactil:size-11"
                      aria-label="Disminuir"
                    >
                      <Minus className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
                    </button>
                    <motion.span
                      key={item.quantity}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.1 }}
                      className="w-6 text-center text-panel-base font-semibold tabular-nums text-[var(--admin-text)]"
                    >
                      {item.quantity}
                    </motion.span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="flex size-control items-center justify-center rounded-md bg-[var(--admin-accent)] hover:opacity-90 active:scale-90 transition-all cursor-pointer tactil:size-11"
                      aria-label="Aumentar"
                    >
                      <Plus className="h-3.5 w-3.5 text-black" />
                    </button>
                  </div>
                  <p className="min-w-[76px] whitespace-nowrap text-right text-panel-base font-semibold tabular-nums text-[var(--admin-text)]">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
                {!item.halfPizzaProductId && itemNotesOpen.has(item.id) && (
                  <input
                    autoFocus
                    value={item.notes ?? ''}
                    onChange={(e) => onSetItemNotes?.(item.id, e.target.value)}
                    onBlur={() => { if (!item.notes) toggleItemNote(item.id) }}
                    placeholder="sin queso, sin lechuga..."
                    className="mt-1 w-full text-panel-base bg-transparent border-b border-[var(--admin-border)] focus:border-[var(--admin-accent)]/50 text-[var(--admin-text)] placeholder:text-[var(--admin-text-faint)] outline-none py-0.5"
                  />
                )}
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
              className="text-panel-sm tactil:min-h-11 cursor-pointer transition-colors text-[var(--admin-text-faint)] hover:text-[var(--admin-text-muted)]"
            >
              + Agregar nota
            </button>
          )}
        </div>
      )}

      {/* Totals */}
      {items.length > 0 && (
        <div className="px-5 py-4 space-y-2.5 shrink-0 border-t border-[var(--admin-border)]">
          {/* Apagado es un renglon: casi ninguna venta de mostrador lleva envio,
              y la tarjeta ocupaba ~90px en todas. Encendido se enmarca con la zona. */}
          <div className={shippingEnabled ? 'rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3 space-y-2' : 'space-y-2'}>
            <div className="flex items-center justify-between">
              <span className="text-panel-sm text-[var(--admin-text-muted)]">Envío</span>
              <Switch
                checked={shippingEnabled}
                onCheckedChange={(checked) => onShippingEnabledChange?.(checked)}
                className="data-[state=checked]:bg-[var(--admin-accent)]"
              />
            </div>
            {shippingEnabled && (
              <select
                value={selectedDeliveryZoneId ?? ''}
                onChange={(e) => onSelectDeliveryZone?.(e.target.value || null)}
                className="w-full h-9 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 text-xs text-[var(--admin-text)] outline-none"
              >
                <option value="" disabled>Seleccionar zona...</option>
                {deliveryZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} - {formatPrice(zone.shipping_cost)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-panel-base text-[var(--admin-text-muted)]">Subtotal</span>
            <span className="text-panel-base tabular-nums text-[var(--admin-text)]">
              {formatPrice(subtotal)}
            </span>
          </div>
          {shippingEnabled && (
            <div className="flex items-center justify-between">
              <span className="text-panel-base text-[var(--admin-text-muted)]">Envío</span>
              <span className="text-panel-base tabular-nums text-[var(--admin-text)]">
                {formatPrice(shippingCost)}
              </span>
            </div>
          )}
          <div className="h-px bg-[var(--admin-border)]" />
          <div className="flex items-center justify-between">
            <span className="text-panel-xl font-bold text-[var(--admin-text)]">Total</span>
            <motion.span
              key={finalTotal}
              initial={{ scale: 1.06 }}
              animate={{ scale: 1 }}
              className="text-panel-xl font-bold tabular-nums text-[var(--admin-price)]"
            >
              {formatPrice(finalTotal)}
            </motion.span>
          </div>
        </div>
      )}

      {/* Cobrar / Enviar a cocina — flush, full width */}
      <button
        onClick={onCheckout}
        disabled={checkoutDisabled}
        className="flex items-center justify-center gap-2 shrink-0 font-bold text-base transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:brightness-95 bg-[var(--admin-accent)] text-black"
        style={{ height: 52 }}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : hasKitchenItems ? (
          <>
            <ChefHat className="h-5 w-5" />
            {items.length > 0 ? `Enviar a cocina · ${formatPrice(finalTotal)}` : 'Enviar a cocina'}
          </>
        ) : (
          <>
            <CircleDollarSign className="h-5 w-5" />
            {items.length > 0 ? `Cobrar ${formatPrice(finalTotal)}` : 'Cobrar'}
          </>
        )}
      </button>
    </div>
  )
}
