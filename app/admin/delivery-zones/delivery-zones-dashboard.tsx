'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut, Plus, MapPin, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { signOut } from '@/app/actions/auth'
import { ZoneMapEditor } from '@/components/admin/delivery-zones/zone-map-editor'
import { ZoneList } from '@/components/admin/delivery-zones/zone-list'
import { ZoneFormDialog } from '@/components/admin/delivery-zones/zone-form-dialog'
import type { DeliveryZone, GeoJSONPolygon } from '@/lib/types/database'
import Link from 'next/link'

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

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍔</span>
              <span className="text-xl font-bold text-white">
                Que <span className="text-[#FFAE00]">Copado</span>
              </span>
              <Badge className="bg-slate-800 text-slate-300 ml-2">Admin</Badge>
            </div>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </form>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MapPin className="h-6 w-6 text-[#FFAE00]" />
              Zonas de Envío
            </h1>
            <p className="text-slate-400">
              {zones.length} zona{zones.length !== 1 ? 's' : ''} configurada{zones.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={() => {
              setDrawnPolygon(null)
              setEditingZone(null)
              setIsAddDialogOpen(true)
            }}
            className="bg-[#FFAE00] hover:bg-[#E09D00] text-black font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Zona
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-900">
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-white font-medium">
                  Mapa de Cobertura
                </h2>
                <p className="text-sm text-slate-400">
                  Dibuja polígonos para definir las zonas de envío
                </p>
              </div>
              <div className="h-[500px]">
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
            transition={{ delay: 0.1 }}
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
      </main>
    </div>
  )
}
