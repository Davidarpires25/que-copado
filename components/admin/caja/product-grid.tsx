'use client'

import { useState } from 'react'
import { Package, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn, formatPrice } from '@/lib/utils'
import type { Category, Product } from '@/lib/types/database'

interface PosProductGridProps {
  products: Product[]
  categories: Category[]
  onAddItem: (product: Product) => void
}

export function PosProductGrid({
  products,
  categories,
  onAddItem,
}: PosProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const availableProducts = products.filter((p) => p.is_active && !p.is_out_of_stock)

  const filtered = availableProducts.filter((p) => {
    if (selectedCategory && p.category_id !== selectedCategory) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  const hasActiveFilters = !!selectedCategory || !!search
  const selectedCategoryName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name
    : null

  return (
    <div className="flex flex-col h-full bg-[#1a1d24]">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8b5c9]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="bg-[#12151a] border-[#2a2f3a] text-[#f0f2f5] text-sm h-10 pl-9 pr-9 placeholder:text-[#a8b5c9] focus:border-[#FEC501]/50 focus:ring-1 focus:ring-[#FEC501]/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-[#2a2f3a] transition-colors"
              aria-label="Limpiar busqueda"
            >
              <X className="h-3.5 w-3.5 text-[#a8b5c9]" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            !selectedCategory
              ? 'bg-[#FEC501] text-black'
              : 'bg-[#252a35] text-[#a8b5c9] hover:text-[#f0f2f5]'
          )}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              selectedCategory === cat.id
                ? 'bg-[#FEC501] text-black'
                : 'bg-[#252a35] text-[#a8b5c9] hover:text-[#f0f2f5]'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div className="px-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedCategoryName && (
              <span className="inline-flex items-center gap-1 bg-[#FEC501]/10 text-[#FEC501] text-xs font-medium px-2 py-1 rounded-full">
                {selectedCategoryName}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="hover:bg-[#FEC501]/20 rounded-full p-0.5 transition-colors"
                  aria-label="Quitar filtro de categoria"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 bg-[#FEC501]/10 text-[#FEC501] text-xs font-medium px-2 py-1 rounded-full">
                &quot;{search}&quot;
                <button
                  onClick={() => setSearch('')}
                  className="hover:bg-[#FEC501]/20 rounded-full p-0.5 transition-colors"
                  aria-label="Quitar filtro de busqueda"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#a8b5c9] tabular-nums">
            {filtered.length} de {availableProducts.length}
          </span>
        </div>
      )}

      {/* Products grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => onAddItem(product)}
              className="bg-[#12151a] border border-[#2a2f3a] rounded-xl p-4 text-left hover:border-[#FEC501]/50 hover:bg-[#252a35] transition-all active:scale-95 group min-h-[140px] flex flex-col"
            >
              <div className="w-full aspect-square rounded-lg bg-[#252a35] mb-3 overflow-hidden flex items-center justify-center">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                  />
                ) : (
                  <Package className="h-10 w-10 text-[#3a3f4a]" />
                )}
              </div>
              <p className="text-sm font-semibold text-[#f0f2f5] truncate mb-1">
                {product.name}
              </p>
              <p className="text-base font-bold text-[#FEC501] mt-auto">
                {formatPrice(product.price)}
              </p>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[#a8b5c9]">
            <Package className="h-10 w-10 mb-2 text-[#3a3f4a]" />
            <p className="text-sm">No se encontraron productos</p>
          </div>
        )}
      </div>
    </div>
  )
}
