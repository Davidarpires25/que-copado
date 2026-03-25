'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { SearchX, UtensilsCrossed, Check } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ProductCard } from './product-card'
import { CategoryFilter } from './category-filter'
import { useCartStore } from '@/lib/store/cart-store'
import { calcHalfPizzaPrice } from '@/lib/utils/half-pizza'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import type { Category, Product, ProductWithHalfConfig } from '@/lib/types/database'

interface ProductGridProps {
  products: ProductWithHalfConfig[]
  categories: Category[]
  stockMap?: Record<string, number>
}


export function ProductGrid({ products, categories, stockMap = {} }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Half-pizza selector state
  const [mitadProduct, setMitadProduct] = useState<ProductWithHalfConfig | null>(null)
  const [firstHalf, setFirstHalf] = useState<Product | null>(null)
  const [secondHalf, setSecondHalf] = useState<Product | null>(null)
  const [justAdded, setJustAdded] = useState(false)
  // Brief flash on the card that was just selected
  const [flashId, setFlashId] = useState<string | null>(null)

  const addHalfHalfItem = useCartStore((s) => s.addHalfHalfItem)

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products
    return products.filter((p) => p.category_id === selectedCategory)
  }, [products, selectedCategory])

  const firstCategoryId = categories.length > 0 ? categories[0].id : null

  const halfOptions = useMemo(() => {
    if (!mitadProduct) return []
    const sourceCatId =
      mitadProduct.product_half_configs?.[0]?.source_category_id ?? mitadProduct.category_id
    return products.filter(
      (p) =>
        p.category_id === sourceCatId &&
        p.product_type !== 'mitad' &&
        p.is_active
    )
  }, [mitadProduct, products])

  const step: 1 | 2 = firstHalf === null ? 1 : 2
  const bothSelected = firstHalf !== null && secondHalf !== null

  const pickerOptions = useMemo(
    () => (step === 1 ? halfOptions : halfOptions.filter((p) => p.id !== firstHalf?.id)),
    [step, halfOptions, firstHalf]
  )

  const halfConfig = mitadProduct?.product_half_configs?.[0] ?? null
  const finalPrice = useMemo(() => {
    if (!firstHalf || !secondHalf || !mitadProduct) return null
    return calcHalfPizzaPrice(
      halfConfig?.pricing_method ?? 'max',
      halfConfig?.pricing_markup_pct ?? null,
      firstHalf,
      secondHalf,
      mitadProduct.price
    )
  }, [firstHalf, secondHalf, halfConfig, mitadProduct])

  const handleMitadClick = useCallback((product: ProductWithHalfConfig) => {
    setMitadProduct(product)
    setFirstHalf(null)
    setSecondHalf(null)
    setJustAdded(false)
    setFlashId(null)
  }, [])

  const handlePizzaSelect = useCallback((pizza: Product) => {
    if (pizza.is_out_of_stock) return
    setFlashId(pizza.id)
    setTimeout(() => setFlashId(null), 250)
    if (step === 1) {
      setFirstHalf(pizza)
    } else {
      setSecondHalf(pizza)
    }
  }, [step])

  const handleAdd = useCallback(() => {
    if (!firstHalf || !secondHalf || !mitadProduct || justAdded || finalPrice === null) return
    addHalfHalfItem(firstHalf, secondHalf, finalPrice, mitadProduct.id)
    setJustAdded(true)
    toast.success(`½ ${firstHalf.name} + ½ ${secondHalf.name}`, {
      description: `${formatPrice(finalPrice)} agregada al carrito`,
      position: 'top-center',
    })
  }, [firstHalf, secondHalf, mitadProduct, justAdded, finalPrice, addHalfHalfItem])

  const handleSheetClose = useCallback((open: boolean) => {
    if (!open) {
      setMitadProduct(null)
      setFirstHalf(null)
      setSecondHalf(null)
      setJustAdded(false)
      setFlashId(null)
    }
  }, [])

  return (
    <div className="space-y-5 md:space-y-8 pb-28 md:pb-0">
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        typeCategory={'user'}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
        {filteredProducts.map((product, index) => (
          <div
            key={product.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
          >
            <ProductCard
              product={product}
              badge={
                product.category_id === firstCategoryId && index < 4 ? 'best-seller' : null
              }
              availableQty={stockMap[product.id]}
              onMitadClick={
                product.product_type === 'mitad'
                  ? () => handleMitadClick(product)
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16 px-4 animate-fade-in-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#FFF9F0] flex items-center justify-center mb-4">
            <SearchX className="h-9 w-9 text-[#B0A99F]" />
          </div>
          <h3 className="text-lg font-bold text-[#2D1A0E] mb-2">Sin resultados</h3>
          <p className="text-[#78706A] text-sm">No hay productos en esta categoría por ahora.</p>
        </div>
      )}

      {/* ── Half-pizza selector sheet ── */}
      <Sheet open={mitadProduct !== null} onOpenChange={handleSheetClose}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-3xl max-h-[88vh] flex flex-col p-0 gap-0 bg-white md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg md:rounded-3xl md:bottom-6"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-2 pt-4 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FEC501]" />
            <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${step === 2 ? 'bg-[#FEC501]' : 'bg-gray-200'}`} />
          </div>

          {/* Title */}
          <div className="px-6 pt-4 pb-5 shrink-0">
            <AnimatePresence mode="wait">
              <motion.h2
                key={step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="text-xl font-bold text-[#2D1A0E] text-center"
              >
                {step === 1 ? 'Elegí tu primera mitad' : 'Elegí tu segunda mitad'}
              </motion.h2>
            </AnimatePresence>
          </div>

          {/* Pizza picker grid */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4">
            <div className="grid grid-cols-2 gap-3 pb-4">
              <AnimatePresence mode="popLayout">
                {pickerOptions.map((pizza) => {
                  const isAgotado = pizza.is_out_of_stock
                  const isSelected = step === 2 && secondHalf?.id === pizza.id
                  return (
                    <motion.button
                      key={pizza.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileTap={isAgotado ? undefined : { scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      disabled={isAgotado}
                      onClick={() => handlePizzaSelect(pizza)}
                      className={`text-left rounded-2xl border-2 bg-white overflow-hidden transition-all duration-200 ${
                        isAgotado
                          ? 'border-gray-100 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#FEC501] shadow-md cursor-pointer touch-manipulation'
                          : 'border-gray-100 hover:border-[#FEC501] hover:shadow-md cursor-pointer touch-manipulation active:scale-[0.98]'
                      }`}
                    >
                      {/* Image */}
                      <div className="relative aspect-square bg-gray-100 overflow-hidden">
                        {pizza.image_url ? (
                          <Image
                            src={pizza.image_url}
                            alt={pizza.name}
                            fill
                            className="object-cover"
                            sizes="180px"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <UtensilsCrossed className="h-10 w-10 text-[#B0A99F]" />
                          </div>
                        )}
                        {/* Selection flash */}
                        <AnimatePresence>
                          {flashId === pizza.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="absolute inset-0 bg-[#FEC501]/30 flex items-center justify-center"
                            >
                              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                                <Check className="w-5 h-5 text-amber-600" strokeWidth={3} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Name + agotado */}
                      <div className="px-3 py-2.5">
                        <p className="font-semibold text-[#2D1A0E] text-sm leading-tight line-clamp-2">
                          {pizza.name}
                        </p>
                        {isAgotado && (
                          <p className="text-red-500 text-xs font-medium mt-0.5">Agotado</p>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer — always visible */}
          <div className="px-4 pb-6 pt-3 border-t border-gray-100 bg-white shrink-0">
            {justAdded ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <p className="text-sm font-bold text-green-600">¡Agregado!</p>
                  </div>
                  <p className="text-xs text-[#B0A99F] font-medium leading-tight truncate max-w-[180px]">
                    ½ {firstHalf?.name} + ½ {secondHalf?.name}
                  </p>
                </div>
                <Link
                  href="/cart"
                  className="px-5 py-3 rounded-xl font-bold bg-[#FEC501] hover:bg-[#E5B001] text-black text-sm whitespace-nowrap transition-all duration-200 active:scale-95 touch-manipulation"
                >
                  Ver carrito →
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[#B0A99F] font-medium">Precio mitad y mitad</p>
                  <p className={`text-xl font-black transition-colors duration-200 ${finalPrice !== null ? 'text-[#2D1A0E]' : 'text-[#E7E0D3]'}`}>
                    {finalPrice !== null ? formatPrice(finalPrice) : '—'}
                  </p>
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={!bothSelected}
                  className="px-5 py-3 h-auto rounded-xl font-bold bg-[#FEC501] hover:bg-[#E5B001] text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 touch-manipulation"
                >
                  Agregar al carrito
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

