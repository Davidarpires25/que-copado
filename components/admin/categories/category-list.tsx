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
  productCountMap?: Record<string, number>
}

export function CategoryList({ categories, onEdit, onDeleted, productCountMap = {} }: CategoryListProps) {
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
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--admin-border)]">
            <th className="text-left text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider px-4 py-3 w-24">Orden</th>
            <th className="text-left text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider px-4 py-3">Nombre</th>
            <th className="text-left text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider px-4 py-3 hidden md:table-cell">Slug</th>
            <th className="text-left text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Productos</th>
            <th className="text-right text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category, index) => {
            const count = productCountMap[category.id] ?? 0
            return (
              <tr
                key={category.id}
                className="border-t border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors group"
              >
                {/* Orden */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || movingId === category.id}
                        className="p-0.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === categories.length - 1 || movingId === category.id}
                        className="p-0.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <span className="text-sm font-medium text-[var(--admin-text-muted)]">{index + 1}</span>
                    {movingId === category.id && (
                      <Loader2 className="h-3.5 w-3.5 text-[var(--admin-text-muted)] animate-spin" />
                    )}
                  </div>
                </td>

                {/* Nombre */}
                <td className="px-4 py-3">
                  <span className="font-semibold text-sm text-[var(--admin-text)]">{category.name}</span>
                </td>

                {/* Slug */}
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-[var(--admin-text-muted)] font-mono">/{category.slug}</span>
                </td>

                {/* Productos count */}
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)]">
                    {count} {count === 1 ? 'producto' : 'productos'}
                  </span>
                </td>

                {/* Acciones */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(category)}
                            className="h-8 w-8 text-[var(--admin-text-muted)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10"
                          >
                            <Pencil className="h-3.5 w-3.5" />
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
                            className="h-8 w-8 text-[var(--admin-text-muted)] hover:text-red-400 hover:bg-red-500/10"
                          >
                            {deletingId === category.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

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
