'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Plus, ImageOff, Heart, Star } from 'lucide-react'
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

export function ProductCard({ product, badge, showRating = false, rating = 4.5 }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = () => {
    if (product.is_out_of_stock) return
    addItem(product)
    toast.success(`${product.name} agregado al carrito`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <div className="overflow-hidden bg-white rounded-3xl border border-orange-100 shadow-warm hover:shadow-warm-lg transition-all duration-300 h-full flex flex-col group">
        {/* Image Container */}
        <div className="relative aspect-square bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageOff className="h-12 w-12 text-orange-200" />
            </div>
          )}

          {/* Badge */}
          {badge && (
            <Badge
              className={`absolute top-3 left-3 font-bold text-xs px-2.5 py-1 ${
                badge === 'best-seller'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0'
              }`}
            >
              {badge === 'best-seller' ? 'MÁS PEDIDO' : 'PROMO'}
            </Badge>
          )}

          {/* Favorite Button */}
          <button
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white hover:scale-110 transition-all"
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
        <div className="p-4 md:p-5 flex flex-col flex-1">
          {/* Rating */}
          {showRating && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-orange-800">{rating}</span>
            </div>
          )}

          {/* Name */}
          <h3 className="font-bold text-lg text-orange-900 mb-1 leading-tight">
            {product.name}
          </h3>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-orange-700/60 mb-4 line-clamp-2 flex-1">
              {product.description}
            </p>
          )}

          {/* Price & Add Button */}
          <div className="flex items-center justify-between gap-3 mt-auto">
            <span className="text-xl md:text-2xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {formatPrice(product.price)}
            </span>
            <Button
              onClick={handleAddToCart}
              disabled={product.is_out_of_stock}
              size="icon"
              className="h-11 w-11 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
