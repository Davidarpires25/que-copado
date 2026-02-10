'use client'

import { motion } from 'framer-motion'
import {
  BurgerIcon,
  SodaIcon,
  PizzaIcon,
  IceCreamIcon,
  BeerIcon,
  SandwichIcon,
  SaladIcon,
  FireIcon,
  FriesIcon,
  ComboIcon,
  LomosIcon
} from '@/components/icons'
import type { Category } from '@/lib/types/database'

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string | null
  onSelectCategory: (categoryId: string | null) => void
}

const categoryIcons: Record<string, React.ElementType> = {
  hamburguesas: BurgerIcon,
  papas: FriesIcon,
  bebidas: SodaIcon,
  postres: IceCreamIcon,
  ensaladas: SaladIcon,
  pizzas: PizzaIcon,
  sandwich: SandwichIcon,
  cervezas: BeerIcon,
  combos:ComboIcon,
  lomos:LomosIcon
}

function getCategoryIcon(slug: string): React.ElementType {
  return categoryIcons[slug.toLowerCase()] || BurgerIcon
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-snap-x -mx-4 px-4">
      {/* All Category */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onSelectCategory(null)}
        className="flex flex-col items-center gap-2 scroll-snap-start shrink-0"
      >
        <div
          className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
            selectedCategory === null
              ? 'bg-[#FEC501] text-black shadow-lg'
              : 'bg-white border-2 border-orange-200 text-orange-600 hover:border-orange-300 hover:bg-orange-50'
          }`}
        >
          <FireIcon className="w-7 h-7 md:w-8 md:h-8" />
        </div>
        <span
          className={`text-xs md:text-sm font-semibold transition-colors ${
            selectedCategory === null ? 'text-orange-600' : 'text-orange-800/70'
          }`}
        >
          Todos
        </span>
      </motion.button>

      {/* Category Buttons */}
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.slug)
        const isActive = selectedCategory === category.id

        return (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectCategory(category.id)}
            className="flex flex-col items-center gap-2 scroll-snap-start shrink-0"
          >
            <div
              className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                isActive
                  ? 'bg-[#FEC501] text-black shadow-lg'
                  : 'bg-white border-2 border-orange-200 text-orange-600 hover:border-orange-300 hover:bg-orange-50'
              }`}
            >
              <Icon className="w-7 h-7 md:w-8 md:h-8" />
            </div>
            <span
              className={`text-xs md:text-sm font-semibold transition-colors max-w-[80px] text-center truncate ${
                isActive ? 'text-orange-600' : 'text-orange-800/70'
              }`}
            >
              {category.name}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
