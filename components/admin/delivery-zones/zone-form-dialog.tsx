'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
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
import type { DeliveryZone, GeoJSONPolygon } from '@/lib/types/database'

interface ZoneFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zone: DeliveryZone | null
  polygon: GeoJSONPolygon | null
  onZoneUpdated: (zone: DeliveryZone) => void
  onZoneCreated: (zone: DeliveryZone) => void
}

const PRESET_COLORS = [
  '#FF6B00', // Orange
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
]

interface ZoneFormContentProps {
  zone: DeliveryZone | null
  polygon: GeoJSONPolygon | null
  onZoneUpdated: (zone: DeliveryZone) => void
  onZoneCreated: (zone: DeliveryZone) => void
  onClose: () => void
}

function ZoneFormContent({ zone, polygon, onZoneUpdated, onZoneCreated, onClose }: ZoneFormContentProps) {
  // Initialize with zone values if editing
  const [name, setName] = useState(zone?.name ?? '')
  const [shippingCost, setShippingCost] = useState(zone?.shipping_cost?.toString() ?? '')
  const [color, setColor] = useState(zone?.color ?? '#FF6B00')
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    zone?.free_shipping_threshold?.toString() ?? ''
  )
  const [isLoading, setIsLoading] = useState(false)

  const isEditing = !!zone?.id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const polygonToUse = polygon || zone?.polygon
    if (!polygonToUse) {
      toast.error('Dibuja un polígono en el mapa primero')
      return
    }

    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    const cost = parseInt(shippingCost, 10)
    if (isNaN(cost) || cost < 0) {
      toast.error('El costo de envío debe ser un número válido')
      return
    }

    setIsLoading(true)

    if (isEditing && zone) {
      const result = await updateDeliveryZone(zone.id, {
        name: name.trim(),
        polygon: polygonToUse,
        shipping_cost: cost,
        color,
        free_shipping_threshold: freeShippingThreshold
          ? parseInt(freeShippingThreshold, 10)
          : null,
      })

      setIsLoading(false)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Zona actualizada')
        onZoneUpdated({
          ...zone,
          name: name.trim(),
          polygon: polygonToUse,
          shipping_cost: cost,
          color,
          free_shipping_threshold: freeShippingThreshold
            ? parseInt(freeShippingThreshold, 10)
            : null,
          updated_at: new Date().toISOString(),
        })
      }
    } else {
      const formData = new FormData()
      formData.set('name', name.trim())
      formData.set('polygon', JSON.stringify(polygonToUse))
      formData.set('shipping_cost', cost.toString())
      formData.set('color', color)
      if (freeShippingThreshold) {
        formData.set('free_shipping_threshold', freeShippingThreshold)
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
      <div className="space-y-2">
        <Label className="text-slate-300 font-medium">Nombre de la zona</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Centro, Zona Norte..."
          maxLength={50}
          className="bg-slate-900/50 border-slate-700 text-white h-11 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300 font-medium">Costo de envío (ARS)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
          <Input
            type="number"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            placeholder="1500"
            min={0}
            step={100}
            className="bg-slate-900/50 border-slate-700 text-white h-11 pl-7 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
          />
        </div>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <span className="w-1 h-1 bg-slate-500 rounded-full" />
          Ingresa 0 para envío gratuito en esta zona
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300 font-medium">Umbral de envío gratis (opcional)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
          <Input
            type="number"
            value={freeShippingThreshold}
            onChange={(e) => setFreeShippingThreshold(e.target.value)}
            placeholder="15000"
            min={0}
            step={1000}
            className="bg-slate-900/50 border-slate-700 text-white h-11 pl-7 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
          />
        </div>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <span className="w-1 h-1 bg-slate-500 rounded-full" />
          Pedidos que superen este monto tendrán envío gratis
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300 font-medium">Color de la zona</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((presetColor) => (
            <button
              key={presetColor}
              type="button"
              onClick={() => setColor(presetColor)}
              className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                color === presetColor
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
              style={{
                backgroundColor: presetColor,
                boxShadow: color === presetColor ? `0 4px 12px ${presetColor}60` : 'none'
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="relative">
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-11 p-0 border-0 bg-transparent cursor-pointer rounded-lg"
            />
          </div>
          <Input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#FF6B00"
            pattern="^#[0-9A-Fa-f]{6}$"
            className="flex-1 bg-slate-900/50 border-slate-700 text-white font-mono h-11 focus:border-[#FFAE00]/50 focus:ring-2 focus:ring-[#FFAE00]/20 transition-all"
          />
        </div>
      </div>

      {!polygon && !zone?.polygon && (
        <div className="rounded-xl border border-amber-600/50 bg-gradient-to-br from-amber-900/20 to-orange-900/20 p-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-300 mb-1">
                Área de cobertura requerida
              </p>
              <p className="text-xs text-amber-400/80">
                Dibuja un polígono en el mapa para definir el área de esta zona
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 h-11 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading || (!polygon && !zone?.polygon)}
          className="flex-1 h-11 bg-gradient-to-r from-[#FFAE00] to-orange-500 hover:from-[#E09D00] hover:to-orange-600 text-black font-semibold shadow-lg shadow-[#FFAE00]/25 hover:shadow-xl hover:shadow-[#FFAE00]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? 'Guardando...'
            : isEditing
              ? 'Guardar Cambios'
              : 'Crear Zona'}
        </Button>
      </div>
    </form>
  )
}

export function ZoneFormDialog({
  open,
  onOpenChange,
  zone,
  polygon,
  onZoneUpdated,
  onZoneCreated,
}: ZoneFormDialogProps) {
  const handleClose = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-slate-800 max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            {zone?.id ? 'Editar Zona' : 'Nueva Zona de Envío'}
          </DialogTitle>
          <p className="text-slate-400 text-sm mt-1">
            {zone?.id
              ? 'Modifica los datos de la zona de envío'
              : 'Define el área de cobertura y el costo de envío'}
          </p>
        </DialogHeader>

        {/* Use key to force remount when zone changes */}
        <ZoneFormContent
          key={zone?.id ?? 'new'}
          zone={zone}
          polygon={polygon}
          onZoneUpdated={onZoneUpdated}
          onZoneCreated={onZoneCreated}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  )
}
