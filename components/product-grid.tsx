'use client'

import { useState, useMemo } from 'react'
import { ProductCard } from './product-card'
import { CategoryFilter } from './category-filter'
import { HalfPizzaCard } from './half-pizza-card'
import { SearchX } from 'lucide-react'
import type { Category, Product } from '@/lib/types/database'

interface ProductGridProps {
  products: Product[]
  categories: Category[]
  stockMap?: Record<string, number>
}

export function ProductGrid({ products, categories, stockMap = {} }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products
    return products.filter((p) => p.category_id === selectedCategory)
  }, [products, selectedCategory])

  // Find the first category (by sort_order) to mark its first products as "best-seller"
  const firstCategoryId = categories.length > 0 ? categories[0].id : null

  // Pizza category detection (by slug) for half-and-half feature
  const pizzaCategoryId = useMemo(
    () => categories.find((c) => c.slug === 'pizzas')?.id ?? null,
    [categories]
  )
  const pizzaProducts = useMemo(
    () => (pizzaCategoryId ? products.filter((p) => p.category_id === pizzaCategoryId && p.is_active) : []),
    [products, pizzaCategoryId]
  )

  // Show builder card when pizza category is active (or all shown and there are pizzas)
  const showPizzaBuilder =
    pizzaProducts.length >= 2 &&
    (selectedCategory === pizzaCategoryId || selectedCategory === null)

  return (
    <div className="space-y-5 md:space-y-8 pb-28 md:pb-0">
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        typeCategory={'user'}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
        {/* Half-and-half builder — spans full row, shown when in pizza category */}
        {showPizzaBuilder && (
          <HalfPizzaCard pizzaProducts={pizzaProducts} />
        )}

        {filteredProducts.map((product, index) => (
          <div
            key={product.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
          >
            <ProductCard
              product={product}
              badge={
                product.category_id === firstCategoryId && index < 4
                  ? 'best-seller'
                  : null
              }
              availableQty={stockMap[product.id]}
            />
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16 px-4 animate-fade-in-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <SearchX className="h-9 w-9 text-orange-300" />
          </div>
          <p className="text-orange-900 text-lg font-bold mb-2">
            No hay productos disponibles
          </p>
          <p className="text-orange-600/70 text-sm">
            Proba con otra categoria o volve mas tarde
          </p>
        </div>
      )}
    </div>
  )
}
