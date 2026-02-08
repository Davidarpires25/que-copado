'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CartItem } from '@/components/cart-item'
import { OrderSummary } from '@/components/order-summary'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/store/cart-store'

export default function CartPage() {
  const { items, updateQuantity, removeItem } = useCartStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <Header />

      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Seguir comprando
        </Link>

        <h1 className="text-2xl md:text-3xl font-black text-orange-900 mb-8">
          Mi Carrito
        </h1>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-6"
          >
            <div className="w-32 h-32 rounded-full bg-orange-100 flex items-center justify-center">
              <ShoppingCart className="h-16 w-16 text-orange-300" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-orange-900 mb-2">
                Tu carrito está vacío
              </h2>
              <p className="text-orange-600/70">
                Explorá nuestro menú y agregá tus productos favoritos
              </p>
            </div>
            <Link href="/#menu">
              <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-8">
                Ver Menú
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-8 space-y-4">
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => (
                  <div key={item.product.id}>
                    <CartItem
                      item={item}
                      onUpdateQuantity={(qty) =>
                        updateQuantity(item.product.id, qty)
                      }
                      onRemove={() => removeItem(item.product.id)}
                    />
                    {index < items.length - 1 && (
                      <div className="border-b border-dashed border-orange-200/50 my-4" />
                    )}
                  </div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4">
              <OrderSummary />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
