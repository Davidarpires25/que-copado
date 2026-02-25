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
  typeCategory:string | null
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
  typeCategory
}: CategoryFilterProps) {
  return (
    <div>
      {typeCategory=='user' ? (
        <div className="flex gap-4 overflow-visible pb-4 scrollbar-hide scroll-snap-x -mx-4 px-4">
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
                className={`w-18 h-18 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                  isActive
                    ? 'bg-[#FEC501] text-black shadow-lg'
                    : 'bg-white border-2 border-orange-200 text-orange-600 hover:border-orange-300 hover:bg-orange-50'
                }`}
              >
                <Icon className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <span
                className={`text-xs md:text-sm font-semibold transition-colors max-w-[150px] text-center truncate ${
                  isActive ? 'text-orange-600' : 'text-orange-800/70'
                }`}
              >
                {category.name}
              </span>
            </motion.button>
          )
        })}
      </div>
      ):(

        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide scroll-snap-x">
        {/* All Category - Admin */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectCategory(null)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 scroll-snap-start ${
            selectedCategory === null
              ? 'bg-[#FEC501] text-black shadow-md shadow-[#FEC501]/20'
              : 'bg-[#252a35] border border-[#2a2f3a] text-[#a8b5c9] hover:bg-[#2a2f3a] hover:text-[#f0f2f5] hover:border-[#3a3f4a]'
          }`}
        >
          Todos
        </motion.button>

        {/* Category chips */}
        {categories.map((category) => {
          const isActive = selectedCategory === category.id

          return (
            <motion.button
              key={category.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectCategory(category.id)}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 scroll-snap-start whitespace-nowrap ${
                isActive
                  ? 'bg-[#FEC501] text-black shadow-md shadow-[#FEC501]/20'
                  : 'bg-[#252a35] border border-[#2a2f3a] text-[#a8b5c9] hover:bg-[#2a2f3a] hover:text-[#f0f2f5] hover:border-[#3a3f4a]'
              }`}
            >
              {category.name}
            </motion.button>
          )
        })}
      </div>
      )}
    </div>
  )
}
