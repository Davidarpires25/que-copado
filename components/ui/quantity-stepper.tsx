'use client'

import { Minus, Plus } from 'lucide-react'

interface QuantityStepperProps {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
  min?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  productName?: string
}

export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  min = 1,
  max = 99,
  productName,
}: QuantityStepperProps) {
  return (
    <div
      role="group"
      aria-label={productName ? `Cantidad de ${productName}` : 'Cantidad'}
      className="inline-flex items-center bg-[#FFF9F0] rounded-[10px] border border-[#F0EBE1]"
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={quantity <= min}
        aria-label={productName ? `Quitar una unidad de ${productName}` : 'Quitar una unidad'}
        className="w-9 h-9 flex items-center justify-center disabled:opacity-40 touch-manipulation"
      >
        <Minus className="h-3.5 w-3.5 text-[#2D1A0E]" />
      </button>

      <span
        aria-live="polite"
        aria-atomic="true"
        className="w-8 text-center font-mono text-sm font-semibold text-[#2D1A0E] select-none"
      >
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrement}
        disabled={quantity >= max}
        aria-label={productName ? `Agregar una unidad de ${productName}` : 'Agregar una unidad'}
        className="w-9 h-9 flex items-center justify-center disabled:opacity-40 touch-manipulation"
      >
        <Plus className="h-3.5 w-3.5 text-[#2D1A0E]" />
      </button>
    </div>
  )
}
