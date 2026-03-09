'use client'

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn, formatPrice } from '@/lib/utils'
import type { Category, Product } from '@/lib/types/database'
import type { PosCartItem } from './order-builder'

// Colores por índice de categoría para identificación visual rápida
const CATEGORY_COLORS = [
  'border-l-[var(--admin-accent)]',
  'border-l-blue-400',
  'border-l-green-400',
  'border-l-purple-400',
  'border-l-rose-400',
  'border-l-cyan-400',
  'border-l-orange-400',
  'border-l-teal-400',
]

interface PosProductGridProps {
  products: Product[]
  categories: Category[]
  cartItems?: PosCartItem[]
  onAddItem: (product: Product) => void
}

export function PosProductGrid({
  products,
  categories,
  cartItems = [],
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

  // Mapa de categoría → color
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach((cat, i) => {
      map[cat.id] = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
    })
    return map
  }, [categories])

  // Mapa de producto → cantidad en carrito
  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of cartItems) {
      map[item.id] = item.quantity
    }
    return map
  }, [cartItems])

  return (
    <div className="flex flex-col h-full bg-[var(--admin-bg)]">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 pl-9 pr-9 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-[var(--admin-border)] transition-colors"
              aria-label="Limpiar busqueda"
            >
              <X className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
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
              ? 'bg-[var(--admin-accent)] text-black'
              : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
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
                ? 'bg-[var(--admin-accent)] text-black'
                : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
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
              <span className="inline-flex items-center gap-1 bg-[var(--admin-accent)]/10 text-[var(--admin-accent-text)] text-xs font-medium px-2 py-1 rounded-full">
                {selectedCategoryName}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="hover:bg-[var(--admin-accent)]/20 rounded-full p-0.5 transition-colors"
                  aria-label="Quitar filtro de categoria"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 bg-[var(--admin-accent)]/10 text-[var(--admin-accent-text)] text-xs font-medium px-2 py-1 rounded-full">
                &quot;{search}&quot;
                <button
                  onClick={() => setSearch('')}
                  className="hover:bg-[var(--admin-accent)]/20 rounded-full p-0.5 transition-colors"
                  aria-label="Quitar filtro de busqueda"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <span className="text-xs text-[var(--admin-text-muted)] tabular-nums">
            {filtered.length} de {availableProducts.length}
          </span>
        </div>
      )}

      {/* Products grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
          {filtered.map((product) => {
            const colorClass = product.category_id
              ? (categoryColorMap[product.category_id] ?? 'border-l-[var(--admin-border)]')
              : 'border-l-[var(--admin-border)]'
            const qty = cartQtyMap[product.id] ?? 0

            // Stock bajo: solo reventa con tracking habilitado
            const isLowStock =
              product.stock_tracking_enabled &&
              product.current_stock !== null &&
              product.current_stock <= (product.min_stock ?? 0)

            return (
              <button
                key={product.id}
                onClick={() => onAddItem(product)}
                className={cn(
                  'relative bg-[var(--admin-surface)] border border-[var(--admin-border)] border-l-4 rounded-lg p-3 text-left',
                  'hover:bg-[var(--admin-surface-2)] active:scale-95',
                  'transition-all min-h-[72px] flex flex-col justify-between',
                  qty > 0
                    ? 'hover:border-[var(--admin-accent)]/60 border-[var(--admin-accent)]/40 bg-[var(--admin-accent)]/5'
                    : 'hover:border-[var(--admin-text-placeholder)]',
                  colorClass
                )}
              >
                {qty > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-[var(--admin-accent)] text-black text-xs font-bold leading-none">
                    {qty}
                  </span>
                )}
                <p className="text-sm font-semibold text-[var(--admin-text)] line-clamp-2 leading-snug pr-5">
                  {product.name}
                </p>
                <div className="flex items-end justify-between mt-1.5 gap-1">
                  <p className="text-lg font-bold text-[var(--admin-accent-text)] tabular-nums">
                    {formatPrice(product.price)}
                  </p>
                  {isLowStock && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 leading-none shrink-0">
                      {product.current_stock === 0 ? 'Agotado' : `${product.current_stock} u.`}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--admin-text-muted)]">
            <Search className="h-10 w-10 mb-2 text-[var(--admin-text-placeholder)]" />
            <p className="text-sm">No se encontraron productos</p>
          </div>
        )}
      </div>
    </div>
  )
}
