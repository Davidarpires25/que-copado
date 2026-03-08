'use client'

import { useState } from 'react'
import { Loader2, Pencil, Trash2, Check, X, Plus, Tag } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  createIngredientCategory,
  updateIngredientCategory,
  deleteIngredientCategory,
} from '@/app/actions/ingredient-categories'
import { toast } from 'sonner'
import type { IngredientCategory } from '@/lib/types/database'

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: IngredientCategory[]
  onCategoriesChange: (categories: IngredientCategory[]) => void
}

export function CategoryManagerDialog({
  open,
  onOpenChange,
  categories,
  onCategoriesChange,
}: CategoryManagerDialogProps) {
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [loadingDelete, setLoadingDelete] = useState(false)

  const handleCreate = async () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return

    setLoadingCreate(true)
    try {
      const result = await createIngredientCategory(trimmed)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.data) {
        onCategoriesChange([...categories, result.data].sort((a, b) => a.name.localeCompare(b.name)))
        setNewCategoryName('')
        toast.success('Categoria creada')
      }
    } catch {
      toast.error('Ocurrio un error inesperado')
    } finally {
      setLoadingCreate(false)
    }
  }

  const handleStartEdit = (category: IngredientCategory) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = async () => {
    const trimmed = editingName.trim()
    if (!trimmed || !editingId) return

    setLoadingEdit(true)
    try {
      const result = await updateIngredientCategory(editingId, trimmed)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.data) {
        onCategoriesChange(
          categories
            .map((c) => (c.id === editingId ? result.data! : c))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
        setEditingId(null)
        setEditingName('')
        toast.success('Categoria actualizada')
      }
    } catch {
      toast.error('Ocurrio un error inesperado')
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setLoadingDelete(true)
    try {
      const result = await deleteIngredientCategory(deleteTarget)
      if (result.error) {
        toast.error(result.error)
        return
      }
      onCategoriesChange(categories.filter((c) => c.id !== deleteTarget))
      setDeleteTarget(null)
      toast.success('Categoria eliminada')
    } catch {
      toast.error('Ocurrio un error inesperado')
    } finally {
      setLoadingDelete(false)
    }
  }

  const deleteTargetName = categories.find((c) => c.id === deleteTarget)?.name ?? ''

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[var(--admin-text)] flex items-center gap-2">
              <Tag className="h-5 w-5 text-[var(--admin-accent-text)]" />
              Categorias de Ingredientes
            </DialogTitle>
            <p className="text-[var(--admin-text-muted)] text-xs mt-0.5">
              Organiza tus ingredientes por categorias para una gestion mas facil.
            </p>
          </DialogHeader>

          <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
            {categories.length === 0 ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 bg-[var(--admin-surface-2)] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Tag className="h-6 w-6 text-slate-600" />
                </div>
                <p className="text-[var(--admin-text-muted)] text-sm">No hay categorias todavia</p>
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] group"
                >
                  {editingId === category.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit()
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        className="flex-1 bg-[var(--admin-surface-2)] border-[#3a4150] text-[var(--admin-text)] h-8 text-sm focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                        autoFocus
                        disabled={loadingEdit}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-950/30 shrink-0"
                        onClick={handleSaveEdit}
                        disabled={loadingEdit || !editingName.trim()}
                        aria-label="Guardar nombre"
                      >
                        {loadingEdit ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] shrink-0"
                        onClick={handleCancelEdit}
                        disabled={loadingEdit}
                        aria-label="Cancelar edicion"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-[var(--admin-accent)]/60 shrink-0" />
                      <span className="flex-1 text-sm text-[var(--admin-text)] truncate">{category.name}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]"
                          onClick={() => handleStartEdit(category)}
                          aria-label={`Editar ${category.name}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-950/30"
                          onClick={() => setDeleteTarget(category.id)}
                          aria-label={`Eliminar ${category.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* New category input */}
          <div className="pt-3 border-t border-[var(--admin-border)]">
            <p className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide mb-2">
              Nueva Categoria
            </p>
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
                placeholder="Ej: Carnes, Lacteos, Verduras..."
                className="flex-1 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                disabled={loadingCreate}
              />
              <Button
                onClick={handleCreate}
                disabled={loadingCreate || !newCategoryName.trim()}
                className="h-9 px-3 bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold text-sm disabled:bg-[var(--admin-text-placeholder)] disabled:text-[var(--admin-text-faint)] shrink-0"
              >
                {loadingCreate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-sm border-[#3a4150] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar categoria"
        description={`Vas a eliminar la categoria "${deleteTargetName}". Los ingredientes asociados quedaran sin categoria. Esta accion no se puede deshacer.`}
        confirmLabel={loadingDelete ? 'Eliminando...' : 'Eliminar'}
        onConfirm={handleDelete}
      />
    </>
  )
}
