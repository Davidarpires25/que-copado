'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ProductCard } from './product-card'
import { CategoryFilter } from './category-filter'
import type { Category, Product } from '@/lib/types/database'

interface ProductGridProps {
  products: Product[]
  categories: Category[]
}

export function ProductGrid({ products, categories }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products
    return products.filter((p) => p.category_id === selectedCategory)
  }, [products, selectedCategory])

  return (
    <div className="space-y-6 md:space-y-8 pb-24 md:pb-0">
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <motion.div
        layout
        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6"
      >
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <ProductCard
              product={product}
              badge={index < 3 ? 'best-seller' : null}
            />
          </motion.div>
        ))}
      </motion.div>

      {filteredProducts.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 px-4"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <span className="text-4xl">😕</span>
          </div>
          <p className="text-orange-900 text-lg font-bold mb-2">
            No hay productos disponibles
          </p>
          <p className="text-orange-600/70 text-sm">
            Probá con otra categoría o volvé más tarde
          </p>
        </motion.div>
      )}
    </div>
  )
}
