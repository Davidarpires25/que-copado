'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Shield, AlertTriangle, MapPin, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        className="hidden lg:block bg-white rounded-2xl border border-[#F0EBE1] overflow-hidden sticky top-24"
      >
        {/* Title */}
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold text-[#2D1A0E]">Resumen del pedido</h2>
          <p className="text-sm text-[#78706A]">
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
          </p>
        </div>

        {/* Items */}
        <div className="max-h-[300px] overflow-y-auto px-6 py-3 space-y-3">
          {items.map((item) => (
            <div
              key={getCartItemKey(item)}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* qty badge */}
                <div className="w-7 h-7 rounded-lg bg-[#FFF9F0] flex items-center justify-center shrink-0">
                  <span className="font-mono text-xs font-semibold text-[#2D1A0E]">{item.quantity}</span>
                </div>
                <span className="text-sm font-medium text-[#2D1A0E] truncate">{getCartItemName(item)}</span>
              </div>
              <span className="font-mono text-sm font-semibold text-[#2D1A0E] shrink-0">
                {formatPrice(getCartItemPrice(item) * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-6 py-4 space-y-3 border-t border-[#F0EBE1] mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-[#78706A]">Subtotal</span>
            <span className="font-mono font-semibold text-[#2D1A0E]">
              {formatPrice(subtotal)}
            </span>
          </div>

          {/* Shipping with zone info */}
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-[#78706A]">Envío</span>
              {!isPickup && (
                <>
                  {isCalculatingShipping ? (
                    <Loader2 className="h-3 w-3 text-[#78706A] animate-spin" />
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
              className={`font-mono font-semibold ${isFreeShipping ? 'text-green-600' : showShippingPending ? 'text-[#78706A]' : 'text-[#2D1A0E]'}`}
            >
              {!isPickup && isCalculatingShipping ? (
                <span className="text-[#B0A99F]">Calculando...</span>
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
            <p className="text-xs text-[#78706A]">
              Envío gratis a partir de {formatPrice(shippingResult.zone.free_shipping_threshold)}
            </p>
          )}

          <div className="border-t border-[#F0EBE1] pt-3 flex justify-between items-center">
            <span className="font-bold text-[#2D1A0E] text-lg">Total</span>
            <span className="font-mono text-2xl font-bold text-[#2D1A0E]">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="px-6 pb-6 space-y-3">
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
              className="w-full h-[52px] rounded-[14px] bg-[#FEC501] hover:bg-[#E5B001] text-[#2D1A0E] font-bold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Procesando...</>
              ) : (
                `Confirmar pedido · ${formatPrice(total)}`
              )}
            </Button>
          )}

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-[#78706A]">
            <Shield className="h-4 w-4" />
            <span>Pedido seguro por WhatsApp</span>
          </div>
        </div>
      </motion.div>

      {/* Mobile Version - Floating bottom bar */}
      <motion.div
        initial={shouldReduceMotion ? false : { y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#F0EBE1] shadow-warm-xl"
      >
        {/* Detalles expandibles */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-[#F0EBE1]"
            >
              <div className="px-4 py-3 space-y-2 bg-[#FFF9F0]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#78706A]">Subtotal ({items.length} {items.length === 1 ? 'producto' : 'productos'})</span>
                  <span className="font-mono font-semibold text-[#2D1A0E]">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#78706A]">Envío</span>
                    {!isPickup && isCalculatingShipping && (
                      <Loader2 className="h-3 w-3 text-[#78706A] animate-spin" />
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
                    className={`font-mono font-semibold ${isFreeShipping ? 'text-green-600' : showShippingPending ? 'text-[#78706A]' : 'text-[#2D1A0E]'}`}
                  >
                    {!isPickup && isCalculatingShipping ? (
                      <span className="text-[#B0A99F]">...</span>
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
                  <p className="text-xs text-[#78706A]">
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
              <span className="text-[#2D1A0E] font-bold">Total</span>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-[#78706A] hover:text-[#2D1A0E] flex items-center gap-0.5"
              >
                {showDetails ? 'ocultar' : 'ver detalles'}
                {showDetails ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronUp className="h-3 w-3" />
                )}
              </button>
            </div>
            <span className="font-mono text-xl font-bold text-[#2D1A0E]">
              {formatPrice(total)}
            </span>
          </div>

          {/* CTA Button - Full width */}
          {isBlocked && !isPaused ? (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">Seleccioná una dirección dentro de la zona</p>
            </div>
          ) : (
            <Button
              onClick={onCheckout}
              disabled={isLoading || items.length === 0 || isBlocked}
              className="w-full h-[52px] rounded-[14px] bg-[#FEC501] hover:bg-[#E5B001] text-[#2D1A0E] font-bold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Procesando...</>
              ) : (
                `Confirmar pedido · ${formatPrice(total)}`
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
