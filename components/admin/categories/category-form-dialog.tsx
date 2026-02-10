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

  const isEditing = !!category

  useEffect(() => {
    if (category) {
      setName(category.name)
      setSlug(category.slug)
    } else {
      setName('')
      setSlug('')
    }
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
        // Reload to get the new category with its ID
        window.location.reload()
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-300">
              Nombre
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej: Hamburguesas"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              required
              maxLength={100}
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-slate-300">
              Slug (URL)
            </Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              placeholder="hamburguesas"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              required
            />
            <p className="text-xs text-slate-500">
              Se usa para filtrar productos. Solo letras, números y guiones.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
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
