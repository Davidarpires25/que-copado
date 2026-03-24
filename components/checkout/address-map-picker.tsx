'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { reverseGeocode } from '@/lib/services/geocoding'
import { GpsIcon } from '@/components/icons'
import 'leaflet/dist/leaflet.css'

// Fix para los iconos de Leaflet en Next.js — imágenes locales para evitar dependencia de CDN
const customIcon = new L.Icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface Coordinates {
  lat: number
  lng: number
}

interface AddressMapPickerProps {
  coordinates?: Coordinates
  onCoordinatesChange: (coords: Coordinates, address: string) => void
  height?: string
  disabled?: boolean
}

// Componente para manejar clicks en el mapa
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (coords: Coordinates) => void
}) {
  useMapEvents({
    click: (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

// Componente para centrar el mapa cuando cambian las coordenadas externas
function MapCenterUpdater({ coordinates }: { coordinates: Coordinates }) {
  const map = useMap()

  useEffect(() => {
    map.setView([coordinates.lat, coordinates.lng], map.getZoom())
  }, [coordinates.lat, coordinates.lng, map])

  return null
}

// Marcador arrastrable
function DraggableMarker({
  position,
  onDragEnd,
}: {
  position: Coordinates
  onDragEnd: (coords: Coordinates) => void
}) {
  const markerRef = useRef<L.Marker>(null)

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker) {
          const latlng = marker.getLatLng()
          onDragEnd({ lat: latlng.lat, lng: latlng.lng })
        }
      },
    }),
    [onDragEnd]
  )

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
      icon={customIcon}
    />
  )
}

export function AddressMapPicker({
  coordinates,
  onCoordinatesChange,
  height = '200px',
  disabled = false,
}: AddressMapPickerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<Coordinates | null>(null)

  // Buenos Aires centro como ubicación por defecto
  const defaultCoords: Coordinates = { lat: -34.6037, lng: -58.3816 }
  const currentCoords = coordinates || defaultCoords

  // Sincronizar posición del marcador con coordenadas externas
  useEffect(() => {
    if (coordinates) {
      setMarkerPosition(coordinates)
    }
  }, [coordinates])

  const handlePositionChange = useCallback(
    async (coords: Coordinates) => {
      setMarkerPosition(coords)
      setIsLoading(true)

      try {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const result = await reverseGeocode(coords.lat, coords.lng)
        onCoordinatesChange(coords, result.address)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error reverse geocoding:', error)
        }
        onCoordinatesChange(coords, '')
      } finally {
        setIsLoading(false)
      }
    },
    [onCoordinatesChange]
  )

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        handlePositionChange(coords)
        setIsGettingLocation(false)
      },
      (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error getting location:', error)
        }
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [handlePositionChange])

  if (disabled) {
    return (
      <div
        className="bg-orange-50 rounded-xl flex items-center justify-center text-orange-600/70"
        style={{ height }}
      >
        <p className="text-sm">Ingresá una dirección para ver el mapa</p>
      </div>
    )
  }

  // Solo mostrar marcador si hay coordenadas reales del usuario
  const hasUserCoordinates = !!coordinates
  const displayPosition = markerPosition || coordinates

  // Zoom: más alejado si no hay ubicación, más cercano si ya seleccionó
  const initialZoom = hasUserCoordinates ? 16 : 13

  return (
    <div className="relative">
      <MapContainer
        center={[currentCoords.lat, currentCoords.lng]}
        zoom={initialZoom}
        style={{ height, width: '100%' }}
        className="rounded-xl overflow-hidden z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Solo mostrar marcador si el usuario seleccionó ubicación */}
        {displayPosition && (
          <DraggableMarker
            position={displayPosition}
            onDragEnd={handlePositionChange}
          />
        )}
        <MapClickHandler onMapClick={handlePositionChange} />
        {displayPosition && <MapCenterUpdater coordinates={displayPosition} />}
      </MapContainer>

      {/* Hint cuando no hay ubicación seleccionada */}
      {!hasUserCoordinates && !isLoading && !isGettingLocation && (
        <div className="absolute bottom-3 left-3 right-14 z-10">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-orange-100">
            <p className="text-xs text-orange-700 text-center">
              Tocá en el mapa o usá el botón GPS para marcar tu ubicación
            </p>
          </div>
        </div>
      )}

      {/* GPS Button */}
      <button
        type="button"
        onClick={handleGetCurrentLocation}
        disabled={isGettingLocation || isLoading}
        className="absolute top-3 right-3 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-orange-200 flex items-center justify-center hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Usar mi ubicación actual"
      >
        {isGettingLocation ? (
          <Loader2 className="h-5 w-5 text-orange-600 animate-spin" />
        ) : (
          <GpsIcon size={20} className="text-orange-600" />
        )}
      </button>

      {/* Overlay de carga */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-orange-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Obteniendo dirección...</span>
          </div>
        </div>
      )}
    </div>
  )
}
