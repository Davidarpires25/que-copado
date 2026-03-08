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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTable, updateTable } from '@/app/actions/tables'
import { toast } from 'sonner'
import type { RestaurantTable } from '@/lib/types/tables'
import { TABLE_SECTION_LABELS } from '@/lib/types/tables'

interface TableFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: RestaurantTable | null
  onTableSaved: (table: RestaurantTable) => void
}

export function TableFormDialog({
  open,
  onOpenChange,
  table,
  onTableSaved,
}: TableFormDialogProps) {
  const [number, setNumber] = useState('')
  const [label, setLabel] = useState('')
  const [section, setSection] = useState('salon')
  const [capacity, setCapacity] = useState('4')
  const [isLoading, setIsLoading] = useState(false)

  const isEditing = !!table

  useEffect(() => {
    if (table) {
      setNumber(String(table.number))
      setLabel(table.label || '')
      setSection(table.section)
      setCapacity(String(table.capacity))
    } else {
      setNumber('')
      setLabel('')
      setSection('salon')
      setCapacity('4')
    }
  }, [table, open])

  const isValid =
    number.trim() !== '' &&
    parseInt(number) > 0 &&
    section.trim() !== '' &&
    capacity.trim() !== '' &&
    parseInt(capacity) >= 1 &&
    parseInt(capacity) <= 50

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsLoading(true)
    try {
      if (isEditing && table) {
        const result = await updateTable(table.id, {
          number: parseInt(number),
          label: label.trim() || null,
          section,
          capacity: parseInt(capacity),
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Mesa actualizada')
        onTableSaved(result.data!)
      } else {
        const result = await createTable({
          number: parseInt(number),
          label: label.trim() || undefined,
          section,
          capacity: parseInt(capacity),
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Mesa creada')
        onTableSaved(result.data!)
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
            {isEditing ? 'Editar Mesa' : 'Nueva Mesa'}
          </DialogTitle>
          <p className="text-[var(--admin-text-muted)] text-xs mt-0.5">
            {isEditing ? 'Modifica los datos de la mesa' : 'Agrega una nueva mesa al restaurante'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          {/* Number + Capacity row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="number" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
                Número
              </Label>
              <Input
                id="number"
                type="number"
                min="1"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="1"
                className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capacity" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
                Capacidad
              </Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="50"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="4"
                className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
                required
              />
            </div>
          </div>

          {/* Section */}
          <div className="space-y-1.5">
            <Label htmlFor="section" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Sección
            </Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-sm focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20">
                <SelectValue placeholder="Seleccionar sección" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--admin-bg)] border-[var(--admin-border)]">
                {Object.entries(TABLE_SECTION_LABELS).map(([value, label]) => (
                  <SelectItem
                    key={value}
                    value={value}
                    className="text-[var(--admin-text)] focus:bg-[var(--admin-border)] focus:text-[var(--admin-text)]"
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="label" className="text-[var(--admin-text-muted)] text-xs font-semibold uppercase tracking-wide">
              Etiqueta <span className="font-normal normal-case">(opcional)</span>
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Ventana, VIP, Esquina"
              className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
              maxLength={50}
            />
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
                isLoading || !isValid
                  ? 'bg-[var(--admin-text-placeholder)] text-[var(--admin-text-faint)] cursor-not-allowed shadow-none'
                  : 'bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black shadow-lg shadow-[var(--admin-accent)]/20'
              }`}
              disabled={isLoading || !isValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Mesa'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
