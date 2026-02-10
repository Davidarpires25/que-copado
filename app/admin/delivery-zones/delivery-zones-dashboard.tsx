'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, MapPin, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ZoneMapEditor } from '@/components/admin/delivery-zones/zone-map-editor'
import { ZoneList } from '@/components/admin/delivery-zones/zone-list'
import { ZoneFormDialog } from '@/components/admin/delivery-zones/zone-form-dialog'
import { AdminLayout } from '@/components/admin/layout'
import type { DeliveryZone, GeoJSONPolygon } from '@/lib/types/database'

interface DeliveryZonesDashboardProps {
  initialZones: DeliveryZone[]
}

export function DeliveryZonesDashboard({ initialZones }: DeliveryZonesDashboardProps) {
  const [zones, setZones] = useState(initialZones)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [drawnPolygon, setDrawnPolygon] = useState<GeoJSONPolygon | null>(null)

  const handleZoneUpdated = (updatedZone: DeliveryZone) => {
    setZones((prev) =>
      prev.map((z) => (z.id === updatedZone.id ? updatedZone : z))
    )
    setEditingZone(null)
    setDrawnPolygon(null)
  }

  const handleZoneDeleted = (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId))
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null)
    }
  }

  const handleZoneToggled = (zoneId: string, isActive: boolean) => {
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, is_active: isActive } : z))
    )
  }

  const handleZoneCreated = (newZone: DeliveryZone) => {
    setZones((prev) => [...prev, newZone])
    setDrawnPolygon(null)
  }

  const handlePolygonDrawn = (polygon: GeoJSONPolygon) => {
    setDrawnPolygon(polygon)
    setIsAddDialogOpen(true)
  }

  const handlePolygonEdited = (zoneId: string, polygon: GeoJSONPolygon) => {
    const zone = zones.find((z) => z.id === zoneId)
    if (zone) {
      setEditingZone({ ...zone, polygon })
      setDrawnPolygon(polygon)
    }
  }

  const handleEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone)
    setDrawnPolygon(zone.polygon)
    setSelectedZoneId(zone.id)
  }

  const activeZones = zones.filter(z => z.is_active)

  return (
    <AdminLayout title="Zonas de Envío" description="Define las áreas de cobertura y costos de envío">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1a1d24] backdrop-blur border border-[#2a2f3a] rounded-xl p-6 hover:border-[#FEC501]/30 transition-colors duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8b9ab0] text-sm font-medium">Total de Zonas</p>
              <p className="text-3xl font-bold text-[#f0f2f5] mt-1">{zones.length}</p>
            </div>
            <div className="w-12 h-12 bg-[#FEC501]/10 rounded-xl flex items-center justify-center">
              <MapPin className="h-6 w-6 text-[#FEC501]" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1a1d24] backdrop-blur border border-[#2a2f3a] rounded-xl p-6 hover:border-green-500/30 transition-colors duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8b9ab0] text-sm font-medium">Zonas Activas</p>
              <p className="text-3xl font-bold text-[#f0f2f5] mt-1">{activeZones.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Check className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-[#8b9ab0]">
          {zones.length} {zones.length === 1 ? 'zona' : 'zonas'} configuradas
        </p>
        <Button
          onClick={() => {
            setDrawnPolygon(null)
            setEditingZone(null)
            setIsAddDialogOpen(true)
          }}
          className="bg-[#FEC501] hover:bg-[#E09D00] text-black font-semibold"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Zona
        </Button>
      </div>

      {/* Map and List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <div className="rounded-xl border border-[#2a2f3a] overflow-hidden bg-[#1a1d24] backdrop-blur shadow-xl">
            <div className="p-5 border-b border-[#2a2f3a] bg-[#1a1d24]">
              <h2 className="text-[#f0f2f5] font-semibold text-lg flex items-center gap-2">
                <div className="w-8 h-8 bg-[#FEC501]/10 rounded-lg flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-[#FEC501]" />
                </div>
                Mapa de Cobertura
              </h2>
              <p className="text-sm text-[#8b9ab0] mt-1">
                Dibuja polígonos en el mapa para definir las zonas de envío
              </p>
            </div>
            <div className="h-[500px] relative">
              <ZoneMapEditor
                zones={zones}
                selectedZoneId={selectedZoneId}
                onPolygonDrawn={handlePolygonDrawn}
                onPolygonEdited={handlePolygonEdited}
                onZoneSelect={setSelectedZoneId}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ZoneList
            zones={zones}
            selectedZoneId={selectedZoneId}
            onZoneSelect={setSelectedZoneId}
            onZoneEdit={handleEditZone}
            onZoneDeleted={handleZoneDeleted}
            onZoneToggled={handleZoneToggled}
          />
        </motion.div>
      </div>

      <ZoneFormDialog
        open={isAddDialogOpen || !!editingZone}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingZone(null)
            setDrawnPolygon(null)
          }
        }}
        zone={editingZone}
        polygon={drawnPolygon}
        onZoneUpdated={handleZoneUpdated}
        onZoneCreated={handleZoneCreated}
      />
    </AdminLayout>
  )
}
