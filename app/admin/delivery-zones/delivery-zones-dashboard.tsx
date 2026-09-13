'use client'

import { useState } from 'react'
import { AlertTriangle, MapPin, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ZoneMapEditor } from '@/components/admin/delivery-zones/zone-map-editor'
import { ZoneList } from '@/components/admin/delivery-zones/zone-list'
import { ZoneFormDialog } from '@/components/admin/delivery-zones/zone-form-dialog'
import { AdminLayout } from '@/components/admin/layout'
import type { DeliveryZone, DrawnZoneGeometry } from '@/lib/types/database'

interface DeliveryZonesDashboardProps {
  initialZones: DeliveryZone[]
}

export function DeliveryZonesDashboard({ initialZones }: DeliveryZonesDashboardProps) {
  const [zones, setZones] = useState(initialZones)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [drawnGeometry, setDrawnGeometry] = useState<DrawnZoneGeometry | null>(null)

  const handleZoneUpdated = (updatedZone: DeliveryZone) => {
    setZones((prev) => prev.map((z) => (z.id === updatedZone.id ? updatedZone : z)))
    setEditingZone(null)
    setDrawnGeometry(null)
  }

  const handleZoneDeleted = (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId))
    if (selectedZoneId === zoneId) setSelectedZoneId(null)
  }

  const handleZoneToggled = (zoneId: string, isActive: boolean) => {
    setZones((prev) => prev.map((z) => (z.id === zoneId ? { ...z, is_active: isActive } : z)))
  }

  const handleZoneCreated = (newZone: DeliveryZone) => {
    setZones((prev) => [...prev, newZone])
    setDrawnGeometry(null)
  }

  const handleGeometryDrawn = (geometry: DrawnZoneGeometry) => {
    setDrawnGeometry(geometry)
    setIsAddDialogOpen(true)
  }

  const handleGeometryEdited = (zoneId: string, geometry: DrawnZoneGeometry) => {
    const zone = zones.find((z) => z.id === zoneId)
    if (!zone) return

    const updatedZone: DeliveryZone =
      geometry.type === 'circle'
        ? { ...zone, zone_type: 'circle', center: geometry.center, radius_meters: geometry.radius_meters, polygon: null }
        : { ...zone, zone_type: 'polygon', polygon: geometry.polygon, center: null, radius_meters: null }

    setEditingZone(updatedZone)
    setDrawnGeometry(geometry)
  }

  const handleEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone)
    setDrawnGeometry(
      zone.zone_type === 'circle' && zone.center && zone.radius_meters
        ? { type: 'circle', center: zone.center, radius_meters: zone.radius_meters }
        : zone.polygon
          ? { type: 'polygon', polygon: zone.polygon }
          : null
    )
    setSelectedZoneId(zone.id)
  }

  const activeZones = zones.filter((z) => z.is_active)

  return (
    <AdminLayout title="Zonas de Envío" description="Define las áreas de cobertura y costos de envío">
      {activeZones.length === 0 && (
        <div
          className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6"
          role="alert"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-700 dark:text-red-400 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-300">
            <span className="font-semibold">Los pedidos con envío están bloqueados.</span>{' '}
            {zones.length === 0
              ? 'No hay ninguna zona dibujada, así que toda dirección queda fuera de cobertura.'
              : 'Todas las zonas están desactivadas, así que toda dirección queda fuera de cobertura.'}
          </p>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-[var(--admin-text-muted)]">
          {zones.length} {zones.length === 1 ? 'zona configurada' : 'zonas configuradas'}
        </p>
        <Button
          onClick={() => {
            setDrawnGeometry(null)
            setEditingZone(null)
            setIsAddDialogOpen(true)
          }}
          className="bg-[var(--admin-accent)] hover:bg-[#E09D00] text-black font-semibold"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Zona
        </Button>
      </div>

      {/* Map and List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <div className="border border-[var(--admin-border)] overflow-hidden bg-[var(--admin-surface)] shadow-[var(--shadow-card)]">
            <div className="p-5 border-b border-[var(--admin-border)] bg-[var(--admin-surface)]">
              <h2 className="text-[var(--admin-text)] font-semibold text-lg flex items-center gap-2">
                <div className="w-8 h-8 bg-[var(--admin-accent)]/10 rounded-lg flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-[var(--admin-accent-text)]" />
                </div>
                Mapa de Cobertura
              </h2>
              <p className="text-sm text-[var(--admin-text-muted)] mt-1">
                Dibuja <strong className="text-[var(--admin-text)]">polígonos</strong> o{' '}
                <strong className="text-[var(--admin-text)]">círculos</strong> en el mapa para definir las zonas de envío
              </p>
            </div>
            <div className="h-[500px] relative" style={{ isolation: 'isolate' }}>
              <ZoneMapEditor
                zones={zones}
                selectedZoneId={selectedZoneId}
                onGeometryDrawn={handleGeometryDrawn}
                onGeometryEdited={handleGeometryEdited}
                onZoneSelect={setSelectedZoneId}
              />
            </div>
          </div>
        </div>

        <div className="flex">
          <ZoneList
            zones={zones}
            selectedZoneId={selectedZoneId}
            onZoneSelect={setSelectedZoneId}
            onZoneEdit={handleEditZone}
            onZoneDeleted={handleZoneDeleted}
            onZoneToggled={handleZoneToggled}
          />
        </div>
      </div>

      <ZoneFormDialog
        open={isAddDialogOpen || !!editingZone}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingZone(null)
            setDrawnGeometry(null)
          }
        }}
        zone={editingZone}
        drawnGeometry={drawnGeometry}
        onZoneUpdated={handleZoneUpdated}
        onZoneCreated={handleZoneCreated}
      />
    </AdminLayout>
  )
}
