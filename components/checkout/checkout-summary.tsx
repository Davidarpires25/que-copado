'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { MessageCircle, Shield, ImageOff, AlertTriangle, MapPin, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { useCartStore } from '@/lib/store/cart-store'
import { formatPrice, calculateShipping, SHIPPING_CONFIG } from '@/lib/utils'
import type { ShippingResult } from '@/lib/types/database'

interface CheckoutSummaryProps {
  onCheckout: () => void
  isLoading?: boolean
  shippingResult?: ShippingResult
  isBlocked?: boolean
  isCalculatingShipping?: boolean
}

export function CheckoutSummary({
  onCheckout,
  isLoading = false,
  shippingResult,
  isBlocked = false,
  isCalculatingShipping = false,
}: CheckoutSummaryProps) {
  const { items, getTotal, updateQuantity } = useCartStore()

  const subtotal = getTotal()

  // Use shipping result if available, otherwise fallback to legacy calculation
  const hasZoneShipping = shippingResult && !shippingResult.isOutOfCoverage && shippingResult.zone
  const shipping = hasZoneShipping
    ? shippingResult.shippingCost
    : calculateShipping(subtotal)
  const isFreeShipping = hasZoneShipping
    ? shippingResult.isFreeShipping
    : subtotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD

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

        {/* Shipping with zone info */}
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-orange-700/70">Envío</span>
            {isCalculatingShipping ? (
              <Loader2 className="h-3 w-3 text-orange-600 animate-spin" />
            ) : (
              hasZoneShipping && shippingResult.zone && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${shippingResult.zone.color}15`,
                    color: shippingResult.zone.color,
                  }}
                >
                  <MapPin className="h-3 w-3" />
                  {shippingResult.zone.name}
                </span>
              )
            )}
          </div>
          <span
            className={`font-medium ${isFreeShipping ? 'text-green-600' : 'text-orange-800'}`}
          >
            {isCalculatingShipping ? (
              <span className="text-orange-600/50">Calculando...</span>
            ) : isFreeShipping ? (
              'Gratis'
            ) : (
              formatPrice(shipping)
            )}
          </span>
        </div>

        {/* Free shipping threshold hint */}
        {!isFreeShipping && hasZoneShipping && shippingResult.zone?.free_shipping_threshold && (
          <p className="text-xs text-orange-600/70">
            Envío gratis a partir de {formatPrice(shippingResult.zone.free_shipping_threshold)}
          </p>
        )}

        <div className="border-t border-dashed border-orange-200 pt-2 flex justify-between items-center">
          <span className="text-orange-900 font-bold">Total</span>
          <span className="text-xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="p-4 pt-0 space-y-3">
        {isBlocked ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700">
              Seleccioná una dirección dentro de nuestra zona de cobertura
            </p>
          </div>
        ) : (
          <Button
            onClick={onCheckout}
            disabled={isLoading || items.length === 0}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 shadow-lg hover:shadow-xl transition-all rounded-xl"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            {isLoading ? 'Enviando...' : 'Pedir por WhatsApp'}
          </Button>
        )}

        {/* Trust Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-orange-600/70">
          <Shield className="h-4 w-4" />
          <span>Pedido seguro por WhatsApp</span>
        </div>
      </div>
    </motion.div>
  )
}
