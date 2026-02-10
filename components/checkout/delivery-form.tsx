'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, User, Phone, MessageSquare, Map, Truck, Check, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AddressAutocomplete } from './address-autocomplete'
import { formatPrice } from '@/lib/utils'
import type { AddressSuggestion } from '@/lib/services/geocoding'
import type { ShippingResult } from '@/lib/types/database'

// Importar el mapa dinámicamente para evitar errores de SSR
const AddressMapPicker = dynamic(
  () => import('./address-map-picker').then((mod) => mod.AddressMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="bg-orange-50 rounded-xl h-[250px] flex items-center justify-center">
        <p className="text-orange-600/70 text-sm">Cargando mapa...</p>
      </div>
    ),
  }
)

export interface DeliveryFormData {
  name: string
  phone: string
  address: string
  apartment: string
  notes: string
  coordinates?: {
    lat: number
    lng: number
  }
}

interface DeliveryFormProps {
  data: DeliveryFormData
  onChange: (data: DeliveryFormData) => void
  shippingResult?: ShippingResult
  hasZones?: boolean
  isCalculatingShipping?: boolean
}

// Zone indicator component - defined outside to avoid recreation on each render
function ZoneIndicator({
  hasZones,
  hasCoordinates,
  shippingResult,
  isCalculating,
}: {
  hasZones: boolean
  hasCoordinates: boolean
  shippingResult?: ShippingResult
  isCalculating?: boolean
}) {
  if (!hasZones || !hasCoordinates) return null

  // Show loading state while calculating
  if (isCalculating) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-3">
        <Loader2 className="h-4 w-4 text-orange-600 animate-spin shrink-0" />
        <p className="text-sm text-orange-700">
          Verificando zona de cobertura...
        </p>
      </div>
    )
  }

  if (shippingResult?.isOutOfCoverage) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <p className="text-sm text-amber-700 font-medium">
          Esta ubicación está fuera de nuestra zona de cobertura
        </p>
      </div>
    )
  }

  if (shippingResult?.zone) {
    return (
      <div
        className="mt-3 p-3 rounded-lg border flex items-center gap-3"
        style={{
          backgroundColor: `${shippingResult.zone.color}10`,
          borderColor: `${shippingResult.zone.color}40`,
        }}
      >
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: shippingResult.zone.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-orange-900">
            Zona: {shippingResult.zone.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Truck className="h-3 w-3 text-orange-600" />
            {shippingResult.isFreeShipping ? (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <Check className="h-3 w-3" />
                Envío gratis
              </span>
            ) : (
              <span className="text-sm text-orange-600">
                Envío: {formatPrice(shippingResult.shippingCost)}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}

export function DeliveryForm({ data, onChange, shippingResult, hasZones = false, isCalculatingShipping = false }: DeliveryFormProps) {
  const [showMap, setShowMap] = useState(false)

  const updateField = (field: keyof DeliveryFormData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  const handleAddressChange = (
    value: string,
    coordinates?: { lat: number; lng: number }
  ) => {
    onChange({
      ...data,
      address: value,
      coordinates: coordinates || data.coordinates,
    })
    // Mostrar el mapa cuando se selecciona una dirección con coordenadas
    if (coordinates) {
      setShowMap(true)
    }
  }

  const handleAddressSelect = (_suggestion: AddressSuggestion) => {
    setShowMap(true)
  }

  const handleMapCoordinatesChange = (
    coords: { lat: number; lng: number },
    address: string
  ) => {
    onChange({
      ...data,
      coordinates: coords,
      // Solo actualizar la dirección si se obtuvo una del reverse geocoding
      address: address || data.address,
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-warm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-orange-100 bg-orange-50/50">
        <div className="w-10 h-10 rounded-full bg-[#FEC501] flex items-center justify-center">
          <MapPin className="h-5 w-5 text-black" />
        </div>
        <div>
          <h2 className="font-bold text-orange-900">Datos de Entrega</h2>
          <p className="text-sm text-orange-600/70">
            Completá tus datos para el delivery
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Name */}
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-orange-800 font-semibold flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Nombre completo
            </Label>
            <Input
              id="name"
              placeholder="Nombre y apellido"
              value={data.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="input-large border-orange-200 focus:border-orange-400"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label
              htmlFor="phone"
              className="text-orange-800 font-semibold flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Teléfono
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Ej: 11 2345-6789"
              value={data.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="input-large border-orange-200 focus:border-orange-400"
            />
          </div>
        </div>

        {/* Address Autocomplete */}
        <AddressAutocomplete
          value={data.address}
          onChange={handleAddressChange}
          onSelect={handleAddressSelect}
          label="Dirección"
          placeholder="Calle y número, barrio o localidad"
          required
        />

        {/* Map Preview */}
        {(showMap || data.coordinates) && (
          <div className="space-y-2">
            <Label className="text-orange-800 font-semibold flex items-center gap-2">
              <Map className="h-4 w-4" />
              Confirmá tu ubicación
            </Label>
            <AddressMapPicker
              coordinates={data.coordinates}
              onCoordinatesChange={handleMapCoordinatesChange}
              height="250px"
            />
            <p className="text-xs text-orange-600/70">
              Si la ubicación no es exacta, podés arrastrar el marcador o hacer
              clic en el mapa para ajustarla
            </p>

            {/* Zone indicator */}
            <ZoneIndicator
              hasZones={hasZones}
              hasCoordinates={!!data.coordinates}
              shippingResult={shippingResult}
              isCalculating={isCalculatingShipping}
            />
          </div>
        )}

        {/* Show map button if no coordinates */}
        {!showMap && !data.coordinates && (
          <button
            type="button"
            onClick={() => setShowMap(true)}
            className="text-sm text-orange-600 hover:text-orange-700 underline flex items-center gap-1"
          >
            <Map className="h-4 w-4" />
            No encuentro mi dirección, quiero marcarla en el mapa
          </button>
        )}

        {/* Apartment */}
        <div className="space-y-2">
          <Label htmlFor="apartment" className="text-orange-800 font-semibold">
            Piso / Departamento (opcional)
          </Label>
          <Input
            id="apartment"
            placeholder="Piso y depto, timbre, torre..."
            value={data.apartment}
            onChange={(e) => updateField('apartment', e.target.value)}
            className="input-large border-orange-200 focus:border-orange-400"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label
            htmlFor="notes"
            className="text-orange-800 font-semibold flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Notas para el delivery (opcional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Indicaciones para encontrarte, referencias, etc."
            value={data.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className="min-h-[80px] rounded-xl border-orange-200 focus:border-orange-400 resize-none"
          />
        </div>
      </div>
    </div>
  )
}
