'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, ArrowRight, Truck } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CartItem } from '@/components/cart-item'
import { useCartStore } from '@/lib/store/cart-store'
import { formatPrice, calculateShipping, SHIPPING_CONFIG } from '@/lib/utils'

export function CartDrawer() {
  const { items, updateQuantity, removeItem, getTotal, getItemCount } =
    useCartStore()

  const itemCount = getItemCount()
  const subtotal = getTotal()
  const shipping = calculateShipping(subtotal)
  const total = subtotal + shipping

  return (
    <Sheet>
      <SheetTrigger asChild>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="icon"
            className="relative border-2 border-orange-300 bg-white hover:bg-orange-50 hover:border-orange-400 shadow-sm"
          >
            <ShoppingCart className="h-5 w-5 text-orange-600" />
            {itemCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold border-2 border-white shadow-md">
                {itemCount}
              </Badge>
            )}
          </Button>
        </motion.div>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-gradient-to-br from-orange-50 to-amber-50 border-l border-orange-200 p-0 flex flex-col">
        <SheetHeader className="px-4 py-4 border-b border-orange-200 bg-white/80 backdrop-blur-sm">
          <SheetTitle className="text-orange-900 flex items-center gap-2 text-lg font-black">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            Tu Pedido
            {itemCount > 0 && (
              <span className="text-orange-600/60 font-medium text-sm">
                ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
              <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-5xl">🍔</span>
              </div>
              <div className="text-center">
                <p className="text-orange-900 font-bold text-lg mb-1">
                  Tu carrito está vacío
                </p>
                <p className="text-orange-600/70 text-sm">
                  Agregá productos para empezar tu pedido
                </p>
              </div>
              <Link href="/#menu">
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold">
                  Ver Menú
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
                        <div className="border-b border-dashed border-orange-200/50 my-3" />
                      )}
                    </div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Summary */}
              <div className="border-t border-orange-200 bg-white/90 backdrop-blur-sm p-4 space-y-4">
                {/* Shipping info */}
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-orange-500" />
                  {shipping === 0 ? (
                    <span className="text-green-600 font-medium">
                      Envío gratis
                    </span>
                  ) : (
                    <span className="text-orange-700/70">
                      Envío gratis en compras +{formatPrice(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD)}
                    </span>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-2">
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
                  <div className="border-t border-dashed border-orange-200 pt-2 flex justify-between">
                    <span className="text-orange-900 font-bold">Total</span>
                    <span className="text-xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Link href="/checkout" className="block">
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-6 shadow-warm-lg hover:shadow-warm-xl transition-all group">
                    Finalizar Pedido
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
