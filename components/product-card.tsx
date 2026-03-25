'use client'

import { memo, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, Check, Star, UtensilsCrossed, Columns2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/lib/store/cart-store'
import type { Product } from '@/lib/types/database'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'

interface ProductCardProps {
  product: Product
  badge?: 'best-seller' | 'new' | 'promo' | null
  showRating?: boolean
  rating?: number
  /** Available units to produce/sell. Shown as urgency badge when ≤ 5. */
  availableQty?: number
  /** For product_type='mitad': called instead of addItem */
  onMitadClick?: () => void
}

/** Show urgency badge when quantity is low but not zero (zero = auto-disabled) */
const LOW_STOCK_THRESHOLD = 5

export const ProductCard = memo(function ProductCard({ product, badge, showRating = false, rating = 4.5, availableQty, onMitadClick }: ProductCardProps) {
  const isLowStock = availableQty !== undefined && availableQty > 0 && availableQty <= LOW_STOCK_THRESHOLD
  const addItem = useCartStore((state) => state.addItem)
  const [justAdded, setJustAdded] = useState(false)
  const isMitad = product.product_type === 'mitad'

  const handleAddToCart = useCallback(() => {
    if (isMitad) {
      onMitadClick?.()
      return
    }
    if (product.is_out_of_stock || justAdded) return
    addItem(product)
    setJustAdded(true)
    toast.success(`${product.name} agregado`, { duration: 1500 })
    setTimeout(() => setJustAdded(false), 1200)
  }, [product, addItem, justAdded, isMitad, onMitadClick])

  return (
    <div className="h-full hover:-translate-y-1 transition-transform duration-300">
      <div className="overflow-hidden bg-white rounded-2xl md:rounded-3xl border border-[#F0EBE1] shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col group">
        {/* Image Container - square on all breakpoints */}
        <Link href={`/productos/${product.id}`} className="block">
          <div className="relative aspect-square bg-gray-100 overflow-hidden">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#F0EBE1] flex items-center justify-center">
                  <UtensilsCrossed className="h-6 w-6 md:h-8 md:w-8 text-[#B0A99F]" />
                </div>
              </div>
            )}

            {/* Badge */}
            {badge && (
              <Badge
                className={`absolute top-2 left-2 md:top-3 md:left-3 font-bold text-xs px-1.5 md:px-2.5 py-0.5 md:py-1 border-0 ${
                  badge === 'new'
                    ? 'bg-blue-500 text-white'
                    : badge === 'promo'
                    ? 'bg-red-500 text-white'
                    : 'bg-[#FEC501] text-black'
                }`}
              >
                {badge === 'best-seller' ? 'Destacado' : badge === 'new' ? 'Nuevo' : 'Oferta'}
              </Badge>
            )}

{/* Low stock urgency indicator */}
            {isLowStock && !product.is_out_of_stock && (
              <div className="absolute bottom-2 left-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white shadow-md">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Últimas unidades
                </span>
              </div>
            )}

            {/* Out of Stock Overlay — not shown for mitad (stock is on component pizzas) */}
            {product.is_out_of_stock && !isMitad && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <Badge variant="destructive" className="text-sm font-bold px-4 py-2">
                  Sin stock
                </Badge>
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="p-2.5 md:p-5 flex flex-col flex-1">
          {/* Rating */}
          {showRating && (
            <div className="flex items-center gap-1 mb-1 md:mb-2">
              <Star className="h-3 w-3 md:h-4 md:w-4 fill-amber-400 text-amber-400" />
              <span className="text-xs md:text-sm font-semibold text-[#78706A]">{rating}</span>
            </div>
          )}

          {/* Name */}
          <Link href={`/productos/${product.id}`}>
            <h3 className="font-bold text-sm md:text-base text-[#2D1A0E] mb-0.5 md:mb-1 leading-tight line-clamp-2 hover:text-[#2D1A0E] transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Description */}
          {product.description && (
            <p className="text-xs md:text-sm text-[#78706A] mb-2 md:mb-4 line-clamp-2 flex-1">
              {product.description}
            </p>
          )}

          {/* Price & Add Button */}
          <div className="flex items-center justify-between gap-1.5 mt-auto pt-1.5 md:pt-2">
            {isMitad ? (
              <span className="text-xs md:text-sm font-semibold text-[#B0A99F]">
                Elegí 2 mitades
              </span>
            ) : (
              <span className="text-base md:text-xl font-black text-[#2D1A0E]">
                {formatPrice(product.price)}
              </span>
            )}
            {isMitad ? (
              <Button
                onClick={handleAddToCart}
                size="sm"
                aria-label={`Elegir mitades para ${product.name}`}
                className="h-9 md:h-11 px-2.5 md:px-4 rounded-full bg-[#FEC501] hover:bg-[#E5B001] text-black font-bold text-xs gap-1 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 touch-manipulation"
              >
                <Columns2 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Elegir</span>
              </Button>
            ) : (
              <Button
                onClick={handleAddToCart}
                disabled={product.is_out_of_stock}
                size="icon"
                aria-label={`Agregar ${product.name} al carrito`}
                className={`h-9 w-9 md:h-11 md:w-11 rounded-full shadow-md transition-all duration-200 touch-manipulation ${
                  justAdded
                    ? 'bg-green-500 hover:bg-green-500 text-white scale-110'
                    : 'bg-[#FEC501] hover:bg-[#E5B001] text-black hover:shadow-lg hover:scale-105 active:scale-95'
                }`}
              >
                {justAdded ? (
                  <Check className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <Plus className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
