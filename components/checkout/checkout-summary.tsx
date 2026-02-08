'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { MessageCircle, Shield, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { useCartStore } from '@/lib/store/cart-store'
import { formatPrice, calculateShipping } from '@/lib/utils'

interface CheckoutSummaryProps {
  onCheckout: () => void
  isLoading?: boolean
}

export function CheckoutSummary({ onCheckout, isLoading = false }: CheckoutSummaryProps) {
  const { items, getTotal, updateQuantity } = useCartStore()

  const subtotal = getTotal()
  const shipping = calculateShipping(subtotal)
  const total = subtotal + shipping

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-orange-100 shadow-warm-lg overflow-hidden sticky top-24"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
        <h2 className="text-white font-bold text-lg">Tu Pedido</h2>
        <p className="text-white/80 text-sm">
          {items.length} {items.length === 1 ? 'producto' : 'productos'}
        </p>
      </div>

      {/* Items */}
      <div className="max-h-[300px] overflow-y-auto p-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="flex gap-3 p-2 rounded-xl bg-orange-50/50"
          >
            {/* Image */}
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white shrink-0">
              {item.product.image_url ? (
                <Image
                  src={item.product.image_url}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff className="h-5 w-5 text-orange-200" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-orange-900 text-sm truncate">
                {item.product.name}
              </p>
              <p className="text-xs text-orange-600/70">
                {formatPrice(item.product.price)} c/u
              </p>
              <div className="mt-1">
                <QuantityStepper
                  quantity={item.quantity}
                  onIncrement={() =>
                    updateQuantity(item.product.id, item.quantity + 1)
                  }
                  onDecrement={() =>
                    updateQuantity(item.product.id, item.quantity - 1)
                  }
                  size="sm"
                />
              </div>
            </div>

            {/* Price */}
            <div className="text-right shrink-0">
              <p className="font-bold text-orange-600 text-sm">
                {formatPrice(item.product.price * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="p-4 border-t border-orange-100 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-orange-700/70">Subtotal</span>
          <span className="text-orange-800 font-medium">
            {formatPrice(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-orange-700/70">Envío</span>
          <span
            className={`font-medium ${shipping === 0 ? 'text-green-600' : 'text-orange-800'}`}
          >
            {shipping === 0 ? 'Gratis' : formatPrice(shipping)}
          </span>
        </div>
        <div className="border-t border-dashed border-orange-200 pt-2 flex justify-between items-center">
          <span className="text-orange-900 font-bold">Total</span>
          <span className="text-xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="p-4 pt-0 space-y-3">
        <Button
          onClick={onCheckout}
          disabled={isLoading || items.length === 0}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 shadow-lg hover:shadow-xl transition-all rounded-xl"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          {isLoading ? 'Enviando...' : 'Pedir por WhatsApp'}
        </Button>

        {/* Trust Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-orange-600/70">
          <Shield className="h-4 w-4" />
          <span>Pedido seguro por WhatsApp</span>
        </div>
      </div>
    </motion.div>
  )
}
