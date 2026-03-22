'use client'

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn, formatPrice } from '@/lib/utils'
import type { Category, Product } from '@/lib/types/database'
import type { PosCartItem } from './order-builder'

// Colores sutiles por categoría (dot indicator)
const CATEGORY_DOT_COLORS = [
  'bg-[var(--admin-accent)]',
  'bg-blue-400',
  'bg-green-400',
  'bg-purple-400',
  'bg-rose-400',
  'bg-cyan-400',
  'bg-orange-400',
  'bg-teal-400',
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
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const hasActiveFilters = !!selectedCategory || !!search
  const selectedCategoryName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name
    : null

  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach((cat, i) => {
      map[cat.id] = CATEGORY_DOT_COLORS[i % CATEGORY_DOT_COLORS.length]
    })
    return map
  }, [categories])

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
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 pl-9 pr-9 rounded-xl placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-[var(--admin-border)] transition-colors cursor-pointer"
              aria-label="Limpiar busqueda"
            >
              <X className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
            </button>
          )}
        </div>
      </div>

      {/* Category chips — rounded-full pills (Pencil style) */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
            !selectedCategory
              ? 'bg-[var(--admin-accent)] text-black shadow-sm'
              : 'bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]'
          )}
        >
          Todos
        </button>
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
              selectedCategory === cat.id
                ? 'bg-[var(--admin-accent)] text-black shadow-sm'
                : 'bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]'
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', CATEGORY_DOT_COLORS[i % CATEGORY_DOT_COLORS.length])} />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div className="px-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedCategoryName && (
              <span className="inline-flex items-center gap-1 bg-[var(--admin-accent)]/10 text-[var(--admin-accent-text)] text-xs font-medium px-2 py-1 rounded-full">
                {selectedCategoryName}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="hover:bg-[var(--admin-accent)]/20 rounded-full p-0.5 transition-colors cursor-pointer"
                  aria-label="Quitar filtro"
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
                  className="hover:bg-[var(--admin-accent)]/20 rounded-full p-0.5 transition-colors cursor-pointer"
                  aria-label="Quitar filtro"
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

      {/* Products grid — Pencil style: clean cards, big price */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
          {filtered.map((product) => {
            const dotColor = product.category_id
              ? (categoryColorMap[product.category_id] ?? 'bg-[var(--admin-border)]')
              : 'bg-[var(--admin-border)]'
            const qty = cartQtyMap[product.id] ?? 0

            const isLowStock =
              product.stock_tracking_enabled &&
              product.current_stock !== null &&
              product.current_stock <= (product.min_stock ?? 0)

            return (
              <button
                key={product.id}
                onClick={() => onAddItem(product)}
                className={cn(
                  'relative bg-[var(--admin-surface)] rounded-xl p-3 text-left cursor-pointer',
                  'hover:bg-[var(--admin-surface-2)] active:scale-[0.97]',
                  'transition-all duration-150 min-h-[84px] flex flex-col justify-between',
                  'border',
                  qty > 0
                    ? 'border-[var(--admin-accent)]/50 bg-[var(--admin-accent)]/5'
                    : 'border-[var(--admin-border)]'
                )}
              >
                {/* Quantity badge */}
                {qty > 0 && (
                  <span className="absolute top-2 right-2 min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full bg-[var(--admin-accent)] text-black text-xs font-black leading-none">
                    {qty}
                  </span>
                )}

                {/* Name */}
                <p className={cn(
                  'text-sm font-semibold text-[var(--admin-text)] line-clamp-2 leading-snug',
                  qty > 0 ? 'pr-7' : ''
                )}>
                  {product.name}
                </p>

                {/* Price + indicators */}
                <div className="flex items-end justify-between mt-2 gap-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mb-0.5', dotColor)} />
                    <p className="text-xl font-black text-[var(--admin-accent-text)] tabular-nums leading-none">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                  {isLowStock && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-400 leading-none shrink-0">
                      {product.current_stock === 0 ? 'Agotado' : `${product.current_stock} u.`}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--admin-text-muted)]">
            <Search className="h-10 w-10 mb-2 text-[var(--admin-text-placeholder)]" />
            <p className="text-sm">No se encontraron productos</p>
          </div>
        )}
      </div>
    </div>
  )
}
