'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import { useCartStore, useHydrated } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'

export function FloatingCartButton() {
  const hydrated = useHydrated()
  const { getTotal, getItemCount } = useCartStore()
  const itemCount = getItemCount()
  const total = getTotal()

  return (
    <AnimatePresence>
      {hydrated && itemCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 p-4 md:hidden"
        >
          <Link href="/checkout">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-between gap-3 bg-[#FEC501] text-black px-5 py-4 rounded-2xl shadow-warm-xl"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="h-6 w-6" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#FEC501] text-black text-xs font-bold rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs opacity-90">Ver carrito</span>
                  <span className="font-bold text-base">{formatPrice(total)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Pedir</span>
                <ArrowRight className="h-5 w-5" />
              </div>
            </motion.div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
