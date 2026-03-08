'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, GripVertical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { deleteCategory, updateCategory } from '@/app/actions/categories'
import { toast } from 'sonner'
import type { Category } from '@/lib/types/database'

interface CategoryListProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDeleted: (categoryId: string) => void
}

export function CategoryList({ categories, onEdit, onDeleted }: CategoryListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const handleDelete = async (category: Category) => {
    setDeleteTarget(null)
    setDeletingId(category.id)
    try {
      const result = await deleteCategory(category.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Categoría eliminada')
      onDeleted(category.id)
    } catch {
      toast.error('Error al eliminar la categoría')
    } finally {
      setDeletingId(null)
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const category = categories[index]
    const prevCategory = categories[index - 1]

    setMovingId(category.id)
    try {
      await updateCategory(category.id, { sort_order: prevCategory.sort_order })
      await updateCategory(prevCategory.id, { sort_order: category.sort_order })
      router.refresh()
    } catch {
      toast.error('Error al reordenar')
    } finally {
      setMovingId(null)
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index === categories.length - 1) return
    const category = categories[index]
    const nextCategory = categories[index + 1]

    setMovingId(category.id)
    try {
      await updateCategory(category.id, { sort_order: nextCategory.sort_order })
      await updateCategory(nextCategory.id, { sort_order: category.sort_order })
      router.refresh()
    } catch {
      toast.error('Error al reordenar')
    } finally {
      setMovingId(null)
    }
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {categories.map((category, index) => (
        <div
          key={category.id}
          className="flex items-center gap-3 p-4 bg-[var(--admin-border)] rounded-xl border border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40 transition-colors"
        >
          {/* Drag Handle / Reorder Buttons */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleMoveUp(index)}
              disabled={index === 0 || movingId === category.id}
              className="p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Mover arriba"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => handleMoveDown(index)}
              disabled={index === categories.length - 1 || movingId === category.id}
              className="p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Mover abajo"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Order Number */}
          <div className="w-8 h-8 rounded-lg bg-[var(--admin-border)] flex items-center justify-center text-sm font-medium text-[var(--admin-text-muted)]">
            {index + 1}
          </div>

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--admin-text)] truncate">
              {category.name}
            </h3>
            <p className="text-sm text-[var(--admin-text-muted)] truncate">
              /{category.slug}
            </p>
          </div>

          {/* Loading State */}
          {movingId === category.id && (
            <Loader2 className="h-4 w-4 text-[var(--admin-text-muted)] animate-spin" />
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(category)}
                    className="h-9 w-9 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(category)}
                    disabled={deletingId === category.id}
                    className="h-9 w-9 text-[var(--admin-text-muted)] hover:text-red-400 hover:bg-red-500/10"
                  >
                    {deletingId === category.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Eliminar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar categoría"
        description={`¿Estás seguro de eliminar la categoría "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  )
}
