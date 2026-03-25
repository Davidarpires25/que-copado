'use client'

import dynamic from 'next/dynamic'
import { useRef, useEffect } from 'react'
import { Truck, Check, Loader2, Store, AlertCircle, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
      <div className="bg-[#FFF9F0] rounded-xl h-[250px] flex items-center justify-center">
        <p className="text-[#78706A] text-sm">Cargando mapa...</p>
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
  fieldErrors?: Partial<Record<'name' | 'phone' | 'address', string>>
  clearFieldError?: (field: 'name' | 'phone' | 'address') => void
}

const STORE_COORDINATES = {
  lat: parseFloat(process.env.NEXT_PUBLIC_STORE_LAT ?? '-34.6037'),
  lng: parseFloat(process.env.NEXT_PUBLIC_STORE_LNG ?? '-58.3816'),
}

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
      <div className="mt-3 p-3 rounded-lg bg-[#FFF9F0] border border-[#E7E0D3] flex items-center gap-3">
        <Loader2 className="h-4 w-4 text-[#78706A] animate-spin shrink-0" />
        <p className="text-sm text-[#78706A]">
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
    const shippingLabel = shippingResult.isFreeShipping
      ? 'Envío gratis'
      : `Envío ${formatPrice(shippingResult.shippingCost)}`
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 bg-[#FEF3C7] rounded-full px-3 py-1.5">
        <MapPin className="h-3.5 w-3.5 text-[#D97706] shrink-0" />
        <span className="text-xs font-semibold text-[#D97706]">
          {shippingResult.zone.name} · {shippingLabel}
        </span>
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
        className="w-full border-[#E7E0D3] hover:bg-[#FFF9F0] hover:border-[#E7E0D3] text-[#2D1A0E] font-semibold"
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
  isCalculatingShipping = false,
  fieldErrors,
  clearFieldError,
}: DeliveryFormProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const addressContainerRef = useRef<HTMLDivElement>(null)

  // Focus first errored field when fieldErrors changes
  useEffect(() => {
    if (!fieldErrors || Object.keys(fieldErrors).length === 0) return
    if (fieldErrors.name && nameRef.current) {
      nameRef.current.focus()
      nameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (fieldErrors.phone && phoneRef.current) {
      phoneRef.current.focus()
      phoneRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (fieldErrors.address && addressContainerRef.current) {
      const input = addressContainerRef.current.querySelector('input')
      if (input) {
        input.focus()
        input.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [fieldErrors])

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
  }

  const handleAddressSelect = (_suggestion: AddressSuggestion) => {
    // Address selected from autocomplete - map updates via coordinates
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
    <div className="space-y-6">
      {/* Datos personales */}
      <div>
        <h3 className="text-base font-bold text-[#2D1A0E] mb-3">Datos personales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium text-[#2D1A0E] mb-1.5">
              Nombre completo
            </label>
            <Input
              ref={nameRef}
              id="name"
              placeholder="Nombre y apellido"
              value={data.name}
              onChange={(e) => { updateField('name', e.target.value); if (clearFieldError) clearFieldError('name') }}
              className={`bg-white border-[#E7E0D3] focus-visible:ring-[#FEC501] focus-visible:border-[#FEC501] rounded-xl h-12 ${fieldErrors?.name ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
              aria-invalid={!!fieldErrors?.name}
            />
            {fieldErrors?.name && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-1" role="alert">
                <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label htmlFor="phone" className="block text-sm font-medium text-[#2D1A0E] mb-1.5">
              Teléfono
            </label>
            <Input
              ref={phoneRef}
              id="phone"
              type="tel"
              placeholder="Ej: 11 2345-6789"
              value={data.phone}
              onChange={(e) => { updateField('phone', e.target.value); if (clearFieldError) clearFieldError('phone') }}
              className={`bg-white border-[#E7E0D3] focus-visible:ring-[#FEC501] focus-visible:border-[#FEC501] rounded-xl h-12 ${fieldErrors?.phone ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
              aria-invalid={!!fieldErrors?.phone}
            />
            {fieldErrors?.phone && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-1" role="alert">
                <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tipo de entrega */}
      <div>
        <h3 className="text-base font-bold text-[#2D1A0E] mb-3">Tipo de entrega</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Delivery Option */}
          <button
            type="button"
            onClick={() => onDeliveryTypeChange('delivery')}
            className={`
              flex flex-col items-center gap-1.5 p-4 rounded-[14px] transition-all
              ${deliveryType === 'delivery'
                ? 'border-2 border-[#FEC501] bg-[#FFFBEB]'
                : 'border border-[#E7E0D3] bg-white hover:border-[#FEC501]'
              }
            `}
          >
            <Truck className={`h-6 w-6 ${deliveryType === 'delivery' ? 'text-[#2D1A0E]' : 'text-[#78706A]'}`} />
            <span className={`text-sm ${deliveryType === 'delivery' ? 'font-bold text-[#2D1A0E]' : 'font-medium text-[#2D1A0E]'}`}>
              Delivery
            </span>
          </button>

          {/* Pickup Option */}
          <button
            type="button"
            onClick={() => onDeliveryTypeChange('pickup')}
            className={`
              flex flex-col items-center gap-1.5 p-4 rounded-[14px] transition-all
              ${deliveryType === 'pickup'
                ? 'border-2 border-[#FEC501] bg-[#FFFBEB]'
                : 'border border-[#E7E0D3] bg-white hover:border-[#FEC501]'
              }
            `}
          >
            <Store className={`h-6 w-6 ${deliveryType === 'pickup' ? 'text-[#2D1A0E]' : 'text-[#78706A]'}`} />
            <div className="flex flex-col items-center gap-1">
              <span className={`text-sm ${deliveryType === 'pickup' ? 'font-bold text-[#2D1A0E]' : 'font-medium text-[#2D1A0E]'}`}>
                Retiro en local
              </span>
              <span className="bg-[#DCFCE7] text-[#16A34A] text-xs rounded-full px-2 py-0.5 font-medium">
                Envío gratis
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Conditional content based on delivery type */}
      {deliveryType === 'delivery' && (
        <>
          {/* Dirección de entrega */}
          <div>
            <h3 className="text-base font-bold text-[#2D1A0E] mb-3">Dirección de entrega</h3>

            {/* Address Autocomplete */}
            <div ref={addressContainerRef}>
              <AddressAutocomplete
                value={data.address}
                onChange={(v, c) => { handleAddressChange(v, c); if (clearFieldError) clearFieldError('address') }}
                onSelect={handleAddressSelect}
                label="Dirección"
                placeholder="Calle y número, barrio o localidad"
                required
              />
              {fieldErrors?.address && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1" role="alert">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.address}
                </p>
              )}
            </div>

            {/* Map Preview - Siempre visible en delivery */}
            <div className="space-y-2 mt-4">
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
            <div className="space-y-1.5 mt-4">
              <label htmlFor="notes" className="block text-sm font-medium text-[#2D1A0E] mb-1.5">
                Indicaciones (opcional)
              </label>
              <Input
                id="notes"
                placeholder="Piso, depto, timbre, referencias..."
                value={data.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                className="bg-white border-[#E7E0D3] focus-visible:ring-[#FEC501] focus-visible:border-[#FEC501] rounded-xl h-12"
              />
            </div>
          </div>
        </>
      )}

      {deliveryType === 'pickup' && (
        <PickupInfoInline />
      )}

      {/* Método de pago */}
      <div className="pt-4 border-t border-[#F0EBE1]">
        <h3 className="text-base font-bold text-[#2D1A0E] mb-3">Método de pago</h3>
        <div className="flex flex-col gap-2">
          {paymentMethods.map((method) => {
            const Icon = method.icon
            const isSelected = paymentMethod === method.id

            return (
              <button
                key={method.id}
                type="button"
                onClick={() => onPaymentMethodChange(method.id)}
                className={`
                  flex items-center gap-3 px-4 h-[52px] rounded-[14px] border-2 transition-all
                  ${isSelected
                    ? 'border-[#FEC501] bg-[#FFFBEB]'
                    : 'border-[#E7E0D3] bg-white hover:border-[#F0EBE1]'
                  }
                `}
              >
                <Icon size={20} className="text-[#2D1A0E]" />
                <span className={`text-sm ${isSelected ? 'font-semibold text-[#2D1A0E]' : 'font-medium text-[#2D1A0E]'}`}>
                  {method.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Cash Amount Input */}
        {paymentMethod === 'cash' && (
          <div className="space-y-1.5 mt-3">
            <label htmlFor="cashAmount" className="text-xs font-medium text-[#2D1A0E]">
              ¿Con cuánto pagás?
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A99F] font-medium text-base">$</span>
              <Input
                id="cashAmount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ej: 10000"
                value={cashAmount}
                onChange={(e) => onCashAmountChange(e.target.value.replace(/[^0-9]/g, ''))}
                className="bg-white border-[#E7E0D3] h-12 rounded-xl !pl-9 focus-visible:ring-[#FEC501] focus-visible:border-[#FEC501]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
