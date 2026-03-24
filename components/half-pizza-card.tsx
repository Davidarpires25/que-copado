'use client'

import { useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, UtensilsCrossed, Scissors, Plus, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCartStore, getCartItemPrice } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import type { Product } from '@/lib/types/database'

interface HalfPizzaCardProps {
  pizzaProducts: Product[]
}

export function HalfPizzaCard({ pizzaProducts }: HalfPizzaCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [firstHalf, setFirstHalf] = useState<Product | null>(null)
  const [secondHalf, setSecondHalf] = useState<Product | null>(null)
  const [justAdded, setJustAdded] = useState(false)

  const addHalfHalfItem = useCartStore((s) => s.addHalfHalfItem)

  const availablePizzas = useMemo(
    () => pizzaProducts.filter((p) => !p.is_out_of_stock),
    [pizzaProducts]
  )

  // Minimum possible M&M price = max(cheapest, 2nd cheapest) = 2nd cheapest price
  const minPrice = useMemo(() => {
    const sorted = availablePizzas.map((p) => p.price).sort((a, b) => a - b)
    return sorted.length >= 2 ? sorted[1] : (sorted[0] ?? 0)
  }, [availablePizzas])

  const step: 1 | 2 = firstHalf === null ? 1 : 2
  const bothSelected = firstHalf !== null && secondHalf !== null

  const pickerOptions = useMemo(
    () =>
      step === 1
        ? availablePizzas
        : availablePizzas.filter((p) => p.id !== firstHalf?.id),
    [step, availablePizzas, firstHalf]
  )

  const finalPrice = useMemo(() => {
    if (!firstHalf || !secondHalf) return null
    return getCartItemPrice({ product: firstHalf, quantity: 1, secondHalf })
  }, [firstHalf, secondHalf])

  const handlePizzaSelect = useCallback(
    (pizza: Product) => {
      if (step === 1) {
        setFirstHalf(pizza)
      } else {
        setSecondHalf(pizza)
      }
    },
    [step]
  )

  const handleAdd = useCallback(() => {
    if (!firstHalf || !secondHalf || justAdded) return
    addHalfHalfItem(firstHalf, secondHalf)
    setJustAdded(true)
    toast.success(`½ ${firstHalf.name} + ½ ${secondHalf.name}`, {
      description: `${formatPrice(getCartItemPrice({ product: firstHalf, quantity: 1, secondHalf }))} agregada al carrito`,
      position: 'top-center',
    })
    setTimeout(() => {
      setJustAdded(false)
      setIsOpen(false)
    }, 800)
  }, [firstHalf, secondHalf, justAdded, addHalfHalfItem])

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setFirstHalf(null)
      setSecondHalf(null)
    }
  }, [])

  if (availablePizzas.length < 2) return null

  return (
    <>
      {/* Card — same structure/sizing as ProductCard */}
      <div
        className="h-full hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <div className="overflow-hidden bg-white rounded-2xl md:rounded-3xl border border-orange-100 shadow-warm hover:shadow-warm-lg transition-all duration-300 h-full flex flex-col group">

          {/* Image area — split pizza visual */}
          <div className="relative aspect-[4/3] md:aspect-square overflow-hidden">
            {/* Two halves background */}
            <div className="absolute inset-0 flex">
              <div className="w-1/2 h-full bg-gradient-to-br from-orange-100 to-amber-50" />
              <div className="w-1/2 h-full bg-gradient-to-bl from-amber-100 to-yellow-50" />
            </div>

            {/* Dashed diagonal divider */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <line
                x1="50" y1="0" x2="50" y2="100"
                stroke="white" strokeWidth="2" strokeDasharray="4 3"
              />
            </svg>

            {/* Left icon */}
            <div className="absolute left-0 top-0 w-1/2 h-full flex items-center justify-center">
              <UtensilsCrossed className="h-6 w-6 md:h-8 md:w-8 text-orange-300 group-hover:text-orange-400 transition-colors duration-300" />
            </div>
            {/* Right icon */}
            <div className="absolute right-0 top-0 w-1/2 h-full flex items-center justify-center">
              <UtensilsCrossed className="h-6 w-6 md:h-8 md:w-8 text-amber-300 group-hover:text-amber-400 transition-colors duration-300" />
            </div>

            {/* Center pill */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-full shadow-sm border border-orange-100 px-2 py-0.5 flex items-center gap-1">
                <Plus className="h-3 w-3 text-orange-400" strokeWidth={2.5} />
              </div>
            </div>

            {/* Badge */}
            <Badge className="absolute top-2 left-2 md:top-3 md:left-3 font-bold text-[10px] md:text-xs px-1.5 md:px-2.5 py-0.5 bg-[#FEC501] text-black border-0">
              ½ + ½
            </Badge>
          </div>

          {/* Content */}
          <div className="p-2.5 md:p-5 flex flex-col flex-1">
            <h3 className="font-bold text-sm md:text-lg text-orange-900 mb-0.5 md:mb-1 leading-tight">
              Mitad y Mitad
            </h3>
            <p className="hidden md:block text-sm text-orange-700/60 mb-4 line-clamp-2 flex-1">
              Combiná dos pizzas distintas en una
            </p>

            {/* Price & CTA */}
            <div className="flex items-center justify-between gap-1.5 mt-auto pt-1.5 md:pt-2">
              <div>
                <span className="text-[9px] md:text-[10px] text-orange-500/70 font-medium block leading-none mb-0.5">
                  desde
                </span>
                <span className="text-base md:text-2xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {formatPrice(minPrice)}
                </span>
              </div>

              <Button
                onClick={(e) => { e.stopPropagation(); setIsOpen(true) }}
                size="sm"
                aria-label="Elegir mitades para pizza mitad y mitad"
                className="h-9 md:h-11 px-2.5 md:px-4 rounded-full bg-[#FEC501] hover:bg-[#E5B001] text-black font-bold text-xs gap-1 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 touch-manipulation"
              >
                <Scissors className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Elegir</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Builder Sheet */}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[85vh] flex flex-col p-0 gap-0"
        >
          <SheetHeader className="px-4 pt-5 pb-3 border-b border-orange-100">
            <SheetTitle className="text-orange-900 text-base">
              Armá tu pizza Mitad y Mitad
            </SheetTitle>
          </SheetHeader>

          {/* Selected halves summary */}
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-50/60 border-b border-orange-100">
            <HalfSlot
              pizza={firstHalf}
              label="1ra mitad"
              onClear={() => { setFirstHalf(null); setSecondHalf(null) }}
            />
            <div className="shrink-0 w-6 h-6 rounded-full bg-white border border-orange-200 flex items-center justify-center shadow-sm">
              <Plus className="w-3 h-3 text-orange-400" strokeWidth={2.5} />
            </div>
            <HalfSlot
              pizza={secondHalf}
              label="2da mitad"
              onClear={() => setSecondHalf(null)}
              disabled={firstHalf === null}
            />
          </div>

          {/* Step label */}
          <div className="px-4 pt-3 pb-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={step}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.18 }}
                className="text-sm font-semibold text-orange-700"
              >
                {step === 1
                  ? 'Paso 1 — ¿Cuál es la primera mitad?'
                  : 'Paso 2 — ¿Y la segunda?'}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Pizza picker grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <AnimatePresence mode="popLayout">
                {pickerOptions.map((pizza) => (
                  <motion.button
                    key={pizza.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => handlePizzaSelect(pizza)}
                    className="group text-left rounded-xl border-2 border-orange-100 bg-white hover:border-[#FEC501] hover:shadow-md transition-all overflow-hidden active:scale-95 cursor-pointer touch-manipulation"
                  >
                    <div className="relative aspect-video bg-orange-50">
                      {pizza.image_url ? (
                        <Image
                          src={pizza.image_url}
                          alt={pizza.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="180px"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <UtensilsCrossed className="h-8 w-8 text-orange-200" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="font-bold text-orange-900 text-xs leading-tight line-clamp-2 mb-0.5">
                        {pizza.name}
                      </p>
                      <p className="text-orange-500 font-bold text-xs">
                        {formatPrice(pizza.price)}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Sticky footer — only when both selected */}
          <AnimatePresence>
            {bothSelected && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-4 border-t border-orange-100 flex items-center justify-between gap-4 bg-white"
              >
                <div>
                  <p className="text-[10px] text-orange-500/70 font-medium leading-none mb-0.5">
                    Se cobra el mayor
                  </p>
                  <p className="text-xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    {finalPrice !== null && formatPrice(finalPrice)}
                  </p>
                </div>

                <Button
                  onClick={handleAdd}
                  disabled={justAdded}
                  className={`px-5 py-3 h-auto rounded-xl font-bold transition-all duration-300 active:scale-95 touch-manipulation ${
                    justAdded
                      ? 'bg-green-500 hover:bg-green-500 text-white scale-105'
                      : 'bg-[#FEC501] hover:bg-[#E5B001] text-black shadow-md hover:shadow-lg'
                  }`}
                >
                  {justAdded ? (
                    <span className="flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      Agregado
                    </span>
                  ) : (
                    'Agregar al carrito'
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ─── Half slot mini-component ─────────────────────────────────────────────────

interface HalfSlotProps {
  pizza: Product | null
  label: string
  onClear: () => void
  disabled?: boolean
}

function HalfSlot({ pizza, label, onClear, disabled }: HalfSlotProps) {
  return (
    <div className="flex-1 min-w-0">
      {pizza ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 bg-white rounded-xl border-2 border-[#FEC501] px-2 py-1.5 shadow-sm"
        >
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
            {pizza.image_url ? (
              <Image src={pizza.image_url} alt={pizza.name} fill className="object-cover" sizes="32px" />
            ) : (
              <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                <UtensilsCrossed className="h-4 w-4 text-orange-300" />
              </div>
            )}
          </div>
          <p className="text-xs font-bold text-orange-900 truncate flex-1 leading-tight">
            {pizza.name}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onClear() }}
            className="shrink-0 w-5 h-5 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center transition-colors touch-manipulation"
            aria-label="Quitar esta mitad"
          >
            <X className="w-3 h-3 text-orange-500" />
          </button>
        </motion.div>
      ) : (
        <div
          className={`flex items-center gap-1.5 rounded-xl border-2 border-dashed px-2 py-1.5 ${
            disabled
              ? 'border-orange-100 bg-orange-50/30'
              : 'border-orange-200 bg-orange-50/50'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${disabled ? 'bg-orange-50' : 'bg-orange-100'}`}>
            <Plus className={`w-4 h-4 ${disabled ? 'text-orange-200' : 'text-orange-300'}`} strokeWidth={2} />
          </div>
          <p className={`text-xs font-medium truncate ${disabled ? 'text-orange-300' : 'text-orange-400'}`}>
            {label}
          </p>
        </div>
      )}
    </div>
  )
}
