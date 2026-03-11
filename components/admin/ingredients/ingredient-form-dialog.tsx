'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createIngredient, updateIngredient } from '@/app/actions/ingredients'
import { toast } from 'sonner'
import type { IngredientWithCategory, IngredientUnit, IngredientCategory } from '@/lib/types/database'
import { INGREDIENT_UNIT_LABELS } from '@/lib/types/database'

interface IngredientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient: IngredientWithCategory | null
  onCreated: (ingredient: IngredientWithCategory) => void
  onUpdated: (ingredient: IngredientWithCategory) => void
  categories: IngredientCategory[]
}

const UNITS = Object.entries(INGREDIENT_UNIT_LABELS) as [IngredientUnit, string][]
const NO_CATEGORY_VALUE = '__none__'

export function IngredientFormDialog({
  open,
  onOpenChange,
  ingredient,
  onCreated,
  onUpdated,
  categories,
}: IngredientFormDialogProps) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<IngredientUnit>('unidad')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [wastePercentage, setWastePercentage] = useState('0')
  const [isLoading, setIsLoading] = useState(false)

  // Touched state for inline validation
  const [nameTouched, setNameTouched] = useState(false)
  const [costTouched, setCostTouched] = useState(false)

  const isEditing = !!ingredient

  // Inline validation
  const nameError = nameTouched && !name.trim() ? 'El nombre es requerido' : ''
  const costValue = parseFloat(costPerUnit)
  const costError = costTouched
    ? !costPerUnit
      ? 'El costo es requerido'
      : isNaN(costValue) || costValue < 0
        ? 'El costo debe ser un número mayor o igual a 0'
        : ''
    : ''

  const canSubmit = !isLoading && !!name.trim() && !!costPerUnit && !isNaN(parseFloat(costPerUnit)) && parseFloat(costPerUnit) >= 0

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name)
      setUnit(ingredient.unit as IngredientUnit)
      setCostPerUnit(ingredient.cost_per_unit.toString())
      setCategoryId(ingredient.category_id ?? '')
      setWastePercentage(ingredient.waste_percentage?.toString() ?? '0')
    } else {
      setName('')
      setUnit('unidad')
      setCostPerUnit('')
      setCategoryId('')
      setWastePercentage('0')
    }
    setNameTouched(false)
    setCostTouched(false)
  }, [ingredient, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameTouched(true)
    setCostTouched(true)
    if (!canSubmit) return

    setIsLoading(true)

    try {
      const cost = parseFloat(costPerUnit)
      const resolvedCategoryId = categoryId && categoryId !== NO_CATEGORY_VALUE ? categoryId : null
      const selectedCategory = resolvedCategoryId
        ? (categories.find((c) => c.id === resolvedCategoryId) ?? null)
        : null

      if (isEditing && ingredient) {
        const result = await updateIngredient(ingredient.id, {
          name: name.trim(),
          unit,
          cost_per_unit: cost,
          category_id: resolvedCategoryId,
          waste_percentage: parseFloat(wastePercentage) || 0,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Ingrediente actualizado')
        if (result.data) {
          onUpdated({
            ...result.data,
            ingredient_categories: selectedCategory,
          } as IngredientWithCategory)
        }
      } else {
        const result = await createIngredient({
          name: name.trim(),
          unit,
          cost_per_unit: cost,
          category_id: resolvedCategoryId,
          waste_percentage: parseFloat(wastePercentage) || 0,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Ingrediente creado')
        if (result.data) {
          onCreated({
            ...result.data,
            ingredient_categories: selectedCategory,
          } as IngredientWithCategory)
        }
      }
    } catch {
      toast.error('Ocurrio un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text)] sm:max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[var(--admin-text)]">
            {isEditing ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
          </DialogTitle>
          <p className="text-[var(--admin-text-muted)] text-xs mt-0.5">
            {isEditing ? 'Modifica los datos del ingrediente' : 'Agrega un nuevo ingrediente'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="ing-name" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Nombre <span className="text-red-300 ml-0.5">*</span>
            </Label>
            <Input
              id="ing-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="Ej: Carne picada"
              disabled={isLoading}
              className={`border h-10 text-sm placeholder:text-[var(--admin-text-muted)] transition-all ${
                nameError
                  ? 'bg-[var(--admin-bg)] border-red-500/60 text-[var(--admin-text)] focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20'
              }`}
            />
            {nameError && <p className="text-xs text-red-300">{nameError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Unidad */}
            <div className="space-y-1.5">
              <Label htmlFor="ing-unit" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
                Unidad
              </Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as IngredientUnit)}>
                <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 data-[placeholder]:text-[var(--admin-text-muted)] [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                  {UNITS.map(([value, label]) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Costo */}
            <div className="space-y-1.5">
              <Label htmlFor="ing-cost" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
                Costo / Unidad <span className="text-red-300 ml-0.5">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] text-sm font-semibold">$</span>
                <Input
                  id="ing-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  onBlur={() => setCostTouched(true)}
                  placeholder="0"
                  disabled={isLoading}
                  className={`border h-10 text-sm pl-7 placeholder:text-[var(--admin-text-muted)] transition-all ${
                    costError
                      ? 'bg-[var(--admin-bg)] border-red-500/60 text-[var(--admin-text)] focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20'
                  }`}
                />
              </div>
              {costError && <p className="text-xs text-red-300">{costError}</p>}
            </div>
          </div>

          {/* Categoria */}
          {categories.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="ing-category" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
                Categoria <span className="text-[var(--admin-text-faint)] font-normal normal-case">(opcional)</span>
              </Label>
              <Select
                value={categoryId || NO_CATEGORY_VALUE}
                onValueChange={(v) => setCategoryId(v === NO_CATEGORY_VALUE ? '' : v)}
                disabled={isLoading}
              >
                <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 data-[placeholder]:text-[var(--admin-text-muted)] [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                  <SelectItem
                    value={NO_CATEGORY_VALUE}
                    className="text-[var(--admin-text-muted)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer"
                  >
                    Sin categoria
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat.id}
                      value={cat.id}
                      className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] hover:bg-[var(--admin-border)] cursor-pointer"
                    >
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Merma */}
          <div className="space-y-1.5">
            <Label htmlFor="ing-waste" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Merma / Desperdicio
            </Label>
            <div className="relative">
              <Input
                id="ing-waste"
                type="number"
                min="0"
                max="99"
                step="0.1"
                value={wastePercentage}
                onChange={(e) => setWastePercentage(e.target.value)}
                placeholder="0"
                disabled={isLoading}
                className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-sm pr-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] text-sm font-semibold pointer-events-none">
                %
              </span>
            </div>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Porcentaje que se descarta al preparar (0 = sin merma)
            </p>
          </div>

          {isEditing && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/30 border border-amber-500/50">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-200">
                Al cambiar el costo se recalcularan automaticamente los productos que usen este ingrediente.
              </p>
            </div>
          )}

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
                'Crear Ingrediente'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
