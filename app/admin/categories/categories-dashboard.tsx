'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryList } from '@/components/admin/categories/category-list'
import { AdminLayout } from '@/components/admin/layout'
import type { Category } from '@/lib/types/database'

interface CategoriesDashboardProps {
  initialCategories: Category[]
  productCountMap?: Record<string, number>
}

export function CategoriesDashboard({ initialCategories, productCountMap = {} }: CategoriesDashboardProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories
    return categories.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [categories, searchQuery])

  const handleCategoryDeleted = (categoryId: string) => {
    setCategories(categories.filter((cat) => cat.id !== categoryId))
  }

  const handleCategoryReorder = (newCategories: Category[]) => {
    setCategories(newCategories)
  }

  return (
    <AdminLayout title="Categorías">
      {/* Header toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar categoría..."
            className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-9 pl-9 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>
        <p className="text-[var(--admin-text-muted)] text-sm hidden sm:block">
          {filteredCategories.length} {filteredCategories.length === 1 ? 'categoría' : 'categorías'}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => router.push('/admin/categories/new')}
            className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 transition-all hover:scale-105 active:scale-95 h-9"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nueva Categoría</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Categories List */}
      <div>
        <CategoryList
          categories={filteredCategories}
          onEdit={(category) => router.push(`/admin/categories/${category.id}/edit`)}
          onDeleted={handleCategoryDeleted}
          onReorder={handleCategoryReorder}
          productCountMap={productCountMap}
          isSearching={!!searchQuery}
        />

        {searchQuery && filteredCategories.length === 0 && categories.length > 0 && (
          <div className="text-center py-12">
            <Search className="h-10 w-10 mx-auto text-[var(--admin-border)] mb-3" />
            <p className="text-[var(--admin-text-muted)] text-sm">
              No se encontraron categorías para &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        )}

        {categories.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-full bg-[var(--admin-border)] flex items-center justify-center mb-4">
              <Tag className="h-10 w-10 text-[var(--admin-text-faint)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--admin-text)] mb-2">
              No hay categorías
            </h3>
            <p className="text-[var(--admin-text-muted)] mb-6">
              Creá tu primera categoría para organizar el menú
            </p>
            <Button
              onClick={() => router.push('/admin/categories/new')}
              className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Categoría
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
