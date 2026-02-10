'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur shadow-xl">
      <div className="p-5 border-b border-slate-800 bg-slate-900/50">
        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FFAE00]/10 rounded-lg flex items-center justify-center">
            <MapPin className="h-4 w-4 text-[#FFAE00]" />
          </div>
          Zonas Configuradas
        </h2>
      </div>

      {zones.length === 0 ? (
        <div className="p-10 text-center">
          <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No hay zonas configuradas</h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            Dibuja un polígono en el mapa o haz clic en &quot;Nueva Zona&quot; para comenzar
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {zones.map((zone, index) => (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 transition-all duration-200 cursor-pointer group ${
                selectedZoneId === zone.id
                  ? 'bg-slate-800/50 border-l-2 border-[#FFAE00]'
                  : 'hover:bg-slate-800/30'
              }`}
              onClick={() => onZoneSelect(zone.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-5 h-5 rounded-lg flex-shrink-0 shadow-lg transition-transform duration-200 group-hover:scale-110"
                    style={{
                      backgroundColor: zone.color,
                      boxShadow: `0 4px 12px ${zone.color}40`
                    }}
                  />
                  <div className="min-w-0">
                    <p className={`font-semibold truncate transition-colors duration-200 ${
                      zone.is_active ? 'text-white group-hover:text-[#FFAE00]' : 'text-slate-500'
                    }`}>
                      {zone.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Truck className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-sm text-[#FFAE00] font-semibold">
                        {zone.shipping_cost === 0
                          ? 'Envío Gratis'
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
                    className="data-[state=checked]:bg-[#FFAE00] data-[state=unchecked]:bg-slate-700"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {!zone.is_active && (
                  <Badge variant="outline" className="border-slate-700 text-slate-500 text-xs bg-slate-800/30">
                    Inactiva
                  </Badge>
                )}
                <div className="flex-1" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
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
                  className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(zone)
                  }}
                  disabled={loadingIds.has(zone.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
