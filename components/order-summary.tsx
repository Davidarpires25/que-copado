'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Clock } from 'lucide-react'
import { DeliveryBikeIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'

interface OrderSummaryProps {
  showTrustBadges?: boolean
  checkoutHref?: string
  checkoutLabel?: string
}

export function OrderSummary({
  showTrustBadges = true,
  checkoutHref = '/checkout',
  checkoutLabel = 'Continuar al Checkout',
}: OrderSummaryProps) {
  const { getTotal, getItemCount } = useCartStore()

  const subtotal = getTotal()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#F0EBE1] shadow-warm-lg overflow-hidden lg:sticky lg:top-24"
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
        {/* Totals - Simplificado en móvil */}
        <div className="space-y-2 lg:space-y-3">
          {/* Subtotal y envío en una fila en móvil */}
          <div className="flex justify-between text-sm">
            <span className="text-[#78706A]">Subtotal</span>
            <span className="text-[#2D1A0E] font-medium">
              {formatPrice(subtotal)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-[#78706A] flex items-center gap-1">
              <DeliveryBikeIcon className="h-4 w-4" />
              Envío
            </span>
            <span className="font-medium text-[#78706A] text-xs lg:text-sm">
              Se calcula al ingresar tu dirección
            </span>
          </div>

          <div className="border-t border-dashed border-[#E7E0D3] pt-2 lg:pt-3 flex justify-between items-center">
            <div>
              <span className="text-[#2D1A0E] font-bold text-base lg:text-lg">Subtotal</span>
              <p className="text-[10px] text-[#78706A]">+ envío al ingresar dirección</p>
            </div>
            <span className="text-xl lg:text-2xl font-black text-[#2D1A0E]">
              {formatPrice(subtotal)}
            </span>
          </div>
        </div>

        {/* Shipping Note */}
        <p className="text-xs text-[#78706A] text-center">
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
          <div className="hidden lg:flex flex-wrap justify-center gap-3 pt-4 border-t border-[#F0EBE1]">
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
