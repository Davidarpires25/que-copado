'use client'

import { useState } from 'react'
import { Pencil, Trash2, MapPin, Truck, CircleDot, Hexagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
  const [deleteTarget, setDeleteTarget] = useState<DeliveryZone | null>(null)

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
    setDeleteTarget(null)
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
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] backdrop-blur shadow-xl">
      <div className="p-5 border-b border-[var(--admin-border)] bg-[var(--admin-surface)]">
        <h2 className="text-[var(--admin-text)] font-semibold text-lg flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--admin-accent)]/10 rounded-lg flex items-center justify-center">
            <MapPin className="h-4 w-4 text-[var(--admin-accent-text)]" />
          </div>
          Zonas Configuradas
        </h2>
      </div>

      {zones.length === 0 ? (
        <div className="p-10 text-center">
          <div className="w-16 h-16 bg-[var(--admin-surface-2)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-[#3a4150]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--admin-text)] mb-2">No hay zonas configuradas</h3>
          <p className="text-sm text-[var(--admin-text-muted)] max-w-xs mx-auto">
            Dibuja un polígono en el mapa o haz clic en &quot;Nueva Zona&quot; para comenzar
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--admin-surface-2)]">
          {zones.map((zone, index) => (
            <div
              key={zone.id}
              className={`p-4 transition-all duration-200 cursor-pointer group ${
                selectedZoneId === zone.id
                  ? 'bg-[var(--admin-surface-2)] border-l-2 border-[var(--admin-accent)]'
                  : 'hover:bg-[var(--admin-surface-2)]'
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
                      zone.is_active ? 'text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)]' : 'text-[var(--admin-text-muted)]'
                    }`}>
                      {zone.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Truck className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
                      <span className="text-sm text-[var(--admin-accent-text)] font-semibold">
                        {zone.shipping_cost === 0
                          ? 'Envío Gratis'
                          : formatPrice(zone.shipping_cost)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {zone.zone_type === 'circle' ? (
                        <>
                          <CircleDot className="h-3 w-3 text-[var(--admin-text-muted)]" />
                          <span className="text-xs text-[var(--admin-text-muted)]">
                            Radio{' '}
                            {zone.radius_meters && zone.radius_meters >= 1000
                              ? `${(zone.radius_meters / 1000).toFixed(1)} km`
                              : `${zone.radius_meters} m`}
                          </span>
                        </>
                      ) : (
                        <>
                          <Hexagon className="h-3 w-3 text-[var(--admin-text-muted)]" />
                          <span className="text-xs text-[var(--admin-text-muted)]">Polígono</span>
                        </>
                      )}
                    </div>
                    {zone.free_shipping_threshold && (
                      <p className="text-xs text-[var(--admin-text-muted)] mt-1">
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
                    className="data-[state=checked]:bg-[var(--admin-accent)] data-[state=unchecked]:bg-[var(--admin-border)]"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {!zone.is_active && (
                  <Badge variant="outline" className="border-[var(--admin-border)] text-[var(--admin-text-muted)] text-xs bg-[var(--admin-surface-2)]">
                    Inactiva
                  </Badge>
                )}
                <div className="flex-1" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)] transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          onZoneEdit(zone)
                        }}
                        disabled={loadingIds.has(zone.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(zone)
                        }}
                        disabled={loadingIds.has(zone.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar zona"
        description={`¿Eliminar la zona "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  )
}
