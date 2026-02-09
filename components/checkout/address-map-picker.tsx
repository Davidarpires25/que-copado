'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { MapPin, Navigation, Loader2 } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Button } from '@/components/ui/button'
import { reverseGeocode } from '@/lib/services/geocoding'
import 'leaflet/dist/leaflet.css'

// Fix para los iconos de Leaflet en Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
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
  height = '250px',
  disabled = false,
}: AddressMapPickerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
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
      // Actualizar posición del marcador inmediatamente
      setMarkerPosition(coords)
      setIsLoading(true)

      try {
        // Throttle: esperar 1 segundo para respetar límites de Nominatim
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const result = await reverseGeocode(coords.lat, coords.lng)
        onCoordinatesChange(coords, result.address)
      } catch (error) {
        console.error('Error reverse geocoding:', error)
        onCoordinatesChange(coords, '')
      } finally {
        setIsLoading(false)
      }
    },
    [onCoordinatesChange]
  )

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        await handlePositionChange(coords)
        setIsLocating(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('No pudimos obtener tu ubicación. Verificá los permisos del navegador.')
        setIsLocating(false)
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

  const displayPosition = markerPosition || currentCoords

  return (
    <div className="space-y-3">
      {/* Botón usar mi ubicación */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-orange-700/70 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Arrastrá el marcador para ajustar la ubicación
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
        >
          {isLocating ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Navigation className="h-3 w-3 mr-1" />
          )}
          Usar mi ubicación
        </Button>
      </div>

      {/* Mapa */}
      <div className="relative">
        <MapContainer
          center={[currentCoords.lat, currentCoords.lng]}
          zoom={16}
          style={{ height, width: '100%' }}
          className="rounded-xl overflow-hidden z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DraggableMarker
            position={displayPosition}
            onDragEnd={handlePositionChange}
          />
          <MapClickHandler onMapClick={handlePositionChange} />
          <MapCenterUpdater coordinates={displayPosition} />
        </MapContainer>

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

      {/* Coordenadas actuales */}
      {markerPosition && (
        <p className="text-xs text-orange-600/50 text-center">
          {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
        </p>
      )}
    </div>
  )
}
