'use client'

import { motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  size = 'md',
  productName,
}: QuantityStepperProps) {
  const sizeClasses = {
    sm: {
      container: 'h-8 gap-1 px-1',
      button: 'h-6 w-6',
      icon: 'h-3 w-3',
      text: 'w-6 text-sm',
    },
    md: {
      container: 'h-10 gap-1.5 px-1.5',
      button: 'h-7 w-7',
      icon: 'h-3.5 w-3.5',
      text: 'w-8 text-base',
    },
    lg: {
      container: 'h-12 gap-2 px-2',
      button: 'h-8 w-8',
      icon: 'h-4 w-4',
      text: 'w-10 text-lg',
    },
  }

  const classes = sizeClasses[size]

  return (
    <div
      role="group"
      aria-label={productName ? `Cantidad de ${productName}` : 'Cantidad'}
      className={`inline-flex items-center bg-orange-50 rounded-full ${classes.container}`}
    >
      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDecrement}
          disabled={quantity <= min}
          aria-label={productName ? `Quitar una unidad de ${productName}` : 'Quitar una unidad'}
          className={`rounded-full bg-white border border-orange-200 hover:bg-orange-100 hover:border-orange-300 disabled:opacity-50 ${classes.button}`}
        >
          <Minus className={`text-orange-600 ${classes.icon}`} />
        </Button>
      </motion.div>

      <span
        aria-live="polite"
        aria-atomic="true"
        className={`font-bold text-orange-900 text-center select-none ${classes.text}`}
      >
        {quantity}
      </span>

      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onIncrement}
          disabled={quantity >= max}
          aria-label={productName ? `Agregar una unidad de ${productName}` : 'Agregar una unidad'}
          className={`rounded-full bg-[#FEC501] hover:bg-[#E5B001] text-black disabled:opacity-50 ${classes.button}`}
        >
          <Plus className={`${classes.icon}`} />
        </Button>
      </motion.div>
    </div>
  )
}
