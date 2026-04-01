'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, UtensilsCrossed, Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import type { Product } from '@/lib/types/database'

interface ProductDetailViewProps {
  product: Product
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

const OBS_MAX_LENGTH = 140

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const router = useRouter()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const shouldReduceMotion = useReducedMotion()
  const addItem = useCartStore((s) => s.addItem)

  const [quantity, setQuantity] = useState(1)
  const [observations, setObservations] = useState('')

  const totalPrice = product.price * quantity

  const handleAdd = useCallback(() => {
    if (product.is_out_of_stock) return
    addItem(product, {
      quantity,
      observations: observations.trim() || undefined,
    })
    toast.success(`${product.name} agregado al carrito`, { duration: 1500 })
    router.back()
  }, [product, quantity, observations, addItem, router])

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  // -- DESKTOP: Custom overlay (matches Pencil DD2) --
  // Using custom overlay instead of Dialog to control the page background color,
  // so the warm cream (#FBF5E6) shows behind the semi-transparent dark overlay.
  if (isDesktop) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#FBF5E6]"
        onClick={handleBack}
        aria-modal="true"
        role="dialog"
        aria-label={product.name}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Modal card */}
        <div
          className="relative z-10 flex overflow-hidden rounded-3xl border border-[#F0EBE1] bg-white"
          style={{ width: '1000px', height: '700px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left: Image */}
          <div className="relative w-[460px] shrink-0 bg-gray-100">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="460px"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <UtensilsCrossed className="h-16 w-16 text-[#B0A99F]" />
              </div>
            )}

            {/* Close button on image — top left */}
            <button
              onClick={handleBack}
              aria-label="Cerrar"
              className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors z-10"
            >
              <X className="h-[18px] w-[18px] text-[#2D1A0E]" />
            </button>
          </div>

          {/* Right: Details */}
          <div className="flex-1 flex flex-col justify-between" style={{ padding: '32px 36px' }}>
            {/* Top section: badge + name + price + desc + divider + obs */}
            <div className="flex flex-col gap-5 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-2">
                {/* Badge row */}
                {product.is_out_of_stock ? (
                  <div>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-bold">
                      Sin stock
                    </span>
                  </div>
                ) : null}

                {/* Product name */}
                <h1 className="text-[28px] font-extrabold text-[#2D1A0E] leading-tight">
                  {product.name}
                </h1>

                {/* Price */}
                <p className="font-mono text-2xl font-bold text-[#2D1A0E]">
                  {formatPrice(product.price)}
                </p>

                {/* Description */}
                {product.description && (
                  <p className="text-sm text-[#78706A] leading-[1.6]">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-[#F0EBE1] shrink-0" />

              {/* Observations */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="obs-desktop"
                  className="text-[15px] font-semibold text-[#2D1A0E]"
                >
                  Observaciones
                </label>
                <textarea
                  id="obs-desktop"
                  value={observations}
                  onChange={(e) => {
                    if (e.target.value.length <= OBS_MAX_LENGTH) {
                      setObservations(e.target.value)
                    }
                  }}
                  placeholder="Sin cebolla, extra cheddar, bien cocida..."
                  maxLength={OBS_MAX_LENGTH}
                  rows={3}
                  className="bg-[#FFF9F0] border border-[#E7E0D3] rounded-xl px-4 py-3.5 text-sm text-[#2D1A0E] placeholder:text-[#B0A99F] resize-none h-[88px] outline-none focus:border-[#FEC501] transition-colors"
                />
                <span className="text-[11px] text-[#B0A99F]">Máximo 140 caracteres</span>
              </div>
            </div>

            {/* Bottom section: divider + qty + CTA */}
            <div className="flex flex-col gap-4 shrink-0">
              {/* Divider */}
              <div className="h-px bg-[#F0EBE1]" />

              {/* Quantity row */}
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-[#2D1A0E]">Cantidad</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Quitar una unidad"
                    className="w-11 h-11 rounded-xl bg-[#FFF9F0] border border-[#E7E0D3] flex items-center justify-center disabled:opacity-40 hover:bg-[#F0EBE1] transition-colors"
                  >
                    <Minus className="h-4 w-4 text-[#2D1A0E]" />
                  </button>
                  <span className="font-mono text-xl font-bold text-[#2D1A0E] w-8 text-center select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    disabled={quantity >= 99}
                    aria-label="Agregar una unidad"
                    className="w-11 h-11 rounded-xl bg-[#FEC501] flex items-center justify-center disabled:opacity-40 hover:bg-[#E5B001] transition-colors"
                  >
                    <Plus className="h-4 w-4 text-[#2D1A0E]" />
                  </button>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleAdd}
                disabled={product.is_out_of_stock}
                className="w-full h-[52px] rounded-[14px] bg-[#FEC501] hover:bg-[#E5B001] text-[#2D1A0E] font-bold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Agregar al carrito · {formatPrice(totalPrice)}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // -- MOBILE: Full page --
  const mobileDetailContent = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {/* Name */}
        <h1 className="text-2xl font-black text-[#2D1A0E] leading-tight">
          {product.name}
        </h1>

        {/* Stock badge */}
        {product.is_out_of_stock && (
          <Badge variant="destructive" className="mt-2 text-sm font-bold px-3 py-1">
            Sin stock
          </Badge>
        )}

        {/* Description */}
        {product.description && (
          <p className="mt-3 text-[#78706A] text-base leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Price */}
        <p className="mt-4 font-mono text-3xl font-black text-[#2D1A0E]">
          {formatPrice(product.price)}
        </p>

        {/* Observations */}
        <div className="mt-6">
          <label
            htmlFor="obs-mobile"
            className="block text-sm font-semibold text-[#2D1A0E] mb-1.5"
          >
            Observaciones
          </label>
          <textarea
            id="obs-mobile"
            value={observations}
            onChange={(e) => {
              if (e.target.value.length <= OBS_MAX_LENGTH) {
                setObservations(e.target.value)
              }
            }}
            placeholder="Sin cebolla, extra cheddar, bien cocida..."
            maxLength={OBS_MAX_LENGTH}
            rows={3}
            className="w-full bg-[#FFF9F0] border border-[#E7E0D3] rounded-xl px-4 py-3 text-sm text-[#2D1A0E] placeholder:text-[#B0A99F] resize-none outline-none focus:border-[#FEC501] transition-colors"
          />
          <p className="mt-1 text-xs text-[#B0A99F]">
            Máximo 140 caracteres
          </p>
        </div>

        {/* Quantity stepper */}
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#2D1A0E]">Cantidad</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Quitar una unidad"
              className="w-11 h-11 rounded-xl bg-[#FFF9F0] border border-[#E7E0D3] flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all touch-manipulation"
            >
              <Minus className="h-4 w-4 text-[#2D1A0E]" />
            </button>
            <span className="font-mono text-xl font-bold text-[#2D1A0E] w-8 text-center select-none">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              disabled={quantity >= 99}
              aria-label="Agregar una unidad"
              className="w-11 h-11 rounded-xl bg-[#FEC501] flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all touch-manipulation"
            >
              <Plus className="h-4 w-4 text-[#2D1A0E]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FBF5E6] flex flex-col">
      {/* Hero image */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative aspect-[4/3] bg-gray-100"
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <UtensilsCrossed className="h-16 w-16 text-gray-300" />
          </div>
        )}

        {/* Back button */}
        <button
          onClick={handleBack}
          aria-label="Volver"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors touch-manipulation"
        >
          <ArrowLeft className="h-5 w-5 text-gray-900" />
        </button>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 px-5 pt-5 pb-28"
      >
        {mobileDetailContent}
      </motion.div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-5 py-4">
        <button
          onClick={handleAdd}
          disabled={product.is_out_of_stock}
          className="w-full h-[52px] rounded-[14px] bg-[#FEC501] hover:bg-[#E5B001] text-[#2D1A0E] font-bold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation flex items-center justify-center gap-2"
        >
          <ShoppingCart className="h-5 w-5" />
          Agregar al carrito · {formatPrice(totalPrice)}
        </button>
      </div>
    </div>
  )
}
