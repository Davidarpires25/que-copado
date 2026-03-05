'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { CATAMARCA_COORDS } from '@/lib/utils'
import type { DeliveryZone, GeoJSONPolygon, DrawnZoneGeometry, ZoneCenter } from '@/lib/types/database'

interface ZoneMapEditorProps {
  zones: DeliveryZone[]
  selectedZoneId: string | null
  onGeometryDrawn: (geometry: DrawnZoneGeometry) => void
  onGeometryEdited: (zoneId: string, geometry: DrawnZoneGeometry) => void
  onZoneSelect: (zoneId: string | null) => void
}

export function ZoneMapEditor({
  zones,
  selectedZoneId,
  onGeometryDrawn,
  onGeometryEdited,
  onZoneSelect,
}: ZoneMapEditorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<Map<string, L.Polygon | L.Circle>>(new Map())
  const isInitializingRef = useRef(false)
  const [isMapReady, setIsMapReady] = useState(false)

  const onGeometryDrawnRef = useRef(onGeometryDrawn)
  const onGeometryEditedRef = useRef(onGeometryEdited)
  const onZoneSelectRef = useRef(onZoneSelect)

  useEffect(() => {
    onGeometryDrawnRef.current = onGeometryDrawn
    onGeometryEditedRef.current = onGeometryEdited
    onZoneSelectRef.current = onZoneSelect
  }, [onGeometryDrawn, onGeometryEdited, onZoneSelect])

  // Initialize map
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container || mapRef.current || isInitializingRef.current) return
    if ((container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) return

    isInitializingRef.current = true

    const initMap = async () => {
      const L = (await import('leaflet')).default
      await import('@geoman-io/leaflet-geoman-free')

      if ((container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) {
        isInitializingRef.current = false
        return
      }

      // CSS
      const addCss = (id: string, href: string) => {
        if (!document.getElementById(id)) {
          const link = document.createElement('link')
          link.id = id; link.rel = 'stylesheet'; link.href = href
          document.head.appendChild(link)
        }
      }
      addCss('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css')
      addCss('leaflet-geoman-css', 'https://unpkg.com/@geoman-io/leaflet-geoman-free@2.16.0/dist/leaflet-geoman.css')

      // Fix marker icons
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(mapContainerRef.current!, {
        center: [CATAMARCA_COORDS.lat, CATAMARCA_COORDS.lng],
        zoom: CATAMARCA_COORDS.zoom,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      map.pm.addControls({
        position: 'topleft',
        drawCircle: true,          // ← enabled
        drawCircleMarker: false,
        drawMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawText: false,
        cutPolygon: false,
        rotateMode: false,
      })

      map.on('pm:create', (e) => {
        const shape = (e as unknown as { shape: string }).shape

        if (shape === 'Circle') {
          const circle = e.layer as L.Circle
          const center: ZoneCenter = {
            lat: circle.getLatLng().lat,
            lng: circle.getLatLng().lng,
          }
          const radiusMeters = Math.round(circle.getRadius())
          map.removeLayer(circle)
          onGeometryDrawnRef.current({ type: 'circle', center, radius_meters: radiusMeters })
        } else {
          // Polygon
          const layer = e.layer as L.Polygon
          const latLngs = layer.getLatLngs()[0] as L.LatLng[]
          const coordinates = latLngs.map((ll) => [ll.lng, ll.lat])
          coordinates.push(coordinates[0]) // close ring
          const polygon: GeoJSONPolygon = { type: 'Polygon', coordinates: [coordinates] }
          map.removeLayer(layer)
          onGeometryDrawnRef.current({ type: 'polygon', polygon })
        }
      })

      mapRef.current = map
      setIsMapReady(true)
    }

    initMap()

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      if (container) delete (container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id
      isInitializingRef.current = false
      setIsMapReady(false)
    }
  }, [])

  // Draw all zones
  const drawZones = useCallback(async () => {
    const map = mapRef.current
    if (!map) return

    const L = (await import('leaflet')).default

    // Clear existing layers
    layersRef.current.forEach((layer) => map.removeLayer(layer))
    layersRef.current.clear()

    zones.forEach((zone) => {
      const isSelected = zone.id === selectedZoneId
      const baseOptions = {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: zone.is_active ? 0.3 : 0.1,
        weight: isSelected ? 3 : 2,
        dashArray: zone.is_active ? undefined : '5, 5',
      }

      let layer: L.Polygon | L.Circle

      if (zone.zone_type === 'circle' && zone.center && zone.radius_meters) {
        layer = new L.Circle(
          [zone.center.lat, zone.center.lng],
          { ...baseOptions, radius: zone.radius_meters }
        )

        if (isSelected) {
          ;(layer as L.Circle).pm.enable()
          layer.on('pm:edit', () => {
            const circle = layer as L.Circle
            onGeometryEditedRef.current(zone.id, {
              type: 'circle',
              center: { lat: circle.getLatLng().lat, lng: circle.getLatLng().lng },
              radius_meters: Math.round(circle.getRadius()),
            })
          })
        }
      } else if (zone.polygon) {
        const latLngs = zone.polygon.coordinates[0].map(
          (coord) => new L.LatLng(coord[1], coord[0])
        )
        layer = new L.Polygon(latLngs, baseOptions)

        if (isSelected) {
          ;(layer as L.Polygon).pm.enable()
          layer.on('pm:edit', () => {
            const newLatLngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[]
            const coordinates = newLatLngs.map((ll) => [ll.lng, ll.lat])
            coordinates.push(coordinates[0])
            onGeometryEditedRef.current(zone.id, {
              type: 'polygon',
              polygon: { type: 'Polygon', coordinates: [coordinates] },
            })
          })
        }
      } else {
        return
      }

      layer.addTo(map)
      layersRef.current.set(zone.id, layer)
      layer.on('click', () => onZoneSelectRef.current(zone.id))
    })
  }, [zones, selectedZoneId])

  useEffect(() => {
    if (isMapReady) drawZones()
  }, [isMapReady, drawZones])

  return <div ref={mapContainerRef} className="h-full w-full" />
}
