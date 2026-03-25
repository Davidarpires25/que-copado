'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Loader2, Search, Locate, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAddressAutocomplete } from '@/lib/hooks/use-address-autocomplete'
import { reverseGeocode } from '@/lib/services/geocoding'
import type { AddressSuggestion } from '@/lib/services/geocoding'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string, coordinates?: { lat: number; lng: number }) => void
  onSelect?: (suggestion: AddressSuggestion) => void
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Buscar dirección...',
  label = 'Dirección',
  required = false,
  disabled = false,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isGeolocating, setIsGeolocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { query, setQuery, suggestions, isLoading, error, clearSuggestions } =
    useAddressAutocomplete()

  // Sincroniza el valor externo con el query interno
  useEffect(() => {
    if (value !== query) {
      setQuery(value)
    }
  }, [value, setQuery])

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (newValue: string) => {
    setQuery(newValue)
    onChange(newValue)
    setIsOpen(true)
    setSelectedIndex(-1)
    setGeoError(null)
  }

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.shortAddress, suggestion.coordinates)
    setQuery(suggestion.shortAddress)
    setIsOpen(false)
    clearSuggestions()
    onSelect?.(suggestion)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleGeolocation = async () => {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización')
      return
    }

    setIsGeolocating(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const result = await reverseGeocode(latitude, longitude)

          onChange(result.address, { lat: latitude, lng: longitude })
          setQuery(result.address)
          clearSuggestions()
          setIsOpen(false)

          // Simular selección para mostrar el mapa
          onSelect?.({
            id: 'geolocation',
            label: result.address,
            shortAddress: result.address,
            fullAddress: result.fullAddress,
            coordinates: { lat: latitude, lng: longitude },
          })
        } catch {
          setGeoError('No pudimos obtener tu dirección')
        } finally {
          setIsGeolocating(false)
        }
      },
      (error) => {
        setIsGeolocating(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Permití el acceso a tu ubicación')
            break
          case error.POSITION_UNAVAILABLE:
            setGeoError('Ubicación no disponible')
            break
          case error.TIMEOUT:
            setGeoError('Tiempo de espera agotado')
            break
          default:
            setGeoError('Error al obtener ubicación')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  return (
    <div className="relative space-y-2">
      <Label
        htmlFor="address-autocomplete"
        className="text-sm font-medium text-[#2D1A0E]"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>

      <div className="flex gap-2">
        {/* Input con autocomplete */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E] pointer-events-none z-10" />
          <Input
            ref={inputRef}
            id="address-autocomplete"
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isGeolocating}
            className="bg-white border-[#E7E0D3] rounded-xl h-12 !pl-9 focus-visible:ring-[#FEC501] focus-visible:border-[#FEC501] text-[#2D1A0E] placeholder:text-[#B0A99F]"
            autoComplete="off"
          />

          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              <Loader2 className="h-4 w-4 text-[#78706A] animate-spin" />
            </div>
          )}
        </div>

        {/* Botón GPS */}
        <button
          type="button"
          onClick={handleGeolocation}
          disabled={disabled || isGeolocating}
          title="Usar mi ubicación"
          className="shrink-0 w-12 h-12 rounded-xl bg-[#FFF9F0] border border-[#F0EBE1] flex items-center justify-center text-[#2D1A0E] hover:bg-[#F0EBE1] transition-colors disabled:opacity-50"
        >
          {isGeolocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Locate className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Dropdown de sugerencias */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-[#E7E0D3] rounded-xl shadow-sm max-h-60 overflow-y-auto"
          style={{ top: '100%' }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full text-left px-4 py-3 hover:bg-[#FFF9F0] transition-colors border-b border-[#F0EBE1] last:border-b-0 ${
                index === selectedIndex ? 'bg-[#FFF9F0]' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-[#B0A99F] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2D1A0E]">
                    {suggestion.shortAddress}
                  </p>
                  <p className="text-xs text-[#78706A] truncate mt-0.5">
                    {suggestion.fullAddress}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error de geolocalización */}
      {geoError && (
        <p className="text-sm text-red-500 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {geoError}
        </p>
      )}

      {/* Error de autocomplete */}
      {error && !geoError && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {/* Hint */}
      {!error && !geoError && query.length > 0 && query.length < 3 && (
        <p className="text-xs text-[#B0A99F]">
          Escribí al menos 3 caracteres para buscar
        </p>
      )}
    </div>
  )
}
