'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, ShoppingCart } from 'lucide-react'
import { Header } from '@/components/header'
import { CartItem } from '@/components/cart-item'
import { useCartStore, getCartItemKey, getCartItemName, getCartItemPrice } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const getTotal = useCartStore((s) => s.getTotal)
  const getItemCount = useCartStore((s) => s.getItemCount)

  const subtotal = getTotal()
  const itemCount = getItemCount()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FBF5E6]">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-xl">
          <div className="flex flex-col items-center justify-center gap-6 text-center">
            <div className="w-32 h-32 rounded-full bg-[#FFF9F0] flex items-center justify-center">
              <ShoppingCart className="h-16 w-16 text-[#E7E0D3]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2D1A0E] mb-2">Tu carrito está vacío</h2>
              <p className="text-[#78706A]">Explorá nuestro menú y agregá tus productos favoritos</p>
            </div>
            <Link
              href="/#menu"
              className="h-[52px] px-8 rounded-[14px] bg-[#FEC501] hover:bg-[#E5B001] text-[#2D1A0E] font-bold text-[15px] flex items-center transition-colors"
            >
              Ver Menú
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBF5E6]">
      <Header />

      <main className="container mx-auto px-4 pt-4 pb-32 max-w-xl">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            aria-label="Volver"
            className="w-10 h-10 rounded-xl bg-white border border-[#F0EBE1] flex items-center justify-center hover:bg-[#FFF9F0] transition-colors shrink-0"
          >
            <ArrowLeft className="h-[18px] w-[18px] text-[#2D1A0E]" />
          </button>
          <h1 className="text-[22px] font-extrabold text-[#2D1A0E] leading-tight tracking-tight">
            Tu carrito
          </h1>
          <div className="bg-[#FEC501] rounded-full px-2.5 py-1">
            <span className="text-[#2D1A0E] text-xs font-bold">{itemCount}</span>
          </div>
        </div>

        {/* Cart Items */}
        <div className="space-y-3 mb-4">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <CartItem
                key={getCartItemKey(item)}
                item={item}
                onUpdateQuantity={(qty) => updateQuantity(getCartItemKey(item), qty)}
                onRemove={() => removeItem(getCartItemKey(item))}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Summary card */}
        <div className="bg-[#FEF3C7] rounded-2xl p-5 space-y-3">
          <h2 className="text-base font-bold text-[#2D1A0E]">Resumen</h2>

          {/* Item rows */}
          {items.map((item) => (
            <div key={getCartItemKey(item)} className="flex items-center justify-between gap-3">
              <span className="text-sm text-[#2D1A0E] truncate">
                {getCartItemName(item)} ×{item.quantity}
              </span>
              <span className="font-mono text-sm font-semibold text-[#2D1A0E] shrink-0">
                {formatPrice(getCartItemPrice(item) * item.quantity)}
              </span>
            </div>
          ))}

          {/* Divider */}
          <div className="h-px bg-[#E8DFD0]" />

          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#2D1A0E]">Subtotal</span>
            <span className="font-mono text-base font-bold text-[#2D1A0E]">
              {formatPrice(subtotal)}
            </span>
          </div>

          {/* Shipping note */}
          <p className="text-xs italic text-[#2D1A0E]/70">
            Envío se calcula al ingresar dirección
          </p>
        </div>
      </main>

      {/* Sticky CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF9F0] px-4 py-3 pb-8 border-t border-[#F0EBE1]">
        <Link href="/checkout" className="block">
          <button className="w-full h-[52px] rounded-[14px] bg-[#FEC501] hover:bg-[#E5B001] text-[#2D1A0E] font-bold text-[15px] flex items-center justify-center gap-2 transition-colors">
            Continuar al checkout
            <ArrowRight className="h-[18px] w-[18px]" />
          </button>
        </Link>
      </div>
    </div>
  )
}
