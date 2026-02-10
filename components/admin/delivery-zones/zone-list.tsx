'use client'

import { useState } from 'react'
import { Pencil, Trash2, MapPin, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { deleteDeliveryZone, toggleZoneActive } from '@/app/actions/delivery-zones'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/utils'
import type { DeliveryZone } from '@/lib/types/database'

interface ZoneListProps {
  zones: DeliveryZone[]
  selectedZoneId: string | null
  onZoneSelect: (zoneId: string | null) => void
  onZoneEdit: (zone: DeliveryZone) => void
  onZoneDeleted: (zoneId: string) => void
  onZoneToggled: (zoneId: string, isActive: boolean) => void
}

export function ZoneList({
  zones,
  selectedZoneId,
  onZoneSelect,
  onZoneEdit,
  onZoneDeleted,
  onZoneToggled,
}: ZoneListProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const handleToggleActive = async (zone: DeliveryZone) => {
    setLoadingIds((prev) => new Set(prev).add(zone.id))
    const newActiveState = !zone.is_active
    const result = await toggleZoneActive(zone.id, newActiveState)
    setLoadingIds((prev) => {
      const next = new Set(prev)
      next.delete(zone.id)
      return next
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(newActiveState ? 'Zona activada' : 'Zona desactivada')
      // Update local state instead of reloading
      onZoneToggled(zone.id, newActiveState)
    }
  }

  const handleDelete = async (zone: DeliveryZone) => {
    if (!confirm(`¿Eliminar la zona "${zone.name}"?`)) return

    setLoadingIds((prev) => new Set(prev).add(zone.id))
    const result = await deleteDeliveryZone(zone.id)
    setLoadingIds((prev) => {
      const next = new Set(prev)
      next.delete(zone.id)
      return next
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Zona eliminada')
      onZoneDeleted(zone.id)
    }
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-white font-medium">Zonas Configuradas</h2>
      </div>

      {zones.length === 0 ? (
        <div className="p-8 text-center">
          <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No hay zonas configuradas</p>
          <p className="text-sm text-slate-500 mt-1">
            Dibuja un polígono en el mapa para crear una zona
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`p-4 transition-colors cursor-pointer ${
                selectedZoneId === zone.id
                  ? 'bg-slate-800/50'
                  : 'hover:bg-slate-800/30'
              }`}
              onClick={() => onZoneSelect(zone.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: zone.color }}
                  />
                  <div className="min-w-0">
                    <p className={`font-medium truncate ${zone.is_active ? 'text-white' : 'text-slate-500'}`}>
                      {zone.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Truck className="h-3 w-3 text-slate-500" />
                      <span className="text-sm text-[#FFAE00] font-medium">
                        {zone.shipping_cost === 0
                          ? 'Gratis'
                          : formatPrice(zone.shipping_cost)}
                      </span>
                    </div>
                    {zone.free_shipping_threshold && (
                      <p className="text-xs text-slate-500 mt-1">
                        Gratis desde {formatPrice(zone.free_shipping_threshold)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Switch
                    checked={zone.is_active}
                    onCheckedChange={() => handleToggleActive(zone)}
                    disabled={loadingIds.has(zone.id)}
                    className="data-[state=checked]:bg-[#FFAE00]"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {!zone.is_active && (
                  <Badge variant="outline" className="border-slate-700 text-slate-500 text-xs">
                    Inactiva
                  </Badge>
                )}
                <div className="flex-1" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-400 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    onZoneEdit(zone)
                  }}
                  disabled={loadingIds.has(zone.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-500 hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(zone)
                  }}
                  disabled={loadingIds.has(zone.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
