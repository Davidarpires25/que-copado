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
  ComboIcon,
  LomosIcon,
} from '@/components/icons'
import type { Category } from '@/lib/types/database'

interface CategoriesSectionProps {
  categories: Category[]
}

const categoryIcons: Record<string, React.ElementType> = {
  hamburguesas: BurgerIcon,
  bebidas: SodaIcon,
  postres: IceCreamIcon,
  ensaladas: SaladIcon,
  pizzas: PizzaIcon,
  sandwiches: SandwichIcon,
  cervezas: BeerIcon,
  combos:ComboIcon,
  lomos:LomosIcon
}

function getCategoryIcon(slug: string): React.ElementType {
  return categoryIcons[slug.toLowerCase()] || BurgerIcon
}

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  const allCategories = [
    { id: null, name: 'Todos', slug: 'todos', icon: FireIcon },
    ...categories.map((cat) => ({
      ...cat,
      icon: getCategoryIcon(cat.slug),
    })),
  ]

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <h2 className="text-2xl md:text-3xl font-black text-orange-900">
            Categorías
          </h2>
          <p className="text-orange-700/60 text-sm mt-1">
            Explorá nuestro menú completo
          </p>
        </motion.div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-snap-x -mx-4 px-4">
          {allCategories.map((category, index) => {
            const Icon = category.icon

            return (
              <motion.a
                key={category.id ?? 'all'}
                href={category.id ? `#${category.slug}` : '#menu'}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-2 scroll-snap-start shrink-0"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border-2 border-orange-200 text-orange-600 flex items-center justify-center shadow-md hover:border-orange-400 hover:shadow-warm-lg transition-all">
                  <Icon className="w-7 h-7 md:w-8 md:h-8" />
                </div>
                <span className="text-xs md:text-sm font-semibold text-orange-800/70 max-w-[80px] text-center truncate">
                  {category.name}
                </span>
              </motion.a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
