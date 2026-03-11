'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Tag, Shield, Clock } from 'lucide-react'
import { DeliveryBikeIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'

interface OrderSummaryProps {
  showPromoInput?: boolean
  showTrustBadges?: boolean
  checkoutHref?: string
  checkoutLabel?: string
}

export function OrderSummary({
  showPromoInput = true,
  showTrustBadges = true,
  checkoutHref = '/checkout',
  checkoutLabel = 'Continuar al Checkout',
}: OrderSummaryProps) {
  const [promoCode, setPromoCode] = useState('')
  const { getTotal, getItemCount } = useCartStore()

  const subtotal = getTotal()
  const discount = 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-orange-100 shadow-warm-lg overflow-hidden lg:sticky lg:top-24"
    >
      {/* Header - Más compacto en móvil */}
      <div className="bg-[#FEC501] px-4 py-3 lg:px-6 lg:py-4">
        <div className="flex items-center justify-between lg:block">
          <h2 className="text-black font-bold text-base lg:text-lg">Resumen del Pedido</h2>
          <p className="text-black/70 text-sm">
            {getItemCount()} {getItemCount() === 1 ? 'producto' : 'productos'}
          </p>
        </div>
      </div>

      {/* Content - Más compacto en móvil */}
      <div className="p-4 lg:p-6 space-y-3 lg:space-y-4">
        {/* Promo Code - Oculto en móvil */}
        {showPromoInput && (
          <div className="hidden lg:flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
              <Input
                type="text"
                placeholder="Código promocional"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="pl-10 rounded-xl border-orange-200 focus:border-orange-400"
              />
            </div>
            <Button
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50 rounded-xl px-6"
            >
              Aplicar
            </Button>
          </div>
        )}

        {/* Totals - Simplificado en móvil */}
        <div className="space-y-2 lg:space-y-3">
          {/* Subtotal y envío en una fila en móvil */}
          <div className="flex justify-between text-sm">
            <span className="text-orange-700/70">Subtotal</span>
            <span className="text-orange-800 font-medium">
              {formatPrice(subtotal)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-orange-700/70 flex items-center gap-1">
              <DeliveryBikeIcon className="h-4 w-4" />
              Envío
            </span>
            <span className="font-medium text-orange-500 text-xs lg:text-sm">
              Se calcula al ingresar tu dirección
            </span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Descuento</span>
              <span className="text-green-600 font-medium">
                -{formatPrice(discount)}
              </span>
            </div>
          )}

          <div className="border-t border-dashed border-orange-200 pt-2 lg:pt-3 flex justify-between items-center">
            <span className="text-orange-900 font-bold text-base lg:text-lg">Total</span>
            <span className="text-xl lg:text-2xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {formatPrice(subtotal)}
            </span>
          </div>
        </div>

        {/* Shipping Note */}
        <p className="text-xs text-orange-600/70 text-center">
          * El envío se calcula en el siguiente paso según tu dirección
        </p>

        {/* Checkout Button */}
        <Link href={checkoutHref} className="block lg:pt-2">
          <Button className="w-full bg-[#FEC501] hover:from-orange-600 hover:to-amber-600 text-black font-bold py-5 lg:py-6 shadow-warm-lg hover:shadow-warm-xl transition-all group rounded-xl">
            {checkoutLabel}
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>

        {/* Trust Badges - Ocultos en móvil */}
        {showTrustBadges && (
          <div className="hidden lg:flex flex-wrap justify-center gap-3 pt-4 border-t border-orange-100">
            <div className="trust-badge">
              <Shield className="h-4 w-4" />
              <span>Pago Seguro</span>
            </div>
            <div className="trust-badge">
              <Clock className="h-4 w-4" />
              <span>Envío Rápido</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
