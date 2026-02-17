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
      <DialogContent className="bg-[#12151a] border-[#2a2f3a] text-[#f0f2f5] sm:max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#f0f2f5]">
            {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
          <p className="text-[#8b9ab0] text-xs mt-0.5">
            {isEditing ? 'Modifica los datos de la categoría' : 'Agrega una nueva categoría al catálogo'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[#8b9ab0] text-xs font-semibold uppercase tracking-wide">
              Nombre
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Nombre de la categoría"
              className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-10 text-sm placeholder:text-[#6b7a8d] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
              required
              maxLength={100}
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="slug" className="text-[#8b9ab0] text-xs font-semibold uppercase tracking-wide">
              Slug (URL)
            </Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              placeholder="url-amigable"
              className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-10 text-sm placeholder:text-[#6b7a8d] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
              required
            />
            <p className="text-xs text-[#8b9ab0]">
              Se usa para filtrar productos. Solo letras, números y guiones.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 text-sm border-[#3a4150] text-[#8b9ab0] hover:text-[#f0f2f5] hover:bg-[#252a35]"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={`flex-1 h-10 text-sm font-semibold transition-all duration-200 ${
                isLoading || !name.trim()
                  ? 'bg-[#3a3f4a] text-[#6b7a8d] cursor-not-allowed shadow-none'
                  : 'bg-[#FEC501] hover:bg-[#E5B001] text-black shadow-lg shadow-[#FEC501]/20'
              }`}
              disabled={isLoading || !name.trim()}
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
