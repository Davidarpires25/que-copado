'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, User, Phone, MessageSquare, Truck, Check, Loader2, Store } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AddressAutocomplete } from './address-autocomplete'
import { CashIcon, BankTransferIcon, MercadoPagoIcon, NavigationIcon } from '@/components/icons'
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

export type DeliveryType = 'delivery' | 'pickup'
export type PaymentMethod = 'cash' | 'transfer' | 'mercadopago'

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
  deliveryType: DeliveryType | null
  onDeliveryTypeChange: (type: DeliveryType) => void
  paymentMethod: PaymentMethod
  onPaymentMethodChange: (method: PaymentMethod) => void
  cashAmount: string
  onCashAmountChange: (amount: string) => void
  shippingResult?: ShippingResult
  hasZones?: boolean
  isCalculatingShipping?: boolean
}

// Configuración del local - TODO: mover a env o base de datos
const STORE_COORDINATES = { lat: -34.6037, lng: -58.3816 }

// Zone indicator component
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

// Pickup info component (inline)
function PickupInfoInline() {
  const handleOpenMap = () => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${STORE_COORDINATES.lat},${STORE_COORDINATES.lng}`
    window.open(googleMapsUrl, '_blank')
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Map Button */}
      <Button
        type="button"
        onClick={handleOpenMap}
        variant="outline"
        className="w-full border-orange-200 hover:bg-orange-50 hover:border-orange-300 text-orange-700 font-semibold"
      >
        <NavigationIcon size={18} className="mr-2" />
        Cómo llegar
      </Button>

      {/* Info */}
      <div className="p-3 rounded-lg bg-green-50 border border-green-200">
        <p className="text-sm text-green-800">
          <span className="font-semibold">¡Envío gratis!</span> Te avisaremos por WhatsApp cuando tu pedido esté listo para retirar.
        </p>
      </div>
    </div>
  )
}

const paymentMethods = [
  {
    id: 'cash' as const,
    label: 'Efectivo',
    description: 'Pagás al recibir',
    icon: CashIcon
  },
  {
    id: 'transfer' as const,
    label: 'Transferencia',
    description: 'Te enviamos los datos',
    icon: BankTransferIcon
  },
  {
    id: 'mercadopago' as const,
    label: 'Mercado Pago',
    description: 'Pagás al recibir',
    icon: MercadoPagoIcon
  },
]

export function DeliveryForm({
  data,
  onChange,
  deliveryType,
  onDeliveryTypeChange,
  paymentMethod,
  onPaymentMethodChange,
  cashAmount,
  onCashAmountChange,
  shippingResult,
  hasZones = false,
  isCalculatingShipping = false
}: DeliveryFormProps) {
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
      address: address || data.address,
    })
  }

  return (
    <div className="-mx-4 lg:mx-0 bg-white lg:rounded-2xl lg:border lg:border-orange-100 lg:shadow-warm overflow-hidden">
      {/* Header - Compacto en móvil */}
      <div className="flex items-center gap-3 px-4 lg:px-6 py-3 lg:py-4 border-b border-orange-100 bg-orange-50/50">
        <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-[#FEC501] flex items-center justify-center">
          <User className="h-4 w-4 lg:h-5 lg:w-5 text-black" />
        </div>
        <div>
          <h2 className="font-bold text-orange-900 text-sm lg:text-base">Datos del Pedido</h2>
          <p className="text-xs lg:text-sm text-orange-600/70">
            Completá tus datos para continuar
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 lg:px-6 py-5 lg:py-6 space-y-5">
        {/* Name & Phone - Siempre visibles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className="input-large border-orange-200"
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
              className="input-large border-orange-200"
            />
          </div>
        </div>

        {/* Delivery Type Selector */}
        <div className="space-y-2">
          <Label className="text-orange-800 font-semibold">
            ¿Cómo recibís tu pedido?
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {/* Delivery Option */}
            <button
              type="button"
              onClick={() => onDeliveryTypeChange('delivery')}
              className={`
                relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                ${deliveryType === 'delivery'
                  ? 'border-[#FEC501] bg-[#FEC501]/10'
                  : 'border-orange-200 bg-white hover:border-orange-300'
                }
              `}
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shrink-0
                ${deliveryType === 'delivery' ? 'bg-[#FEC501]' : 'bg-orange-100'}
              `}>
                <Truck className={`h-5 w-5 ${deliveryType === 'delivery' ? 'text-black' : 'text-orange-600'}`} />
              </div>
              <div className="text-left">
                <p className={`font-semibold ${deliveryType === 'delivery' ? 'text-orange-900' : 'text-orange-700'}`}>
                  Delivery
                </p>
                <p className="text-xs text-orange-600/70">Te lo llevamos</p>
              </div>
              {deliveryType === 'delivery' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#FEC501] flex items-center justify-center">
                  <Check className="h-3 w-3 text-black" />
                </div>
              )}
            </button>

            {/* Pickup Option */}
            <button
              type="button"
              onClick={() => onDeliveryTypeChange('pickup')}
              className={`
                relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                ${deliveryType === 'pickup'
                  ? 'border-[#FEC501] bg-[#FEC501]/10'
                  : 'border-orange-200 bg-white hover:border-orange-300'
                }
              `}
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shrink-0
                ${deliveryType === 'pickup' ? 'bg-[#FEC501]' : 'bg-orange-100'}
              `}>
                <Store className={`h-5 w-5 ${deliveryType === 'pickup' ? 'text-black' : 'text-orange-600'}`} />
              </div>
              <div className="text-left">
                <p className={`font-semibold ${deliveryType === 'pickup' ? 'text-orange-900' : 'text-orange-700'}`}>
                  Retiro
                </p>
                <p className="text-xs text-green-600 font-medium">¡Envío gratis!</p>
              </div>
              {deliveryType === 'pickup' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#FEC501] flex items-center justify-center">
                  <Check className="h-3 w-3 text-black" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Conditional content based on delivery type */}
        {deliveryType === 'delivery' && (
          <>
            {/* Address Autocomplete */}
            <AddressAutocomplete
              value={data.address}
              onChange={handleAddressChange}
              onSelect={handleAddressSelect}
              label="Dirección"
              placeholder="Calle y número, barrio o localidad"
              required
            />

            {/* Map Preview - Siempre visible en delivery */}
            <div className="space-y-2">
              <AddressMapPicker
                coordinates={data.coordinates}
                onCoordinatesChange={handleMapCoordinatesChange}
                height="200px"
              />

              {/* Zone indicator - solo cuando hay coordenadas */}
              {data.coordinates && (
                <ZoneIndicator
                  hasZones={hasZones}
                  hasCoordinates={!!data.coordinates}
                  shippingResult={shippingResult}
                  isCalculating={isCalculatingShipping}
                />
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label
                htmlFor="notes"
                className="text-orange-800 font-semibold flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Indicaciones (opcional)
              </Label>
              <Input
                id="notes"
                placeholder="Piso, depto, timbre, referencias..."
                value={data.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                className="input-large border-orange-200"
              />
            </div>
          </>
        )}

        {deliveryType === 'pickup' && (
          <PickupInfoInline />
        )}

        {/* Payment Method Selector */}
        <div className="space-y-3 pt-4 border-t border-orange-100">
          <Label className="text-orange-800 font-semibold">¿Cómo pagás?</Label>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon
              const isSelected = paymentMethod === method.id

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => onPaymentMethodChange(method.id)}
                  className={`
                    relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all
                    ${isSelected
                      ? 'border-[#FEC501] bg-[#FEC501]/10'
                      : 'border-orange-200 bg-white hover:border-orange-300'
                    }
                  `}
                >
                  {/* Check badge */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#FEC501] flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-black" />
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`
                    w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2
                    ${isSelected ? 'bg-[#FEC501]' : 'bg-orange-100'}
                  `}>
                    <Icon
                      size={20}
                      className={`sm:w-6 sm:h-6 ${isSelected ? 'text-black' : 'text-orange-600'}`}
                    />
                  </div>

                  {/* Label */}
                  <span className={`text-xs sm:text-sm font-semibold text-center ${isSelected ? 'text-orange-900' : 'text-orange-700'}`}>
                    {method.label}
                  </span>

                  {/* Description */}
                  <span className="text-[10px] sm:text-xs text-orange-500 text-center mt-0.5 hidden sm:block">
                    {method.description}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Cash Amount Input */}
          {paymentMethod === 'cash' && (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
              <label htmlFor="cashAmount" className="text-sm text-orange-700 font-medium block mb-2">
                ¿Con cuánto pagás?
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 font-medium text-base">$</span>
                <Input
                  id="cashAmount"
                  type="text"
                  placeholder="Ej: 10000"
                  value={cashAmount}
                  onChange={(e) => onCashAmountChange(e.target.value)}
                  className="input-large !pl-9 border-orange-200 bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
