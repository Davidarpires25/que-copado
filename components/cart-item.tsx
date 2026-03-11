'use client'

import { memo } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { Trash2, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import type { CartItem as CartItemType } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'

interface CartItemProps {
  item: CartItemType
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
  showImage?: boolean
}

export const CartItem = memo(function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  showImage = true,
}: CartItemProps) {
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.div
      layout
      initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
      className="flex gap-3 md:gap-4 p-3 md:p-4 bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Image */}
      {showImage && (
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-orange-50 shrink-0">
          {item.product.image_url ? (
            <Image
              src={item.product.image_url}
              alt={item.product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="h-6 w-6 text-orange-200" />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-bold text-orange-900 truncate text-sm md:text-base">
              {item.product.name}
            </h4>
            {item.product.description && (
              <p className="text-xs text-orange-600/60 truncate mt-0.5">
                {item.product.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2 md:mt-3 gap-2">
          <span className="font-bold text-base md:text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            {formatPrice(item.product.price * item.quantity)}
          </span>
          <QuantityStepper
            quantity={item.quantity}
            onIncrement={() => onUpdateQuantity(item.quantity + 1)}
            onDecrement={() => onUpdateQuantity(item.quantity - 1)}
            size="sm"
            productName={item.product.name}
          />
        </div>
      </div>
    </motion.div>
  )
})
