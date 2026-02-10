'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut, Plus, MapPin, ArrowLeft, Check } from 'lucide-react'
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

  const activeZones = zones.filter(z => z.is_active)

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="text-slate-400 hover:text-white transition-all duration-200 hover:bg-slate-800/50 rounded-lg p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FFAE00] to-orange-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-[#FFAE00]/20">
                🍔
              </div>
              <div>
                <span className="text-xl font-bold text-white">
                  Que <span className="text-[#FFAE00]">Copado</span>
                </span>
                <Badge className="bg-slate-800 text-slate-300 ml-2 text-xs">Admin</Badge>
              </div>
            </div>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </form>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6 hover:border-[#FFAE00]/30 transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total de Zonas</p>
                <p className="text-3xl font-bold text-white mt-1">{zones.length}</p>
              </div>
              <div className="w-12 h-12 bg-[#FFAE00]/10 rounded-xl flex items-center justify-center">
                <MapPin className="h-6 w-6 text-[#FFAE00]" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6 hover:border-green-500/30 transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Zonas Activas</p>
                <p className="text-3xl font-bold text-white mt-1">{activeZones.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Check className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
              <MapPin className="h-6 w-6 text-[#FFAE00]" />
              Zonas de Envío
            </h1>
            <p className="text-slate-400 text-sm">
              Define las áreas de cobertura y costos de envío
            </p>
          </div>
          <Button
            onClick={() => {
              setDrawnPolygon(null)
              setEditingZone(null)
              setIsAddDialogOpen(true)
            }}
            className="bg-gradient-to-r from-[#FFAE00] to-orange-500 hover:from-[#E09D00] hover:to-orange-600 text-black font-semibold shadow-lg shadow-[#FFAE00]/25 hover:shadow-xl hover:shadow-[#FFAE00]/30 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Zona
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/30 backdrop-blur shadow-xl">
              <div className="p-5 border-b border-slate-800 bg-slate-900/50">
                <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#FFAE00]/10 rounded-lg flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-[#FFAE00]" />
                  </div>
                  Mapa de Cobertura
                </h2>
                <p className="text-sm text-slate-400 mt-1">
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
      </main>
    </div>
  )
}
