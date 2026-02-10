'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogOut, Plus, ArrowLeft, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryFormDialog } from '@/components/admin/categories/category-form-dialog'
import { CategoryList } from '@/components/admin/categories/category-list'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/lib/types/database'

interface CategoriesDashboardProps {
  initialCategories: Category[]
}

export function CategoriesDashboard({ initialCategories }: CategoriesDashboardProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

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
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FEC501] flex items-center justify-center">
                <Tag className="h-5 w-5 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Categorías</h1>
                <p className="text-sm text-slate-400">
                  Gestiona las categorías del menú
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Actions Bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-slate-400">
                {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
              </p>
            </div>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold"
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
              <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <Tag className="h-10 w-10 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No hay categorías
              </h3>
              <p className="text-slate-400 mb-6">
                Creá tu primera categoría para organizar el menú
              </p>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Categoría
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Form Dialog */}
      <CategoryFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        category={editingCategory}
        onCategoryCreated={handleCategoryCreated}
        onCategoryUpdated={handleCategoryUpdated}
      />
    </div>
  )
}
