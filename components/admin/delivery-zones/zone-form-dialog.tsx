'use client'

import { useState } from 'react'
import { MapPin, CircleDot, Hexagon, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createDeliveryZone, updateDeliveryZone } from '@/app/actions/delivery-zones'
import { toast } from 'sonner'
import type { DeliveryZone, DrawnZoneGeometry } from '@/lib/types/database'

interface ZoneFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zone: DeliveryZone | null
  drawnGeometry: DrawnZoneGeometry | null
  onZoneUpdated: (zone: DeliveryZone) => void
  onZoneCreated: (zone: DeliveryZone) => void
}

const PRESET_COLORS = [
  '#FF6B00', '#3B82F6', '#22C55E', '#EF4444',
  '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4',
]

interface ZoneFormContentProps {
  zone: DeliveryZone | null
  drawnGeometry: DrawnZoneGeometry | null
  onZoneUpdated: (zone: DeliveryZone) => void
  onZoneCreated: (zone: DeliveryZone) => void
  onClose: () => void
}

function formatRadius(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`
}

function ZoneFormContent({ zone, drawnGeometry, onZoneUpdated, onZoneCreated, onClose }: ZoneFormContentProps) {
  const [name, setName] = useState(zone?.name ?? '')
  const [shippingCost, setShippingCost] = useState(zone?.shipping_cost?.toString() ?? '')
  const [color, setColor] = useState(zone?.color ?? '#FF6B00')
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    zone?.free_shipping_threshold?.toString() ?? ''
  )
  const [isLoading, setIsLoading] = useState(false)

  const isEditing = !!zone?.id

  // Determine effective geometry: drawn takes precedence over saved zone geometry
  const effectiveGeometry: DrawnZoneGeometry | null = drawnGeometry ?? (
    zone?.zone_type === 'circle' && zone.center && zone.radius_meters
      ? { type: 'circle', center: zone.center, radius_meters: zone.radius_meters }
      : zone?.polygon
        ? { type: 'polygon', polygon: zone.polygon }
        : null
  )

  const hasGeometry = !!effectiveGeometry

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!effectiveGeometry) {
      toast.error('Dibuja el área de cobertura en el mapa primero')
      return
    }
    if (!name.trim()) { toast.error('El nombre es requerido'); return }

    const cost = parseInt(shippingCost, 10)
    if (isNaN(cost) || cost < 0) { toast.error('El costo de envío debe ser un número válido'); return }

    setIsLoading(true)

    if (isEditing && zone) {
      const updatePayload =
        effectiveGeometry.type === 'circle'
          ? {
              name: name.trim(),
              zone_type: 'circle' as const,
              polygon: null,
              center: effectiveGeometry.center,
              radius_meters: effectiveGeometry.radius_meters,
              shipping_cost: cost,
              color,
              free_shipping_threshold: freeShippingThreshold ? parseInt(freeShippingThreshold, 10) : null,
            }
          : {
              name: name.trim(),
              zone_type: 'polygon' as const,
              polygon: effectiveGeometry.polygon,
              center: null,
              radius_meters: null,
              shipping_cost: cost,
              color,
              free_shipping_threshold: freeShippingThreshold ? parseInt(freeShippingThreshold, 10) : null,
            }

      const result = await updateDeliveryZone(zone.id, updatePayload)
      setIsLoading(false)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Zona actualizada')
        onZoneUpdated({
          ...zone,
          ...updatePayload,
          updated_at: new Date().toISOString(),
        })
      }
    } else {
      const formData = new FormData()
      formData.set('name', name.trim())
      formData.set('shipping_cost', cost.toString())
      formData.set('color', color)
      if (freeShippingThreshold) formData.set('free_shipping_threshold', freeShippingThreshold)

      if (effectiveGeometry.type === 'circle') {
        formData.set('zone_type', 'circle')
        formData.set('center', JSON.stringify(effectiveGeometry.center))
        formData.set('radius_meters', effectiveGeometry.radius_meters.toString())
      } else {
        formData.set('zone_type', 'polygon')
        formData.set('polygon', JSON.stringify(effectiveGeometry.polygon))
      }

      const result = await createDeliveryZone(formData)
      setIsLoading(false)

      if (result.error) {
        toast.error(result.error)
      } else if (result.zone) {
        toast.success('Zona creada')
        onZoneCreated(result.zone)
        onClose()
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-4">
      {/* Geometry info */}
      {effectiveGeometry ? (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3 flex items-center gap-3">
          {effectiveGeometry.type === 'circle' ? (
            <>
              <div className="w-8 h-8 bg-[var(--admin-accent)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <CircleDot className="h-4 w-4 text-[var(--admin-accent-text)]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--admin-text-muted)]">Radio circular</p>
                <p className="text-sm font-semibold text-[var(--admin-text)]">
                  {formatRadius(effectiveGeometry.radius_meters)}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 bg-[var(--admin-accent)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Hexagon className="h-4 w-4 text-[var(--admin-accent-text)]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--admin-text-muted)]">Polígono personalizado</p>
                <p className="text-sm font-semibold text-[var(--admin-text)]">
                  {effectiveGeometry.polygon.coordinates[0].length - 1} vértices
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-sky-700/40 bg-sky-950/40 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
          <div>
            <p className="text-sm font-medium text-sky-300 mb-0.5">Área de cobertura requerida</p>
            <p className="text-xs text-sky-300/70">
              Dibuja un <strong>polígono</strong> o un <strong>círculo</strong> en el mapa para definir el área
            </p>
          </div>
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label className="text-[var(--admin-text-muted)] font-medium">Nombre de la zona</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la zona"
          maxLength={50}
          className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
        />
      </div>

      {/* Shipping cost */}
      <div className="space-y-2">
        <Label className="text-[var(--admin-text-muted)] font-medium">Costo de envío (ARS)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] font-semibold">$</span>
          <Input
            type="number"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            placeholder="Monto del envío"
            min={0}
            step={100}
            className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 pl-7 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
          />
        </div>
        <p className="text-xs text-[var(--admin-text-muted)] flex items-center gap-1">
          <span className="w-1 h-1 bg-[var(--admin-text-muted)] rounded-full" />
          Ingresa 0 para envío gratuito en esta zona
        </p>
      </div>

      {/* Free shipping threshold */}
      <div className="space-y-2">
        <Label className="text-[var(--admin-text-muted)] font-medium">Umbral de envío gratis (opcional)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] font-semibold">$</span>
          <Input
            type="number"
            value={freeShippingThreshold}
            onChange={(e) => setFreeShippingThreshold(e.target.value)}
            placeholder="Monto mínimo"
            min={0}
            step={1000}
            className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 pl-7 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
          />
        </div>
        <p className="text-xs text-[var(--admin-text-muted)] flex items-center gap-1">
          <span className="w-1 h-1 bg-[var(--admin-text-muted)] rounded-full" />
          Pedidos que superen este monto tendrán envío gratis
        </p>
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label className="text-[var(--admin-text-muted)] font-medium">Color de la zona</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((presetColor) => (
            <button
              key={presetColor}
              type="button"
              onClick={() => setColor(presetColor)}
              className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                color === presetColor
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-[var(--admin-border)] hover:border-[var(--admin-text-muted)]'
              }`}
              style={{
                backgroundColor: presetColor,
                boxShadow: color === presetColor ? `0 4px 12px ${presetColor}60` : 'none',
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-10 p-0 border-0 bg-transparent cursor-pointer rounded-lg"
          />
          <Input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#FF6B00"
            pattern="^#[0-9A-Fa-f]{6}$"
            className="flex-1 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] font-mono h-10 focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 h-10 border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-border)] hover:text-[var(--admin-text)] transition-all duration-200"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !hasGeometry}
          className="flex-1 h-10 bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Zona'}
        </Button>
      </div>
    </form>
  )
}

export function ZoneFormDialog({
  open,
  onOpenChange,
  zone,
  drawnGeometry,
  onZoneUpdated,
  onZoneCreated,
}: ZoneFormDialogProps) {
  const handleClose = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-[var(--admin-text)] text-xl">
            {zone?.id ? 'Editar Zona' : 'Nueva Zona de Envío'}
          </DialogTitle>
          <p className="text-[var(--admin-text-muted)] text-sm mt-1">
            {zone?.id
              ? 'Modifica los datos de la zona de envío'
              : 'Dibuja un polígono o círculo en el mapa, luego completá los datos'}
          </p>
        </DialogHeader>

        <ZoneFormContent
          key={zone?.id ?? 'new'}
          zone={zone}
          drawnGeometry={drawnGeometry}
          onZoneUpdated={onZoneUpdated}
          onZoneCreated={onZoneCreated}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  )
}
