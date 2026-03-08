'use client'

import { memo, useState, useCallback } from 'react'
import Image from 'next/image'
import { Plus, Check, Heart, Star, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/lib/store/cart-store'
import type { Product } from '@/lib/types/database'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'

interface ProductCardProps {
  product: Product
  badge?: 'best-seller' | 'promo' | null
  showRating?: boolean
  rating?: number
}

export const ProductCard = memo(function ProductCard({ product, badge, showRating = false, rating = 4.5 }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)
  const [justAdded, setJustAdded] = useState(false)

  const handleAddToCart = useCallback(() => {
    if (product.is_out_of_stock || justAdded) return
    addItem(product)
    setJustAdded(true)
    toast.success(`${product.name} agregado`, { duration: 1500 })
    setTimeout(() => setJustAdded(false), 1200)
  }, [product, addItem, justAdded])

  return (
    <div className="h-full hover:-translate-y-1 transition-transform duration-300">
      <div className="overflow-hidden bg-white rounded-2xl md:rounded-3xl border border-orange-100 shadow-warm hover:shadow-warm-lg transition-all duration-300 h-full flex flex-col group">
        {/* Image Container - 4:3 on mobile, square on desktop */}
        <div className="relative aspect-[4/3] md:aspect-square bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
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
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <UtensilsCrossed className="h-6 w-6 md:h-8 md:w-8 text-orange-300" />
              </div>
            </div>
          )}

          {/* Badge */}
          {badge && (
            <Badge
              className="absolute top-2 left-2 md:top-3 md:left-3 font-bold text-[10px] md:text-xs px-1.5 md:px-2.5 py-0.5 md:py-1 bg-[#FEC501] text-black border-0"
            >
              {badge === 'best-seller' ? 'TOP' : 'PROMO'}
            </Badge>
          )}

          {/* Favorite Button - Desktop only */}
          <button
            className="hidden md:flex absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm items-center justify-center shadow-md hover:bg-white hover:scale-110 transition-all"
            aria-label="Agregar a favoritos"
          >
            <Heart className="h-5 w-5 text-orange-400 hover:text-orange-600" />
          </button>

          {/* Out of Stock Overlay */}
          {product.is_out_of_stock && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <Badge variant="destructive" className="text-sm font-bold px-4 py-2">
                Sin stock
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2.5 md:p-5 flex flex-col flex-1">
          {/* Rating */}
          {showRating && (
            <div className="flex items-center gap-1 mb-1 md:mb-2">
              <Star className="h-3 w-3 md:h-4 md:w-4 fill-amber-400 text-amber-400" />
              <span className="text-xs md:text-sm font-semibold text-orange-800">{rating}</span>
            </div>
          )}

          {/* Name */}
          <h3 className="font-bold text-[13px] md:text-lg text-orange-900 mb-0.5 md:mb-1 leading-tight line-clamp-2">
            {product.name}
          </h3>

          {/* Description - Desktop only */}
          {product.description && (
            <p className="hidden md:block text-sm text-orange-700/60 mb-4 line-clamp-2 flex-1">
              {product.description}
            </p>
          )}

          {/* Price & Add Button */}
          <div className="flex items-center justify-between gap-1.5 mt-auto pt-1.5 md:pt-2">
            <span className="text-sm md:text-2xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {formatPrice(product.price)}
            </span>
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
          </div>
        </div>
      </div>
    </div>
  )
})
