'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, ArrowLeft, User, MapPin, Truck, CreditCard, DollarSign } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/icons'
import { useCartStore } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'

const SESSION_KEY = 'qc_pending_order'

export interface PendingOrder {
  whatsappUrl: string
  customerName: string
  customerPhone: string
  itemCount: number
  subtotal: number
  shippingCost: number
  total: number
  deliveryType: 'delivery' | 'pickup'
  address?: string
  paymentMethod: string
  orderNumber: string
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
}

export default function OrderConfirmationPage() {
  const router = useRouter()
  const clearCart = useCartStore((s) => s.clearCart)
  const [order, setOrder] = useState<PendingOrder | null>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) {
      router.replace('/')
      return
    }
    try {
      const data: PendingOrder = JSON.parse(raw)
      setOrder(data)
      sessionStorage.removeItem(SESSION_KEY)
      clearCart()
    } catch {
      router.replace('/')
    }
  }, [router, clearCart])

  if (!order) return null

  const staggerDelay = shouldReduceMotion ? 0 : 0.08

  const summaryRows = [
    { icon: User, label: 'Cliente', value: order.customerName },
    {
      icon: Truck,
      label: 'Entrega',
      value: order.deliveryType === 'pickup' ? 'Retiro en local' : 'Delivery',
    },
    ...(order.deliveryType === 'delivery' && order.address
      ? [{ icon: MapPin, label: 'Direccion', value: order.address }]
      : []),
    {
      icon: CreditCard,
      label: 'Pago',
      value: PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod,
    },
    {
      icon: DollarSign,
      label: 'Total',
      value: formatPrice(order.total),
    },
  ]

  const steps = [
    'Envia el mensaje por WhatsApp',
    'El local confirma tu pedido',
    'Te coordinan la entrega',
  ]

  // Shared content blocks
  const checkmarkAndTitle = (
    <>
      {/* Checkmark icon */}
      <motion.div
        initial={shouldReduceMotion ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={
          shouldReduceMotion
            ? { duration: 0.15 }
            : { delay: 0.15, type: 'spring', stiffness: 200, damping: 14 }
        }
        className="flex justify-center"
      >
        <div className="w-20 h-20 rounded-full bg-[#FEC501] flex items-center justify-center shadow-lg">
          <Check className="h-10 w-10 text-black" strokeWidth={3} />
        </div>
      </motion.div>

      {/* Title */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl lg:text-3xl font-black text-[#2D1A0E]">
          Tu pedido esta listo!
        </h1>
        <p className="text-[#78706A] text-base">
          Ahora abri WhatsApp para confirmarlo
        </p>
      </div>

      {/* Order number badge */}
      <div className="flex justify-center">
        <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#FFF9F0] text-[#2D1A0E] font-bold text-sm">
          Pedido #{order.orderNumber}
        </span>
      </div>
    </>
  )

  const summaryCard = (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: shouldReduceMotion ? 0 : 0.3, duration: 0.35 }}
      className="bg-white rounded-2xl border border-[#F0EBE1] shadow-warm overflow-hidden"
    >
      <div className="divide-y divide-[#F0EBE1]">
        {summaryRows.map((row, i) => (
          <div key={row.label} className="flex items-start gap-3 px-5 py-3.5">
            <row.icon className="h-4.5 w-4.5 text-[#B0A99F] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#B0A99F] font-medium">{row.label}</p>
              <p className="text-sm font-semibold text-[#2D1A0E] truncate">
                {row.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )

  const whatsappCta = (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: shouldReduceMotion ? 0 : 0.45, duration: 0.35 }}
      className="space-y-5"
    >
      <a
        href={order.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all text-base"
      >
        <WhatsAppIcon className="h-6 w-6" />
        Abrir WhatsApp y confirmar
      </a>
    </motion.div>
  )

  const stepsCard = (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: shouldReduceMotion ? 0 : 0.55, duration: 0.35 }}
      className="bg-[#FEC501]/10 border border-[#FEC501]/30 rounded-2xl p-5"
    >
      <h3 className="font-bold text-[#2D1A0E] text-sm mb-3">Como sigue?</h3>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <motion.li
            key={i}
            initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: shouldReduceMotion ? 0 : 0.6 + i * staggerDelay, duration: 0.25 }}
            className="flex items-start gap-3"
          >
            <span className="w-6 h-6 rounded-full bg-[#FEC501] flex items-center justify-center text-xs font-bold text-black shrink-0">
              {i + 1}
            </span>
            <span className="text-sm text-[#2D1A0E] leading-relaxed pt-0.5">
              {step}
            </span>
          </motion.li>
        ))}
      </ol>
    </motion.div>
  )

  const backLink = (
    <div className="flex justify-center pt-2">
      <Link href="/#menu">
        <Button
          variant="ghost"
          className="text-[#2D1A0E] hover:text-[#2D1A0E] hover:bg-[#F0EBE1] gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al menu
        </Button>
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FBF5E6] flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-8 lg:py-12">
        {/* Mobile layout: single column */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md lg:hidden space-y-5"
        >
          {checkmarkAndTitle}
          {summaryCard}
          {whatsappCta}
          {stepsCard}
          {backLink}
        </motion.div>

        {/* Desktop layout: two columns */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden lg:grid lg:grid-cols-2 lg:gap-10 w-full max-w-3xl items-start"
        >
          {/* Left column: header + summary */}
          <div className="space-y-5">
            {checkmarkAndTitle}
            {summaryCard}
            {backLink}
          </div>

          {/* Right column: CTA + steps */}
          <div className="space-y-5 pt-2">
            {whatsappCta}
            {stepsCard}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
