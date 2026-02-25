'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
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
  onUpdateQuantity: (id: string, delta: number) => void
  onRemoveItem: (id: string) => void
  onSetNotes: (notes: string) => void
  onCheckout: () => void
}

export function OrderBuilder({
  items,
  notes,
  onUpdateQuantity,
  onRemoveItem,
  onSetNotes,
  onCheckout,
}: OrderBuilderProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="flex flex-col h-full bg-[#1a1d24]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2f3a]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#f0f2f5] flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[#FEC501]" />
            Venta Mostrador
          </h2>
          {totalItems > 0 && (
            <span className="text-xs bg-[#FEC501] text-black font-bold px-2 py-0.5 rounded-full">
              {totalItems}
            </span>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-hide">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#a8b5c9]">
            <ShoppingCart className="h-12 w-12 mb-3 text-[#3a3f4a]" />
            <p className="text-sm font-medium">Agrega productos</p>
            <p className="text-xs text-[#6b7a8d] mt-1">Selecciona del menu</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-[#12151a] rounded-lg p-3 border border-[#2a2f3a] hover:border-[#3a3f4a] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#f0f2f5] truncate">
                  {item.name}
                </p>
                <p className="text-xs text-[#FEC501] font-bold mt-0.5">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  className="w-9 h-9 rounded-lg bg-[#252a35] text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#2a2f3a] flex items-center justify-center transition-colors active:scale-95"
                  aria-label="Disminuir cantidad"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <motion.span
                  key={item.quantity}
                  initial={{ scale: 1.4, color: '#FEC501' }}
                  animate={{ scale: 1, color: '#f0f2f5' }}
                  transition={{ duration: 0.2 }}
                  className="w-8 text-center text-base font-bold"
                >
                  {item.quantity}
                </motion.span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  className="w-9 h-9 rounded-lg bg-[#252a35] text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#2a2f3a] flex items-center justify-center transition-colors active:scale-95"
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
            className="bg-[#12151a] border-[#2a2f3a] text-[#f0f2f5] text-sm h-9 placeholder:text-[#a8b5c9] focus:border-[#FEC501]/50"
          />
        </div>
      )}

      {/* Total + checkout button */}
      <div className="px-4 py-4 border-t border-[#2a2f3a] space-y-3 bg-[#1a1d24]">
        <div className="flex justify-between items-center bg-gradient-to-r from-[#FEC501]/5 to-transparent rounded-lg p-3 border-l-4 border-[#FEC501]">
          <span className="text-xs text-[#a8b5c9] font-semibold uppercase tracking-wide">Total a cobrar</span>
          <motion.span
            key={subtotal}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-3xl font-black text-[#FEC501] tabular-nums"
          >
            {formatPrice(subtotal)}
          </motion.span>
        </div>
        <Button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full h-14 bg-[#FEC501] hover:bg-[#E5B001] text-black font-bold text-lg shadow-lg shadow-[#FEC501]/25 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          Cobrar
        </Button>
      </div>
    </div>
  )
}
