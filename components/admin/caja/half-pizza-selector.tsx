'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Pizza, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { formatPrice } from '@/lib/utils'
import { calcHalfPizzaPrice } from '@/lib/utils/half-pizza'
import type { Product, ProductWithHalfConfig } from '@/lib/types/database'

interface HalfPizzaSelectorProps {
  product: ProductWithHalfConfig
  pizzaProducts: Product[]
  onConfirm: (notes: string, price: number, metadata: Record<string, unknown>) => void
  onClose: () => void
}

export function HalfPizzaSelector({ product, pizzaProducts, onConfirm, onClose }: HalfPizzaSelectorProps) {
  const [firstHalf, setFirstHalf] = useState<Product | null>(null)
  const [secondHalf, setSecondHalf] = useState<Product | null>(null)

  const halfConfig = product.product_half_configs?.[0] ?? null

  const secondOptions = useMemo(
    () => pizzaProducts.filter((p) => p.id !== firstHalf?.id),
    [pizzaProducts, firstHalf]
  )

  const bothSelected = firstHalf !== null && secondHalf !== null

  const finalPrice = useMemo(() => {
    if (!firstHalf || !secondHalf) return null
    return calcHalfPizzaPrice(
      halfConfig?.pricing_method ?? 'max',
      halfConfig?.pricing_markup_pct ?? null,
      firstHalf,
      secondHalf,
      product.price
    )
  }, [firstHalf, secondHalf, halfConfig, product.price])

  const handleConfirm = () => {
    if (!firstHalf || !secondHalf || finalPrice === null) return
    onConfirm(
      `½ ${firstHalf.name} / ½ ${secondHalf.name}`,
      finalPrice,
      {
        half_1_id: firstHalf.id,
        half_1_name: firstHalf.name,
        half_2_id: secondHalf.id,
        half_2_name: secondHalf.name,
        pricing_method: halfConfig?.pricing_method ?? 'fixed',
      }
    )
  }

  const handleFirstSelect = (pizza: Product) => {
    setFirstHalf(pizza)
    // Reset second half if it was the same
    if (secondHalf?.id === pizza.id) setSecondHalf(null)
  }

  const footer = (
    <AnimatePresence>
      {bothSelected && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          className="px-4 py-4 border-t border-[var(--admin-border)] flex items-center justify-between gap-4 bg-[var(--admin-surface)] shrink-0"
        >
          <div>
            <p className="text-[10px] text-[var(--admin-text-faint)] font-medium leading-none mb-0.5">
              Precio
            </p>
            <p className="text-lg font-black text-[var(--admin-accent-text)] tabular-nums">
              {finalPrice !== null ? formatPrice(finalPrice) : formatPrice(product.price)}
            </p>
          </div>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--admin-accent)] text-black font-bold text-sm active:scale-95 transition-transform cursor-pointer hover:opacity-90"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Agregar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const content = (
    <>
      {/* Two-column layout (desktop) / stacked (mobile via Sheet) */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <div className="grid grid-cols-2 gap-4">
          {/* Col 1: 1ra mitad */}
          <div>
            <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider mb-2">
              1ra mitad
            </p>
            <div className="space-y-1.5">
              {pizzaProducts.map((pizza) => (
                <button
                  key={pizza.id}
                  onClick={() => handleFirstSelect(pizza)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer active:scale-[0.98] ${
                    firstHalf?.id === pizza.id
                      ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10'
                      : 'border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40 hover:bg-[var(--admin-surface-2)]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-[var(--admin-surface-2)]">
                    {pizza.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pizza.image_url} alt={pizza.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Pizza className="h-4 w-4 text-[var(--admin-text-faint)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--admin-text)] truncate leading-tight">
                      {pizza.name}
                    </p>
                  </div>
                  {firstHalf?.id === pizza.id && (
                    <Check className="h-3.5 w-3.5 text-[var(--admin-accent-text)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Col 2: 2da mitad */}
          <div>
            <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider mb-2">
              2da mitad
            </p>
            <div className="space-y-1.5">
              {secondOptions.map((pizza) => (
                <button
                  key={pizza.id}
                  onClick={() => setSecondHalf(pizza)}
                  disabled={firstHalf === null}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                    secondHalf?.id === pizza.id
                      ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10'
                      : 'border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40 hover:bg-[var(--admin-surface-2)]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-[var(--admin-surface-2)]">
                    {pizza.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pizza.image_url} alt={pizza.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Pizza className="h-4 w-4 text-[var(--admin-text-faint)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--admin-text)] truncate leading-tight">
                      {pizza.name}
                    </p>
                  </div>
                  {secondHalf?.id === pizza.id && (
                    <Check className="h-3.5 w-3.5 text-[var(--admin-accent-text)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {footer}
    </>
  )

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="flex flex-col p-0 gap-0 w-full max-w-xl bg-[var(--admin-surface)] border-[var(--admin-border)] overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--admin-border)] shrink-0">
          <div>
            <DialogTitle className="text-[15px] font-bold text-[var(--admin-text)]">
              {product.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--admin-text-muted)]">
              Seleccioná las 2 mitades
            </DialogDescription>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer text-[var(--admin-text-muted)]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {content}
      </DialogContent>
    </Dialog>
  )
}
