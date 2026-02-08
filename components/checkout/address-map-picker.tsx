'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapPin, Navigation, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { reverseGeocode } from '@/lib/services/geocoding'

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

// Componente del mapa que se carga dinámicamente
function MapComponent({
  coordinates,
  onCoordinatesChange,
  height,
}: {
  coordinates: Coordinates
  onCoordinatesChange: (coords: Coordinates) => void
  height: string
}) {
  const [map, setMap] = useState<L.Map | null>(null)
  const [marker, setMarker] = useState<L.Marker | null>(null)

  useEffect(() => {
    // Import dinámico de Leaflet para evitar errores de SSR
    const initMap = async () => {
      const L = (await import('leaflet')).default
      // @ts-ignore
      await import('leaflet/dist/leaflet.css')

      // Fix para los iconos de Leaflet en Next.js
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const container = document.getElementById('map-container')
      if (!container || map) return

      const newMap = L.map(container).setView(
        [coordinates.lat, coordinates.lng],
        16
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(newMap)

      const newMarker = L.marker([coordinates.lat, coordinates.lng], {
        draggable: true,
      }).addTo(newMap)

      newMarker.on('dragend', () => {
        const position = newMarker.getLatLng()
        onCoordinatesChange({ lat: position.lat, lng: position.lng })
      })

      newMap.on('click', (e: L.LeafletMouseEvent) => {
        newMarker.setLatLng(e.latlng)
        onCoordinatesChange({ lat: e.latlng.lat, lng: e.latlng.lng })
      })

      setMap(newMap)
      setMarker(newMarker)
    }

    initMap()

    return () => {
      if (map) {
        map.remove()
      }
    }
  }, [])

  // Actualiza la posición del marcador cuando cambian las coordenadas
  useEffect(() => {
    if (map && marker && coordinates) {
      marker.setLatLng([coordinates.lat, coordinates.lng])
      map.setView([coordinates.lat, coordinates.lng], map.getZoom())
    }
  }, [coordinates, map, marker])

  return (
    <div
      id="map-container"
      style={{ height, width: '100%' }}
      className="rounded-xl overflow-hidden"
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
  const [isMapReady, setIsMapReady] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  // Buenos Aires centro como ubicación por defecto
  const defaultCoords: Coordinates = { lat: -34.6037, lng: -58.3816 }
  const currentCoords = coordinates || defaultCoords

  useEffect(() => {
    // Pequeño delay para asegurar que el DOM está listo
    const timer = setTimeout(() => setIsMapReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleCoordinatesChange = useCallback(
    async (coords: Coordinates) => {
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
        await handleCoordinatesChange(coords)
        setIsLocating(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('No pudimos obtener tu ubicación. Verificá los permisos del navegador.')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [handleCoordinatesChange])

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
        {isMapReady && (
          <MapComponent
            coordinates={currentCoords}
            onCoordinatesChange={handleCoordinatesChange}
            height={height}
          />
        )}

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
      {coordinates && (
        <p className="text-xs text-orange-600/50 text-center">
          {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
        </p>
      )}
    </div>
  )
}
