'use client'

import type { Category } from '@/lib/types/database'

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string | null
  onSelectCategory: (categoryId: string | null) => void
  typeCategory: string | null
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  typeCategory
}: CategoryFilterProps) {
  if (typeCategory === 'user') {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 py-1 touch-pan-x">
        <button
          onClick={() => onSelectCategory(null)}
          className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-200 active:scale-95 touch-manipulation ${
            selectedCategory === null
              ? 'bg-[#FEC501] text-black shadow-sm shadow-[#FEC501]/30'
              : 'bg-white text-orange-700 border border-orange-200 hover:border-orange-300 hover:bg-orange-50'
          }`}
        >
          Todos
        </button>

        {categories.map((category) => {
          const isActive = selectedCategory === category.id

          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-200 active:scale-95 touch-manipulation ${
                isActive
                  ? 'bg-[#FEC501] text-black shadow-sm shadow-[#FEC501]/30'
                  : 'bg-white text-orange-700 border border-orange-200 hover:border-orange-300 hover:bg-orange-50'
              }`}
            >
              {category.name}
            </button>
          )
        })}
      </div>
    )
  }

  // Admin variant
  return (
    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x">
      <button
        onClick={() => onSelectCategory(null)}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 snap-start active:scale-95 ${
          selectedCategory === null
            ? 'bg-[#FEC501] text-black shadow-md shadow-[#FEC501]/20'
            : 'bg-[#252a35] border border-[#2a2f3a] text-[#a8b5c9] hover:bg-[#2a2f3a] hover:text-[#f0f2f5] hover:border-[#3a3f4a]'
        }`}
      >
        Todos
      </button>

      {categories.map((category) => {
        const isActive = selectedCategory === category.id

        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 snap-start whitespace-nowrap active:scale-95 ${
              isActive
                ? 'bg-[#FEC501] text-black shadow-md shadow-[#FEC501]/20'
                : 'bg-[#252a35] border border-[#2a2f3a] text-[#a8b5c9] hover:bg-[#2a2f3a] hover:text-[#f0f2f5] hover:border-[#3a3f4a]'
            }`}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
