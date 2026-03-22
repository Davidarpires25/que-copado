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

  return (
    <AdminLayout title="Categorías" description="Gestiona las categorías de tus productos">
      {/* Search + Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar categoría..."
            className="pl-10 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>
        <Button
          onClick={() => router.push('/admin/categories/new')}
          className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold h-10 shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      {/* Categories List */}
      <div>
        <CategoryList
          categories={filteredCategories}
          onEdit={(category) => router.push(`/admin/categories/${category.id}/edit`)}
          onDeleted={handleCategoryDeleted}
          productCountMap={productCountMap}
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
