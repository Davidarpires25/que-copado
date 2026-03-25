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
              : 'bg-white text-[#2D1A0E] border border-[#E7E0D3] hover:border-[#F0EBE1] hover:bg-[#FFF9F0]'
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
                  : 'bg-white text-[#2D1A0E] border border-[#E7E0D3] hover:border-[#F0EBE1] hover:bg-[#FFF9F0]'
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
        className={`inline-flex items-center px-4 py-2 text-xs font-semibold transition-all duration-200 shrink-0 snap-start whitespace-nowrap ${
          selectedCategory === null
            ? 'bg-[var(--admin-accent)] text-black'
            : 'bg-transparent border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-text-muted)]'
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
            className={`inline-flex items-center px-4 py-2 text-xs font-semibold transition-all duration-200 shrink-0 snap-start whitespace-nowrap ${
              isActive
                ? 'bg-[var(--admin-accent)] text-black'
                : 'bg-transparent border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-text-muted)]'
            }`}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
