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
import type { Ingredient, IngredientUnit } from '@/lib/types/database'
import { INGREDIENT_UNIT_LABELS } from '@/lib/types/database'

interface IngredientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient: Ingredient | null
  onCreated: (ingredient: Ingredient) => void
  onUpdated: (ingredient: Ingredient) => void
}

const UNITS = Object.entries(INGREDIENT_UNIT_LABELS) as [IngredientUnit, string][]

export function IngredientFormDialog({
  open,
  onOpenChange,
  ingredient,
  onCreated,
  onUpdated,
}: IngredientFormDialogProps) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<IngredientUnit>('unidad')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isEditing = !!ingredient

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name)
      setUnit(ingredient.unit as IngredientUnit)
      setCostPerUnit(ingredient.cost_per_unit.toString())
    } else {
      setName('')
      setUnit('unidad')
      setCostPerUnit('')
    }
  }, [ingredient, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const cost = parseFloat(costPerUnit)
      if (isNaN(cost) || cost < 0) {
        toast.error('El costo debe ser un numero valido >= 0')
        return
      }

      if (isEditing && ingredient) {
        const result = await updateIngredient(ingredient.id, {
          name: name.trim(),
          unit,
          cost_per_unit: cost,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Ingrediente actualizado')
        if (result.data) onUpdated(result.data as Ingredient)
      } else {
        const result = await createIngredient({
          name: name.trim(),
          unit,
          cost_per_unit: cost,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Ingrediente creado')
        if (result.data) onCreated(result.data as Ingredient)
      }
    } catch {
      toast.error('Ocurrio un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12151a] border-[#2a2f3a] text-[#f0f2f5] sm:max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#f0f2f5]">
            {isEditing ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
          </DialogTitle>
          <p className="text-[#a8b5c9] text-xs mt-0.5">
            {isEditing ? 'Modifica los datos del ingrediente' : 'Agrega un nuevo ingrediente'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="ing-name" className="text-[#a8b5c9] text-xs font-semibold uppercase tracking-wide">
              Nombre
            </Label>
            <Input
              id="ing-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Carne picada"
              className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-10 text-sm placeholder:text-[#a8b5c9] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ing-unit" className="text-[#a8b5c9] text-xs font-semibold uppercase tracking-wide">
                Unidad
              </Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as IngredientUnit)}>
                <SelectTrigger className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm h-10 focus:ring-2 focus:ring-[#FEC501]/20 focus:border-[#FEC501]/50 data-[placeholder]:text-[#a8b5c9] [&_svg]:text-[#a8b5c9] [&_svg]:opacity-100 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5]">
                  {UNITS.map(([value, label]) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className="text-[#f0f2f5] focus:bg-[#2a2f3a] focus:text-[#f0f2f5] hover:bg-[#2a2f3a] cursor-pointer"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ing-cost" className="text-[#a8b5c9] text-xs font-semibold uppercase tracking-wide">
                Costo / Unidad
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8b5c9] text-sm font-semibold">$</span>
                <Input
                  id="ing-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  placeholder="0"
                  className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] h-10 text-sm pl-7 placeholder:text-[#a8b5c9] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/20 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-400/80">
                Al cambiar el costo se recalcularan automaticamente los productos que usen este ingrediente.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 text-sm border-[#3a4150] text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#252a35]"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={`flex-1 h-10 text-sm font-semibold transition-all duration-200 ${
                isLoading || !name.trim() || !costPerUnit
                  ? 'bg-[#3a3f4a] text-[#6b7a8d] cursor-not-allowed shadow-none'
                  : 'bg-[#FEC501] hover:bg-[#E5B001] text-black shadow-lg shadow-[#FEC501]/20'
              }`}
              disabled={isLoading || !name.trim() || !costPerUnit}
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
