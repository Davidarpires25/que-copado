'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, ChevronRight, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createCategory, updateCategory } from '@/app/actions/categories'
import type { Category } from '@/lib/types/database'

const CATEGORY_COLORS = [
  '#FEC501', '#F97316', '#EF4444', '#F43F5E',
  '#EC4899', '#A855F7', '#6366F1', '#3B82F6',
  '#06B6D4', '#14B8A6', '#22C55E', '#84CC16',
]

interface CategoryFormPageProps {
  mode: 'create' | 'edit'
  category?: Category
}

export function CategoryFormPage({ mode, category }: CategoryFormPageProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(category?.name ?? '')
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [sortOrder, setSortOrder] = useState(category?.sort_order?.toString() ?? '')
  const [color, setColor] = useState(category?.color ?? '#FEC501')

  const handleNameChange = (value: string) => {
    setName(value)
    if (mode === 'create') {
      const generated = value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      setSlug(generated)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    startTransition(async () => {
      try {
        if (mode === 'edit' && category) {
          const result = await updateCategory(category.id, {
            name: name.trim(),
            slug: slug.trim(),
            sort_order: sortOrder ? parseInt(sortOrder) : undefined,
            color,
          })
          if (result.error) { toast.error(result.error); return }
          toast.success('Categoría actualizada')
        } else {
          const formData = new FormData()
          formData.append('name', name.trim())
          formData.append('color', color)
          const result = await createCategory(formData)
          if (result.error) { toast.error(result.error); return }
          toast.success('Categoría creada')
        }
        router.push('/admin/categories')
        router.refresh()
      } catch {
        toast.error('Ocurrió un error inesperado')
      }
    })
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <form onSubmit={handleSubmit} className="px-8 xl:px-10 py-8 max-w-[800px] mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/admin/categories"
            className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors"
          >
            Categorías
          </Link>
          <ChevronRight className="h-4 w-4 text-[var(--admin-text-muted)]/50" />
          <span className="text-[var(--admin-text)] font-medium">
            {mode === 'edit' && category ? category.name : 'Nueva Categoría'}
          </span>
        </nav>

        {/* Header row */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">
            {mode === 'edit' ? 'Editar Categoría' : 'Nueva Categoría'}
          </h1>
          <div className="flex items-center gap-3">
            <Link href="/admin/categories">
              <Button
                type="button"
                variant="outline"
                className="border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] bg-transparent hover:bg-[var(--admin-surface)]"
              >
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </span>
              ) : mode === 'edit' ? 'Guardar Cambios' : 'Guardar'}
            </Button>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-5">

          {/* Section header */}
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Información</h2>
            <p className="text-xs text-[var(--admin-text-muted)]">Datos de la categoría</p>
          </div>
          <div className="h-px bg-[var(--admin-border)]" />

          {/* Nombre */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
              Nombre <span className="text-red-400">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej: Burgers"
              required
              className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--admin-text-muted)] flex items-center gap-2">
              Slug (URL)
              {mode === 'create' && (
                <span className="text-xs bg-[var(--admin-accent)]/15 text-[var(--admin-accent-text)] px-1.5 py-0.5 rounded font-semibold">
                  Auto
                </span>
              )}
            </Label>
            <Input
              value={slug}
              onChange={(e) =>
                mode === 'edit' &&
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
              }
              readOnly={mode === 'create'}
              placeholder="se-genera-automaticamente"
              className={`bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 ${mode === 'create' ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            <div className="flex items-start gap-2 rounded-lg bg-[var(--admin-surface-2)] border border-[var(--admin-border)] px-3 py-2">
              <Info className="h-3.5 w-3.5 text-[var(--admin-text-muted)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--admin-text-muted)]">
                {mode === 'create'
                  ? 'El slug se genera automáticamente desde el nombre.'
                  : 'Solo letras, números y guiones. Se usa en las URLs.'}
              </p>
            </div>
          </div>

          {/* Orden (edit only) */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
                Orden
              </Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                min="0"
                className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 max-w-[120px]"
              />
            </div>
          )}

          <div className="h-px bg-[var(--admin-border)]" />

          {/* Color POS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-[var(--admin-text-muted)]">
                Color en el POS
              </Label>
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-mono text-[var(--admin-text-muted)]">{color}</span>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="relative w-9 h-9 rounded-lg transition-transform hover:scale-110 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--admin-surface)] focus:ring-white/30"
                  style={{ backgroundColor: c }}
                  aria-label={c}
                >
                  {color === c && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-black/70 drop-shadow" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Se usa como indicador de color en los chips del POS y en los productos de esa categoría.
            </p>
          </div>
        </div>

      </form>
    </div>
  )
}
