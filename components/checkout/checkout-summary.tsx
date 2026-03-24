'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Shield, ImageOff, AlertTriangle, MapPin, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { useCartStore, getCartItemKey, getCartItemName, getCartItemPrice } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'
import type { ShippingResult } from '@/lib/types/database'

interface CheckoutSummaryProps {
  onCheckout: () => void
  isLoading?: boolean
  shippingResult?: ShippingResult
  isBlocked?: boolean
  isPaused?: boolean
  isCalculatingShipping?: boolean
  isPickup?: boolean
}

export function CheckoutSummary({
  onCheckout,
  isLoading = false,
  shippingResult,
  isBlocked = false,
  isPaused = false,
  isCalculatingShipping = false,
  isPickup = false,
}: CheckoutSummaryProps) {
  const items = useCartStore((s) => s.items)
  const getTotal = useCartStore((s) => s.getTotal)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const [showDetails, setShowDetails] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const subtotal = getTotal()

  // Si es retiro en local, el envío es siempre 0 y gratis
  let shipping = 0
  let isFreeShipping = false
  let showShippingPending = false

  if (isPickup) {
    shipping = 0
    isFreeShipping = true
    showShippingPending = false
  } else {
    // Solo mostrar shipping cuando hay una zona detectada
    const hasZoneShipping = shippingResult && !shippingResult.isOutOfCoverage && shippingResult.zone
    shipping = hasZoneShipping ? shippingResult.shippingCost : 0
    isFreeShipping = hasZoneShipping ? shippingResult.isFreeShipping : false
    showShippingPending = !hasZoneShipping && !isCalculatingShipping
  }

  // Total solo incluye shipping si ya se calculó
  const total = subtotal + shipping

  return (
    <>
      {/* Desktop Version - Card sticky */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden lg:block bg-white rounded-2xl border border-orange-100 shadow-warm-lg overflow-hidden sticky top-24"
      >
        {/* Header */}
        <div className="bg-[#FEC501] px-6 py-4">
          <h2 className="text-black font-bold text-lg">Tu Pedido</h2>
          <p className="text-black/70 text-sm">
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
          </p>
        </div>

        {/* Items */}
        <div className="max-h-[300px] overflow-y-auto p-4 space-y-3">
          {items.map((item) => (
            <div
              key={getCartItemKey(item)}
              className="flex gap-3 p-2 rounded-xl bg-orange-50/50"
            >
              {/* Image */}
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white shrink-0">
                {item.secondHalf ? (
                  <div className="w-full h-full flex">
                    <div className="relative w-1/2 h-full overflow-hidden">
                      {item.product.image_url ? (
                        <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" sizes="28px" />
                      ) : (
                        <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                          <ImageOff className="h-3 w-3 text-orange-200" />
                        </div>
                      )}
                    </div>
                    <div className="relative w-1/2 h-full overflow-hidden border-l border-white/50">
                      {item.secondHalf.image_url ? (
                        <Image src={item.secondHalf.image_url} alt={item.secondHalf.name} fill className="object-cover" sizes="28px" />
                      ) : (
                        <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                          <ImageOff className="h-3 w-3 text-orange-200" />
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
                <p className="font-semibold text-orange-900 text-sm line-clamp-2 leading-tight">
                  {getCartItemName(item)}
                </p>
                <p className="text-xs text-orange-600/70">
                  {formatPrice(getCartItemPrice(item))} c/u
                </p>
                <div className="mt-1">
                  <QuantityStepper
                    quantity={item.quantity}
                    onIncrement={() =>
                      updateQuantity(getCartItemKey(item), item.quantity + 1)
                    }
                    onDecrement={() =>
                      updateQuantity(getCartItemKey(item), item.quantity - 1)
                    }
                    size="sm"
                    productName={getCartItemName(item)}
                  />
                </div>
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <p className="font-bold text-orange-600 text-sm">
                  {formatPrice(getCartItemPrice(item) * item.quantity)}
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
              {!isPickup && (
                <>
                  {isCalculatingShipping ? (
                    <Loader2 className="h-3 w-3 text-orange-600 animate-spin" />
                  ) : (
                    shippingResult && !shippingResult.isOutOfCoverage && shippingResult.zone && (
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
                </>
              )}
            </div>
            <span
              className={`font-medium ${isFreeShipping ? 'text-green-600' : showShippingPending ? 'text-orange-600' : 'text-orange-800'}`}
            >
              {!isPickup && isCalculatingShipping ? (
                <span className="text-orange-600/50">Calculando...</span>
              ) : showShippingPending ? (
                'Ingresá ubicación'
              ) : isFreeShipping ? (
                'Gratis'
              ) : (
                formatPrice(shipping)
              )}
            </span>
          </div>

          {/* Free shipping threshold hint */}
          {!isPickup && !isFreeShipping && shippingResult && !shippingResult.isOutOfCoverage && shippingResult.zone?.free_shipping_threshold && (
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
          {isBlocked && !isPaused ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">
                Seleccioná una dirección dentro de nuestra zona de cobertura
              </p>
            </div>
          ) : (
            <Button
              onClick={onCheckout}
              disabled={isLoading || items.length === 0 || isBlocked}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 shadow-lg hover:shadow-xl transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Procesando...</>
              ) : (
                <><WhatsAppIcon className="mr-2 h-5 w-5" />Pedir por WhatsApp</>
              )}
            </Button>
          )}

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-orange-600/70">
            <Shield className="h-4 w-4" />
            <span>Pedido seguro por WhatsApp</span>
          </div>
        </div>
      </motion.div>

      {/* Mobile Version - Floating bottom bar */}
      <motion.div
        initial={shouldReduceMotion ? false : { y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-orange-100 shadow-warm-xl"
      >
        {/* Detalles expandibles */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-orange-100"
            >
              <div className="px-4 py-3 space-y-2 bg-orange-50/50">
                <div className="flex justify-between text-sm">
                  <span className="text-orange-700/70">Subtotal ({items.length} {items.length === 1 ? 'producto' : 'productos'})</span>
                  <span className="text-orange-800 font-medium">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-orange-700/70">Envío</span>
                    {!isPickup && isCalculatingShipping && (
                      <Loader2 className="h-3 w-3 text-orange-600 animate-spin" />
                    )}
                    {!isPickup && shippingResult && !shippingResult.isOutOfCoverage && shippingResult.zone && (
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
                    )}
                  </div>
                  <span
                    className={`font-medium ${isFreeShipping ? 'text-green-600' : showShippingPending ? 'text-orange-600' : 'text-orange-800'}`}
                  >
                    {!isPickup && isCalculatingShipping ? (
                      <span className="text-orange-600/50">...</span>
                    ) : showShippingPending ? (
                      'Pendiente'
                    ) : isFreeShipping ? (
                      'Gratis'
                    ) : (
                      formatPrice(shipping)
                    )}
                  </span>
                </div>
                {/* Free shipping threshold hint */}
                {!isPickup && !isFreeShipping && shippingResult && !shippingResult.isOutOfCoverage && shippingResult.zone?.free_shipping_threshold && (
                  <p className="text-xs text-orange-600/70">
                    Envío gratis a partir de {formatPrice(shippingResult.zone.free_shipping_threshold)}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main floating bar */}
        <div className="px-4 py-3 space-y-3">
          {/* Total + ver detalles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-orange-900 font-bold">Total</span>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-0.5"
              >
                {showDetails ? 'ocultar' : 'ver detalles'}
                {showDetails ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronUp className="h-3 w-3" />
                )}
              </button>
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {formatPrice(total)}
            </span>
          </div>

          {/* WhatsApp Button - Full width */}
          {isBlocked && !isPaused ? (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">Seleccioná una dirección dentro de la zona</p>
            </div>
          ) : (
            <Button
              onClick={onCheckout}
              disabled={isLoading || items.length === 0 || isBlocked}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 shadow-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Procesando...</>
              ) : (
                <><WhatsAppIcon className="mr-2 h-5 w-5" />Pedir por WhatsApp</>
              )}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Spacer for mobile to prevent content being hidden behind fixed bar */}
      <div className="lg:hidden h-32" />
    </>
  )
}
