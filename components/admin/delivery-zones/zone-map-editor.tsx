'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { CATAMARCA_COORDS } from '@/lib/utils'
import type { DeliveryZone, GeoJSONPolygon } from '@/lib/types/database'

interface ZoneMapEditorProps {
  zones: DeliveryZone[]
  selectedZoneId: string | null
  onPolygonDrawn: (polygon: GeoJSONPolygon) => void
  onPolygonEdited: (zoneId: string, polygon: GeoJSONPolygon) => void
  onZoneSelect: (zoneId: string | null) => void
}

export function ZoneMapEditor({
  zones,
  selectedZoneId,
  onPolygonDrawn,
  onPolygonEdited,
  onZoneSelect,
}: ZoneMapEditorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const polygonLayersRef = useRef<Map<string, L.Polygon>>(new Map())
  const isInitializingRef = useRef(false)
  const [isMapReady, setIsMapReady] = useState(false)

  // Use refs to store callbacks to avoid re-initializing the map
  const onPolygonDrawnRef = useRef(onPolygonDrawn)
  const onPolygonEditedRef = useRef(onPolygonEdited)
  const onZoneSelectRef = useRef(onZoneSelect)

  // Keep refs updated
  useEffect(() => {
    onPolygonDrawnRef.current = onPolygonDrawn
    onPolygonEditedRef.current = onPolygonEdited
    onZoneSelectRef.current = onZoneSelect
  }, [onPolygonDrawn, onPolygonEdited, onZoneSelect])

  // Initialize map
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container || mapRef.current || isInitializingRef.current) return

    // Check if container already has a map (Leaflet stores _leaflet_id)
    if ((container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) {
      return
    }

    isInitializingRef.current = true

    const initMap = async () => {
      const L = (await import('leaflet')).default
      await import('@geoman-io/leaflet-geoman-free')

      // Double-check the container hasn't been initialized while loading
      if ((container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) {
        isInitializingRef.current = false
        return
      }

      // Add Leaflet CSS
      const leafletCssId = 'leaflet-css'
      if (!document.getElementById(leafletCssId)) {
        const leafletLink = document.createElement('link')
        leafletLink.id = leafletCssId
        leafletLink.rel = 'stylesheet'
        leafletLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(leafletLink)
      }

      // Add Geoman CSS
      const geomanCssId = 'leaflet-geoman-css'
      if (!document.getElementById(geomanCssId)) {
        const link = document.createElement('link')
        link.id = geomanCssId
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/@geoman-io/leaflet-geoman-free@2.16.0/dist/leaflet-geoman.css'
        document.head.appendChild(link)
      }

      // Fix default marker icons
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

      // Initialize Geoman controls
      map.pm.addControls({
        position: 'topleft',
        drawCircle: false,
        drawCircleMarker: false,
        drawMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawText: false,
        cutPolygon: false,
        rotateMode: false,
      })

      // Handle polygon creation
      map.on('pm:create', (e) => {
        const layer = e.layer as L.Polygon
        const latLngs = layer.getLatLngs()[0] as L.LatLng[]

        // Convert to GeoJSON polygon format (lng, lat)
        const coordinates = latLngs.map((ll) => [ll.lng, ll.lat])
        // Close the polygon
        coordinates.push(coordinates[0])

        const polygon: GeoJSONPolygon = {
          type: 'Polygon',
          coordinates: [coordinates],
        }

        // Remove the drawn layer (we'll show it via zones prop)
        map.removeLayer(layer)

        onPolygonDrawnRef.current(polygon)
      })

      mapRef.current = map
      setIsMapReady(true)
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      // Clean up Leaflet's internal reference on the container
      if (container) {
        delete (container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id
      }
      isInitializingRef.current = false
      setIsMapReady(false)
    }
  }, []) // Empty deps - only initialize once

  // Draw zones
  const drawZones = useCallback(async () => {
    const map = mapRef.current
    if (!map) return

    const L = (await import('leaflet')).default

    // Clear existing polygons
    polygonLayersRef.current.forEach((polygon) => {
      map.removeLayer(polygon)
    })
    polygonLayersRef.current.clear()

    // Draw all zones
    zones.forEach((zone) => {
      // Convert GeoJSON coordinates to LatLng (lat, lng)
      const latLngs = zone.polygon.coordinates[0].map(
        (coord) => new L.LatLng(coord[1], coord[0])
      )

      const polygon = new L.Polygon(latLngs, {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: zone.is_active ? 0.3 : 0.1,
        weight: zone.id === selectedZoneId ? 3 : 2,
        dashArray: zone.is_active ? undefined : '5, 5',
      })

      polygon.addTo(map)
      polygonLayersRef.current.set(zone.id, polygon)

      // Click handler for selection
      polygon.on('click', () => {
        onZoneSelectRef.current(zone.id)
      })

      // Enable editing when selected
      if (zone.id === selectedZoneId) {
        polygon.pm.enable()

        polygon.on('pm:edit', () => {
          const newLatLngs = polygon.getLatLngs()[0] as L.LatLng[]
          const coordinates = newLatLngs.map((ll) => [ll.lng, ll.lat])
          coordinates.push(coordinates[0])

          const newPolygon: GeoJSONPolygon = {
            type: 'Polygon',
            coordinates: [coordinates],
          }

          onPolygonEditedRef.current(zone.id, newPolygon)
        })
      }
    })
  }, [zones, selectedZoneId])

  // Redraw zones when they change
  useEffect(() => {
    if (isMapReady) {
      drawZones()
    }
  }, [isMapReady, drawZones])

  return (
    <div ref={mapContainerRef} className="h-full w-full" />
  )
}
