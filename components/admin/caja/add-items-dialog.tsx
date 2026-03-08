'use client'

import { useState, useCallback } from 'react'
import { Loader2, ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PosProductGrid } from './product-grid'
import { addItemsToOrder } from '@/app/actions/tables'
import type { Product, Category } from '@/lib/types/database'

interface CartItem {
  product_id: string
  product_name: string
  product_price: number
  quantity: number
}

interface AddItemsDialogProps {
  open: boolean
  products: Product[]
  categories: Category[]
  orderId: string
  saleTag?: string | null
  onClose: () => void
  onItemsAdded: () => void
}

export function AddItemsDialog({
  open,
  products,
  categories,
  orderId,
  saleTag,
  onClose,
  onItemsAdded,
}: AddItemsDialogProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product_price * item.quantity,
    0
  )
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleAddItem = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          product_price: product.price,
          quantity: 1,
        },
      ]
    })
  }, [])

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      setCart((prev) => prev.filter((item) => item.product_id !== productId))
      return
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    )
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId))
  }

  const handleSubmit = async () => {
    if (cart.length === 0) return

    setLoading(true)
    const result = await addItemsToOrder(orderId, cart, saleTag)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(
      `${cartItemCount} ${cartItemCount === 1 ? 'producto agregado' : 'productos agregados'}`
    )
    setCart([])
    onItemsAdded()
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCart([])
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] max-w-4xl h-[85vh] flex flex-col p-0 gap-0 shadow-xl shadow-black/10"
        showCloseButton={true}
      >
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-xl font-bold text-[var(--admin-text)] flex items-center gap-2">
            Agregar Productos
            {saleTag && (
              <span className="text-sm font-medium bg-[var(--admin-accent)]/20 text-[var(--admin-accent-text)] px-2 py-0.5 rounded-full">
                {saleTag}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Product grid area */}
        <div className="flex-1 overflow-hidden">
          <PosProductGrid
            products={products}
            categories={categories}
            onAddItem={handleAddItem}
          />
        </div>

        {/* Mini cart at the bottom */}
        {cart.length > 0 && (
          <div className="border-t border-[var(--admin-border)] bg-[var(--admin-surface)]">
            {/* Cart items (scrollable if many) */}
            <div className="max-h-40 overflow-y-auto px-4 py-2 space-y-1">
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center gap-2 py-1.5"
                >
                  <span className="flex-1 text-sm text-[var(--admin-text)] truncate">
                    {item.product_name}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        handleUpdateCartQuantity(
                          item.product_id,
                          item.quantity - 1
                        )
                      }
                      className="h-6 w-6 flex items-center justify-center rounded bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-[var(--admin-text)]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        handleUpdateCartQuantity(
                          item.product_id,
                          item.quantity + 1
                        )
                      }
                      className="h-6 w-6 flex items-center justify-center rounded bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="text-sm font-semibold text-[var(--admin-text)] w-20 text-right shrink-0">
                    {formatPrice(item.product_price * item.quantity)}
                  </span>

                  <button
                    onClick={() => handleRemoveFromCart(item.product_id)}
                    className="h-6 w-6 flex items-center justify-center rounded text-[var(--admin-text-faint)] hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Summary + Submit */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--admin-border)]">
              <div className="flex items-center gap-2 text-[var(--admin-text-muted)]">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {cartItemCount}{' '}
                  {cartItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              <span className="text-lg font-bold text-[var(--admin-accent-text)]">
                {formatPrice(cartTotal)}
              </span>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="ml-auto h-10 px-6 bg-[var(--admin-accent)] hover:bg-[#e5b301] text-black font-bold text-sm active:scale-95 transition-transform"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Agregar al Pedido'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
