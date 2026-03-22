'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertTriangle, Info, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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

interface IngredientFormPageProps {
  mode: 'create' | 'edit'
  ingredient?: IngredientWithCategory
  categories: IngredientCategory[]
}

const UNITS = Object.entries(INGREDIENT_UNIT_LABELS) as [IngredientUnit, string][]
const NO_CATEGORY_VALUE = '__none__'

export function IngredientFormPage({ mode, ingredient, categories }: IngredientFormPageProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isEditing = mode === 'edit'

  const [name, setName] = useState(ingredient?.name ?? '')
  const [unit, setUnit] = useState<IngredientUnit>((ingredient?.unit as IngredientUnit) ?? 'unidad')
  const [costPerUnit, setCostPerUnit] = useState(ingredient?.cost_per_unit?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(ingredient?.category_id ?? '')
  const [wastePercentage, setWastePercentage] = useState(ingredient?.waste_percentage?.toString() ?? '0')
  const [isActive, setIsActive] = useState(ingredient?.is_active ?? true)

  const [nameTouched, setNameTouched] = useState(false)
  const [costTouched, setCostTouched] = useState(false)

  const nameError = nameTouched && !name.trim() ? 'El nombre es requerido' : ''
  const costValue = parseFloat(costPerUnit)
  const costError = costTouched
    ? !costPerUnit
      ? 'El costo es requerido'
      : isNaN(costValue) || costValue < 0
        ? 'El costo debe ser un número mayor o igual a 0'
        : ''
    : ''

  const canSubmit = !isPending && !!name.trim() && !!costPerUnit && !isNaN(parseFloat(costPerUnit)) && parseFloat(costPerUnit) >= 0

  const handleSubmit = () => {
    setNameTouched(true)
    setCostTouched(true)
    if (!canSubmit) return

    startTransition(async () => {
      const cost = parseFloat(costPerUnit)
      const resolvedCategoryId = categoryId && categoryId !== NO_CATEGORY_VALUE ? categoryId : null

      if (isEditing && ingredient) {
        const result = await updateIngredient(ingredient.id, {
          name: name.trim(),
          unit,
          cost_per_unit: cost,
          category_id: resolvedCategoryId,
          waste_percentage: parseFloat(wastePercentage) || 0,
          is_active: isActive,
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('Ingrediente actualizado')
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
      }

      router.push('/admin/ingredients')
      router.refresh()
    })
  }

  const inputBase = 'bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all'
  const inputError = 'bg-[var(--admin-bg)] border-red-500/60 text-[var(--admin-text)] h-10 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20'

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--admin-text-muted)] mb-6">
        <button
          onClick={() => router.push('/admin/ingredients')}
          className="hover:text-[var(--admin-text)] transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Ingredientes
        </button>
        <span>/</span>
        <span className="text-[var(--admin-text)]">{isEditing ? 'Editar' : 'Nuevo'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">
            {isEditing ? `Editar: ${ingredient?.name}` : 'Nuevo Ingrediente'}
          </h1>
          <p className="text-[var(--admin-text-muted)] text-sm mt-1">
            {isEditing ? 'Modifica los datos del ingrediente' : 'Agrega un nuevo ingrediente para tus recetas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/ingredients')}
            disabled={isPending}
            className="border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 gap-2"
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
            ) : (
              <><Save className="h-4 w-4" />{isEditing ? 'Guardar Cambios' : 'Crear Ingrediente'}</>
            )}
          </Button>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl shadow-[var(--shadow-card)] p-6 space-y-5">

        {/* Nombre */}
        <div className="space-y-1.5">
          <Label htmlFor="ing-name" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
            Nombre <span className="text-red-400 ml-0.5">*</span>
          </Label>
          <Input
            id="ing-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            placeholder="Ej: Carne picada"
            disabled={isPending}
            className={nameError ? inputError : inputBase}
          />
          {nameError && <p className="text-xs text-red-400">{nameError}</p>}
        </div>

        {/* Unidad + Costo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Unidad
            </Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as IngredientUnit)} disabled={isPending}>
              <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                {UNITS.map(([value, label]) => (
                  <SelectItem
                    key={value}
                    value={value}
                    className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] cursor-pointer"
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ing-cost" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Costo / Unidad <span className="text-red-400 ml-0.5">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] text-sm font-semibold pointer-events-none">$</span>
              <Input
                id="ing-cost"
                type="number"
                step="0.01"
                min="0"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                onBlur={() => setCostTouched(true)}
                placeholder="0"
                disabled={isPending}
                className={`pl-7 ${costError ? inputError : inputBase}`}
              />
            </div>
            {costError && <p className="text-xs text-red-400">{costError}</p>}
          </div>
        </div>

        {/* Merma + Categoría */}
        <div className="grid grid-cols-2 gap-4">
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
                disabled={isPending}
                className={`pr-9 ${inputBase}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] text-sm font-semibold pointer-events-none">%</span>
            </div>
            <p className="text-xs text-[var(--admin-text-muted)]">0 = sin merma</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Categoría <span className="text-[var(--admin-text-faint)] font-normal normal-case">(opcional)</span>
            </Label>
            <Select
              value={categoryId || NO_CATEGORY_VALUE}
              onValueChange={(v) => setCategoryId(v === NO_CATEGORY_VALUE ? '' : v)}
              disabled={isPending}
            >
              <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-10 focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50 [&_svg]:text-[var(--admin-text-muted)] [&_svg]:opacity-100 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)]">
                <SelectItem
                  value={NO_CATEGORY_VALUE}
                  className="text-[var(--admin-text-muted)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] cursor-pointer"
                >
                  Sin categoría
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)] cursor-pointer"
                  >
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Activo toggle */}
        <div className="flex items-center justify-between py-3 border-t border-[var(--admin-border)]">
          <div>
            <p className="text-sm font-medium text-[var(--admin-text)]">Ingrediente activo</p>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
              Los ingredientes inactivos no aparecen al armar recetas
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={isPending}
            className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[var(--admin-border)]"
            aria-label="Ingrediente activo"
          />
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--admin-surface-2)] border border-[var(--admin-border)]">
          <Info className="h-4 w-4 text-[var(--admin-text-muted)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--admin-text-muted)]">
            El costo por unidad se usa para calcular automáticamente el costo de las recetas que incluyan este ingrediente.
          </p>
        </div>

        {/* Edit warning */}
        {isEditing && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Al cambiar el costo se recalcularán automáticamente los productos que usen este ingrediente.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
