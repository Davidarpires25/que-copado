'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCategory, updateCategory } from '@/app/actions/categories'
import { toast } from 'sonner'
import type { Category } from '@/lib/types/database'

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  onCategoryCreated: (category: Category) => void
  onCategoryUpdated: (category: Category) => void
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onCategoryCreated,
  onCategoryUpdated,
}: CategoryFormDialogProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)

  const isEditing = !!category
  const nameError = nameTouched && !name.trim() ? 'El nombre es requerido' : ''
  const canSubmit = !isLoading && !!name.trim()

  useEffect(() => {
    if (category) {
      setName(category.name)
      setSlug(category.slug)
    } else {
      setName('')
      setSlug('')
    }
    setNameTouched(false)
  }, [category, open])

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value)
    if (!isEditing) {
      const generatedSlug = value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      setSlug(generatedSlug)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameTouched(true)
    if (!name.trim()) return

    setIsLoading(true)

    try {
      if (isEditing && category) {
        const result = await updateCategory(category.id, {
          name: name.trim(),
          slug: slug.trim(),
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Categoría actualizada')
        onCategoryUpdated({
          ...category,
          name: name.trim(),
          slug: slug.trim(),
        })
      } else {
        const formData = new FormData()
        formData.append('name', name.trim())

        const result = await createCategory(formData)

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Categoría creada')
        if (result.category) {
          onCategoryCreated(result.category as Category)
        }
      }
    } catch {
      toast.error('Ocurrió un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[var(--admin-text)]">
            {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
          <p className="text-[var(--admin-text-muted)] text-xs mt-0.5">
            {isEditing ? 'Modifica los datos de la categoría' : 'Agrega una nueva categoría al catálogo'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Nombre <span className="text-red-300 ml-0.5">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="Nombre de la categoría"
              className={`bg-[var(--admin-bg)] border h-10 text-sm placeholder:text-[var(--admin-text-muted)] transition-all ${
                nameError
                  ? 'border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-[var(--admin-text)]'
                  : 'border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20'
              }`}
              maxLength={100}
            />
            {nameError && (
              <p className="text-xs text-red-300 flex items-center gap-1">
                {nameError}
              </p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="slug" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Slug (URL)
            </Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => isEditing && setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              placeholder="Se genera automaticamente"
              readOnly={!isEditing}
              className={`bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            <p className="text-xs text-[var(--admin-text-muted)]">
              {isEditing ? 'Solo letras, números y guiones.' : 'Se genera automaticamente a partir del nombre.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 text-sm border-[#3a4150] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={`flex-1 h-10 text-sm font-semibold transition-all duration-200 ${
                !canSubmit
                  ? 'bg-[var(--admin-text-placeholder)] text-[var(--admin-text-faint)] cursor-not-allowed shadow-none'
                  : 'bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black shadow-lg shadow-[var(--admin-accent)]/20'
              }`}
              disabled={!canSubmit}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Categoría'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
