'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn, formatPrice } from '@/lib/utils'
import type { Category, Product, ProductWithHalfConfig } from '@/lib/types/database'
import type { PosCartItem } from './order-builder'
import { HalfPizzaSelector } from './half-pizza-selector'
import { calcHalfPizzaPrice } from '@/lib/utils/half-pizza'


interface PosProductGridProps {
  products: ProductWithHalfConfig[]
  categories: Category[]
  cartItems?: PosCartItem[]
  getHalfOptions?: (product: ProductWithHalfConfig) => Product[]
  onAddItem: (product: ProductWithHalfConfig, notes?: string, price?: number, metadata?: Record<string, unknown>) => void
}

export function PosProductGrid({
  products,
  categories,
  cartItems = [],
  getHalfOptions,
  onAddItem,
}: PosProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [halfSelectorProduct, setHalfSelectorProduct] = useState<ProductWithHalfConfig | null>(null)
  const [halfOptions, setHalfOptions] = useState<Product[]>([])

  const handleProductClick = (product: ProductWithHalfConfig) => {
    const options = product.product_type === 'mitad' ? (getHalfOptions?.(product) ?? []) : []
    if (product.product_type === 'mitad' && options.length >= 2) {
      setHalfSelectorProduct(product)
      setHalfOptions(options)
    } else {
      onAddItem(product)
    }
  }

  // Cada producto siempre en el mismo lugar: por categoria, en el orden de las
  // categorias, y adentro por nombre. Venian ordenados solo por nombre, asi que
  // "Todos" mezclaba bebidas con combos y cada producto nuevo corria de lugar a
  // todos los que venian despues: el cajero no podia aprender donde estaba cada
  // cosa.
  const ordenDeCategoria = useMemo(() => {
    const orden: Record<string, number> = {}
    categories.forEach((c, i) => { orden[c.id] = c.sort_order ?? i })
    return orden
  }, [categories])

  const availableProducts = useMemo(
    () => products
      .filter((p) => p.is_active && !p.is_out_of_stock)
      .sort((a, b) =>
        (ordenDeCategoria[a.category_id ?? ''] ?? Infinity) - (ordenDeCategoria[b.category_id ?? ''] ?? Infinity) ||
        a.name.localeCompare(b.name, 'es')),
    [products, ordenDeCategoria]
  )

  // "desde": lo mas barato que puede salir una mitad y mitad, calculado con su
  // propio metodo de precio sobre todos los pares. Sin esto la tarjeta mostraba
  // el precio base del producto, que para uno `mitad` suele ser $ 0.
  const desdeMitad = useMemo(() => {
    const desde: Record<string, number> = {}
    for (const p of products) {
      if (p.product_type !== 'mitad') continue
      const opciones = getHalfOptions?.(p) ?? []
      if (opciones.length < 2) continue
      const config = p.product_half_configs?.[0]
      let minimo = Infinity
      for (let i = 0; i < opciones.length; i++) {
        for (let j = i + 1; j < opciones.length; j++) {
          minimo = Math.min(minimo, calcHalfPizzaPrice(
            config?.pricing_method ?? 'max', config?.pricing_markup_pct ?? null, opciones[i], opciones[j], p.price))
        }
      }
      if (Number.isFinite(minimo)) desde[p.id] = minimo
    }
    return desde
  }, [products, getHalfOptions])

  // Si la fila de categorias tiene mas a la derecha de lo que se ve. Desde `lg`
  // se envuelve y nunca pasa; en el celular desliza, y sin esto nada avisaba
  // que "Cervezas" seguia despues de "Ce".
  const filaCategorias = useRef<HTMLDivElement>(null)
  const [hayMas, setHayMas] = useState(false)
  const medirFila = useCallback(() => {
    const fila = filaCategorias.current
    if (!fila) return
    setHayMas(fila.scrollWidth - fila.scrollLeft - fila.clientWidth > 1)
  }, [])
  useEffect(() => {
    medirFila()
    window.addEventListener('resize', medirFila)
    return () => window.removeEventListener('resize', medirFila)
  }, [medirFila, categories.length])

  const filtered = useMemo(
    () =>
      availableProducts.filter((p) => {
        if (selectedCategory && p.category_id !== selectedCategory) return false
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      }),
    [availableProducts, selectedCategory, search]
  )

  const hasActiveFilters = !!selectedCategory || !!search
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach((cat) => {
      map[cat.id] = cat.color ?? '#FEC501'
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
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
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

      {/* Categorias: todas a la vista desde lg (se envuelven); en el celular
          deslizan y el borde avisa cuando hay mas. */}
      <div className="relative mb-3">
        <div
          ref={filaCategorias}
          onScroll={medirFila}
          data-categorias
          data-hay-mas={hayMas}
          className="px-3 flex items-center gap-0 border-b border-[var(--admin-border)] overflow-x-auto no-scrollbar lg:flex-wrap lg:gap-1.5 lg:px-4 lg:border-b-0 lg:overflow-visible"
        >
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
                    'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 tactil:min-h-11 transition-colors cursor-pointer',
                    // Desde lg, chips: las pestañas subrayadas no se leen en dos renglones.
                    'lg:px-3 lg:py-1.5 lg:rounded-full lg:border',
                    selectedCategory === null
                      ? 'border-[var(--admin-accent)] text-[var(--admin-accent-text)] lg:bg-[var(--admin-accent)] lg:text-black'
                      : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] lg:border-[var(--admin-border)] lg:bg-[var(--admin-surface)]'
                  )}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                    'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 tactil:min-h-11 transition-colors cursor-pointer',
                    // Desde lg, chips: las pestañas subrayadas no se leen en dos renglones.
                    'lg:px-3 lg:py-1.5 lg:rounded-full lg:border',
                    selectedCategory === cat.id
                      ? 'border-[var(--admin-accent)] text-[var(--admin-accent-text)] lg:bg-[var(--admin-accent)] lg:text-black'
                      : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] lg:border-[var(--admin-border)] lg:bg-[var(--admin-surface)]'
                  )}
            >
              {cat.name}
            </button>
          ))}
        </div>
        {hayMas && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--admin-bg)] to-transparent lg:hidden"
          />
        )}
      </div>

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div className="px-4 pb-0 flex items-center justify-end">
          <span className="text-xs text-[var(--admin-text-muted)] tabular-nums ">
            {filtered.length} de {availableProducts.length}
          </span>
        </div>
      )}

      {/* Products grid — Pencil style: clean cards, big price */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div data-grilla-productos className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
          {filtered.map((product) => {
            const dotColor = product.category_id
              ? (categoryColorMap[product.category_id] ?? undefined)
              : undefined
            const qty = cartQtyMap[product.id] ?? 0

            const isLowStock =
              product.stock_tracking_enabled &&
              product.current_stock !== null &&
              product.current_stock <= (product.min_stock ?? 0)

            return (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className={cn(
                  'relative flex min-h-[84px] flex-col justify-between rounded-xl border p-3 text-left',
                  'cursor-pointer transition-all duration-150 active:scale-[0.97]',
                  'ring-1 ring-inset ring-transparent',
                  qty > 0
                    // El relleno estaba en /5 y el borde en /50: sobre blanco la
                    // tarjeta que ya estaba en el carrito quedaba casi igual a
                    // las demas. Y el hover no estaba condicionado, asi que
                    // pasar el mouse por encima la pintaba de gris y le borraba
                    // el ambar. Mismo tratamiento que las filas de pago y las
                    // tarjetas de mesa.
                    ? 'border-[var(--admin-accent)] ring-[var(--admin-accent)] bg-[var(--admin-accent)]/10'
                    : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-2)] hover:border-[var(--admin-text-placeholder)]'
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
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 mb-0.5"
                      style={{ backgroundColor: dotColor ?? 'var(--admin-border)' }}
                    />
                    <p className="text-xl font-black text-[var(--admin-price)] tabular-nums leading-none">
                      {desdeMitad[product.id] !== undefined ? (
                        <>
                          <span className="mr-1 text-xs font-semibold text-[var(--admin-text-muted)]">desde</span>
                          {formatPrice(desdeMitad[product.id])}
                        </>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </p>
                  </div>
                  {isLowStock && (
                    <span className="text-panel-2xs font-bold px-1.5 py-0.5 rounded-full bg-aviso/25 text-aviso-texto leading-none shrink-0">
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

      {halfSelectorProduct && (
        <HalfPizzaSelector
          product={halfSelectorProduct}
          pizzaProducts={halfOptions}
          onConfirm={(notes, price, metadata) => {
            onAddItem(halfSelectorProduct, notes, price, metadata)
            setHalfSelectorProduct(null)
            setHalfOptions([])
          }}
          onClose={() => { setHalfSelectorProduct(null); setHalfOptions([]) }}
        />
      )}
    </div>
  )
}
