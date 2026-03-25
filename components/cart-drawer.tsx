'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ShoppingCart, ArrowRight, UtensilsCrossed } from 'lucide-react'
import { DeliveryBikeIcon } from '@/components/icons'
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
import { useCartStore, useHydrated } from '@/lib/store/cart-store'
import { useUIStore } from '@/lib/store/ui-store'
import { formatPrice } from '@/lib/utils'

export function CartDrawer() {
  const hydrated = useHydrated()
  const pathname = usePathname()
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const getTotal = useCartStore((s) => s.getTotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const cartDrawerOpen = useUIStore((s) => s.cartDrawerOpen)
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen)

  useEffect(() => {
    if (pathname === '/' && sessionStorage.getItem('openCartOnMenu') === '1') {
      sessionStorage.removeItem('openCartOnMenu')
      setCartDrawerOpen(true)
    }
  }, [pathname, setCartDrawerOpen])

  const itemCount = getItemCount()
  const subtotal = getTotal()

  return (
    <Sheet open={cartDrawerOpen} onOpenChange={setCartDrawerOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-[#FEC501] shadow-sm hover:scale-105 active:scale-95 transition-all duration-150"
        >
          <ShoppingCart className="h-5 w-5 text-[#2D1A0E]" />
          {hydrated && itemCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-[#FEC501] text-black text-xs font-bold border-2 border-black shadow-md">
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-[#FFF9F0] border-l border-[#F0EBE1] p-0 flex flex-col">
        <SheetHeader className="px-4 py-4 border-b border-[#F0EBE1] bg-white/90 backdrop-blur-sm">
          <SheetTitle className="text-[#2D1A0E] flex items-center gap-2 text-lg font-black">
            <div className="w-10 h-10 rounded-full bg-[#FEC501] flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-black" />
            </div>
            Tu Pedido
            {hydrated && itemCount > 0 && (
              <span className="text-[#78706A] font-medium text-sm">
                ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
              <div className="w-24 h-24 rounded-full bg-[#FFF9F0] flex items-center justify-center">
                <UtensilsCrossed className="h-12 w-12 text-[#B0A99F]" />
              </div>
              <div className="text-center">
                <p className="text-[#2D1A0E] font-bold text-lg mb-1">
                  Tu carrito está vacío
                </p>
                <p className="text-[#78706A] text-sm">
                  Agregá productos para empezar tu pedido
                </p>
              </div>
              <Link href="/#menu">
                <Button className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-bold">
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
                        <div className="border-b border-dashed border-[#F0EBE1] my-3" />
                      )}
                    </div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Summary */}
              <div className="border-t border-[#F0EBE1] bg-white/90 backdrop-blur-sm p-4 space-y-4">
                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#78706A]">Subtotal</span>
                    <span className="text-[#2D1A0E] font-medium">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#78706A] flex items-center gap-1">
                      <DeliveryBikeIcon className="h-3.5 w-3.5" />
                      Envío
                    </span>
                    <span className="font-medium text-[#78706A] text-xs">
                      Se calcula al ingresar tu dirección
                    </span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Link href="/checkout" className="block" onClick={() => setCartDrawerOpen(false)}>
                  <Button className="w-full bg-[#FEC501] hover:bg-[#E5B001] text-black font-bold py-6 shadow-warm-lg hover:shadow-warm-xl transition-all group">
                    Finalizar Pedido
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>

                {/* Link to full cart page */}
                <Link
                  href="/cart"
                  className="block text-center text-sm text-[#2D1A0E] hover:text-[#2D1A0E] font-medium py-2"
                >
                  Ver carrito completo
                </Link>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
