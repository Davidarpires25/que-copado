'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/icons'
import { useCartStore } from '@/lib/store/cart-store'

const SESSION_KEY = 'qc_pending_order'

export interface PendingOrder {
  whatsappUrl: string
  customerName: string
  itemCount: number
}

export default function OrderConfirmationPage() {
  const router = useRouter()
  const clearCart = useCartStore((s) => s.clearCart)
  const [order, setOrder] = useState<PendingOrder | null>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) {
      // No hay pedido pendiente — redirigir al inicio
      router.replace('/')
      return
    }
    try {
      const data: PendingOrder = JSON.parse(raw)
      setOrder(data)
      // Limpiar carrito y sessionStorage ahora que llegamos a la confirmación
      sessionStorage.removeItem(SESSION_KEY)
      clearCart()
    } catch {
      router.replace('/')
    }
  }, [router, clearCart])

  if (!order) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md text-center space-y-6"
        >
          {/* Ícono de éxito */}
          <motion.div
            initial={shouldReduceMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={shouldReduceMotion ? { duration: 0.15 } : { delay: 0.15, type: 'spring', stiffness: 200 }}
            className="flex justify-center"
          >
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-14 w-14 text-green-500" />
            </div>
          </motion.div>

          {/* Mensaje */}
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-orange-900">
              ¡Pedido listo para enviar!
            </h1>
            <p className="text-orange-700/70">
              Hola <span className="font-semibold text-orange-800">{order.customerName}</span>,
              tu pedido de {order.itemCount} {order.itemCount === 1 ? 'producto' : 'productos'} está armado.
            </p>
            <p className="text-base text-orange-600/80">
              Tocá el botón para abrir WhatsApp y enviarnos el pedido. Te respondemos en minutos.
            </p>
          </div>

          {/* CTA principal — link directo, nunca bloqueado por popup blockers */}
          <a
            href={order.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all text-base"
          >
            <WhatsAppIcon className="h-6 w-6" />
            Abrir WhatsApp y enviar pedido
          </a>

          <p className="text-sm text-orange-600/70">
            Se abrirá WhatsApp con el detalle de tu pedido ya escrito
          </p>

          {/* Volver al menú */}
          <Link href="/#menu">
            <Button
              variant="ghost"
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al menú
            </Button>
          </Link>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
