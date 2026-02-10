'use client'

import { useState } from 'react'
import { Plus, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryFormDialog } from '@/components/admin/categories/category-form-dialog'
import { CategoryList } from '@/components/admin/categories/category-list'
import { AdminLayout } from '@/components/admin/layout'
import type { Category } from '@/lib/types/database'

interface CategoriesDashboardProps {
  initialCategories: Category[]
}

export function CategoriesDashboard({ initialCategories }: CategoriesDashboardProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const handleCategoryCreated = (category: Category) => {
    setCategories([...categories, category])
    setIsFormOpen(false)
  }

  const handleCategoryUpdated = (updatedCategory: Category) => {
    setCategories(
      categories.map((cat) =>
        cat.id === updatedCategory.id ? updatedCategory : cat
      )
    )
    setEditingCategory(null)
    setIsFormOpen(false)
  }

  const handleCategoryDeleted = (categoryId: string) => {
    setCategories(categories.filter((cat) => cat.id !== categoryId))
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingCategory(null)
  }

  return (
    <AdminLayout title="Categorías" description="Gestiona las categorías del menú">
      <div className="max-w-3xl mx-auto">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-[#8b9ab0]">
            {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
          </p>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-[#FFAE00] hover:bg-[#E09D00] text-black font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
        </div>

        {/* Categories List */}
        <CategoryList
          categories={categories}
          onEdit={handleEdit}
          onDeleted={handleCategoryDeleted}
        />

        {/* Empty State */}
        {categories.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#2a2f3a] flex items-center justify-center mb-4">
              <Tag className="h-10 w-10 text-[#3a4150]" />
            </div>
            <h3 className="text-lg font-semibold text-[#f0f2f5] mb-2">
              No hay categorías
            </h3>
            <p className="text-[#8b9ab0] mb-6">
              Creá tu primera categoría para organizar el menú
            </p>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-[#FFAE00] hover:bg-[#E09D00] text-black font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Categoría
            </Button>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <CategoryFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        category={editingCategory}
        onCategoryCreated={handleCategoryCreated}
        onCategoryUpdated={handleCategoryUpdated}
      />
    </AdminLayout>
  )
}
