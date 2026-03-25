'use client'

import { memo } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { Trash2, ImageOff } from 'lucide-react'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import type { CartItem as CartItemType } from '@/lib/store/cart-store'
import { getCartItemKey, getCartItemName, getCartItemPrice } from '@/lib/store/cart-store'
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
      className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white rounded-2xl border border-[#F0EBE1] shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Image */}
      {showImage && (
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-[#FFF9F0] shrink-0">
          {item.secondHalf ? (
            // Split image for half-and-half
            <div className="w-full h-full flex">
              <div className="relative w-1/2 h-full overflow-hidden">
                {item.product.image_url ? (
                  <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#FFF9F0]">
                    <ImageOff className="h-4 w-4 text-[#B0A99F]" />
                  </div>
                )}
              </div>
              <div className="relative w-1/2 h-full overflow-hidden border-l border-white/50">
                {item.secondHalf.image_url ? (
                  <Image src={item.secondHalf.image_url} alt={item.secondHalf.name} fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#FFF9F0]">
                    <ImageOff className="h-4 w-4 text-[#B0A99F]" />
                  </div>
                )}
              </div>
            </div>
          ) : item.product.image_url ? (
            <Image
              src={item.product.image_url}
              alt={item.product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="h-6 w-6 text-[#B0A99F]" />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {/* Info + observations */}
      <div className="flex-1 min-w-0 flex gap-3">
        {/* Left: name, price, actions */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h4 className="font-semibold text-[#2D1A0E] text-sm leading-tight line-clamp-2">
            {getCartItemName(item)}
          </h4>
          {item.secondHalf && (
            <span className="inline-block text-xs font-semibold text-[#78706A] bg-[#FFF9F0] px-1.5 py-0.5 rounded-full self-start">
              Mitad y mitad
            </span>
          )}

          {/* Unit price */}
          <span className="font-mono text-sm font-semibold text-[#2D1A0E]">
            {formatPrice(getCartItemPrice(item))}
          </span>

          {/* Actions: stepper + delete */}
          <div className="flex items-center gap-2 mt-1">
            <QuantityStepper
              quantity={item.quantity}
              onIncrement={() => onUpdateQuantity(item.quantity + 1)}
              onDecrement={() => onUpdateQuantity(item.quantity - 1)}
              productName={getCartItemName(item)}
            />
            <button
              onClick={onRemove}
              aria-label="Eliminar"
              className="w-9 h-9 rounded-[10px] bg-[#FEF2F2] flex items-center justify-center hover:bg-red-100 transition-colors shrink-0"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* Right: observations */}
        {item.observations && (
          <div className="shrink-0 max-w-[96px] flex items-start pt-0.5">
            <p className="text-xs text-[#B0A99F] italic text-right leading-snug line-clamp-4">
              {item.observations}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
})
