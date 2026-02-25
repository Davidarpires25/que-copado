'use client'

import { useState } from 'react'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { OrderItemRow } from '@/lib/types/tables'

interface TableOrderItemsProps {
  items: OrderItemRow[]
  canModify: boolean
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
}

export function TableOrderItems({
  items,
  canModify,
  onUpdateQuantity,
  onRemoveItem,
}: TableOrderItemsProps) {
  const [removeTarget, setRemoveTarget] = useState<OrderItemRow | null>(null)

  // Filter out cancelled items
  const activeItems = items.filter((item) => item.status !== 'cancelado')

  if (activeItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-[#a8b5c9]">
        <ShoppingBag className="h-8 w-8 mb-2 text-[#3a3f4a]" />
        <p className="text-sm">Sin productos aun</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-1">
        {activeItems.map((item) => {
          const subtotal = item.product_price * item.quantity

          return (
            <div
              key={item.id}
              className={cn(
                'group flex items-center gap-2 px-3 py-2.5 rounded-lg',
                'hover:bg-[#12151a] transition-colors'
              )}
            >
              {/* Item info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#f0f2f5] truncate">
                  {item.product_name}
                </p>
                {item.notes && (
                  <p className="text-xs text-[#6b7a8d] mt-0.5 truncate">
                    {item.notes}
                  </p>
                )}
                <p className="text-xs text-[#a8b5c9] mt-0.5">
                  {formatPrice(item.product_price)} c/u
                </p>
              </div>

              {/* Quantity controls or read-only quantity */}
              {canModify ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md bg-[#252a35] text-[#a8b5c9] hover:bg-[#2a2f3a] hover:text-[#f0f2f5]"
                    onClick={() => {
                      if (item.quantity > 1) {
                        onUpdateQuantity(item.id, item.quantity - 1)
                      }
                    }}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>

                  <span className="w-6 text-center text-sm font-bold text-[#f0f2f5]">
                    {item.quantity}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md bg-[#252a35] text-[#a8b5c9] hover:bg-[#2a2f3a] hover:text-[#f0f2f5]"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-[#a8b5c9] shrink-0">
                  x{item.quantity}
                </span>
              )}

              {/* Subtotal */}
              <span className="text-sm font-semibold text-[#f0f2f5] w-16 text-right shrink-0">
                {formatPrice(subtotal)}
              </span>

              {/* Remove button - always visible for touch accessibility */}
              {canModify && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                  onClick={() => setRemoveTarget(item)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Quitar producto"
        description={removeTarget ? `Quitar "${removeTarget.product_name}" del pedido?` : ''}
        confirmLabel="Quitar"
        onConfirm={() => {
          if (removeTarget) {
            onRemoveItem(removeTarget.id)
            setRemoveTarget(null)
          }
        }}
      />
    </>
  )
}
