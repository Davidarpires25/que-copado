'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, AlertTriangle, MessageCircle, Loader2 } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { DeliveryForm, type DeliveryFormData } from '@/components/checkout/delivery-form'
import { PaymentMethodSelector } from '@/components/checkout/payment-method'
import { CheckoutSummary } from '@/components/checkout/checkout-summary'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'
import { getActiveDeliveryZones } from '@/app/actions/delivery-zones'
import { calculateShippingCost } from '@/app/actions/shipping'
import { calculateShippingByZone } from '@/lib/services/shipping'
import { toast } from 'sonner'
import type { DeliveryZone, ShippingResult } from '@/lib/types/database'

type PaymentMethodType = 'cash' | 'transfer' | 'mercadopago'

export default function CheckoutPage() {
  const { items, getTotal, clearCart } = useCartStore()

  const [deliveryData, setDeliveryData] = useState<DeliveryFormData>({
    name: '',
    phone: '',
    address: '',
    apartment: '',
    notes: '',
    coordinates: undefined,
  })

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Delivery zones state
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [zonesLoaded, setZonesLoaded] = useState(false)
  const [zonesError, setZonesError] = useState<string | null>(null)

  // Shipping calculation state
  const [shippingResult, setShippingResult] = useState<ShippingResult>({
    zone: null,
    shippingCost: 0,
    isFreeShipping: false,
    isOutOfCoverage: false,
  })
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)

  // Load delivery zones on mount
  useEffect(() => {
    async function loadZones() {
      try {
        setZonesError(null)
        const { data, error } = await getActiveDeliveryZones()
        if (error) {
          setZonesError(error)
          toast.error('Error al cargar zonas de delivery')
        } else if (data) {
          setZones(data)
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error loading zones:', error)
        }
        setZonesError('Error inesperado al cargar zonas')
      } finally {
        setZonesLoaded(true)
      }
    }
    loadZones()
  }, [])

  // Calculate shipping when coordinates or subtotal change
  const subtotal = getTotal()
  useEffect(() => {
    if (!deliveryData.coordinates || zones.length === 0) {
      // Reset to default if no coordinates or no zones
      setShippingResult({
        zone: null,
        shippingCost: 0,
        isFreeShipping: false,
        isOutOfCoverage: !zonesLoaded || zones.length === 0,
      })
      setIsCalculatingShipping(false)
      return
    }

    // Show calculating state briefly for UX feedback
    setIsCalculatingShipping(true)

    // Calculate shipping - use client-side calculation for instant feedback
    // Server validation happens on checkout
    const result = calculateShippingByZone(
      deliveryData.coordinates.lat,
      deliveryData.coordinates.lng,
      subtotal,
      zones
    )

    // Small delay to show the loading state
    const timer = setTimeout(() => {
      setShippingResult(result)
      setIsCalculatingShipping(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [deliveryData.coordinates, zones, zonesLoaded, subtotal])

  const handleDeliveryDataChange = (data: DeliveryFormData) => {
    setDeliveryData(data)
  }

  const handleCheckout = async () => {
    // Validaciones de campos requeridos
    if (!deliveryData.name.trim()) {
      toast.error('Por favor ingresá tu nombre')
      return
    }
    if (!deliveryData.phone.trim()) {
      toast.error('Por favor ingresá tu teléfono')
      return
    }
    if (!deliveryData.address.trim()) {
      toast.error('Por favor ingresá tu dirección')
      return
    }

    // Block checkout if out of coverage
    if (shippingResult.isOutOfCoverage && zones.length > 0) {
      toast.error('Tu ubicación está fuera de nuestra zona de cobertura')
      return
    }

    setIsLoading(true)

    try {
      const subtotal = getTotal()
      let shipping = 0
      let finalShippingResult = shippingResult

      // Si hay coordenadas y zonas configuradas, validar shipping en el servidor
      if (deliveryData.coordinates && zones.length > 0) {
        const { data: serverShippingResult, error: shippingError } = await calculateShippingCost({
          lat: deliveryData.coordinates.lat,
          lng: deliveryData.coordinates.lng,
          subtotal,
        })

        if (shippingError) {
          toast.error('Error al calcular el envío. Intenta nuevamente.')
          setIsLoading(false)
          return
        }

        if (!serverShippingResult) {
          toast.error('No se pudo calcular el costo de envío')
          setIsLoading(false)
          return
        }

        // Verificar cobertura nuevamente en el servidor
        if (serverShippingResult.isOutOfCoverage) {
          toast.error('Tu ubicación está fuera de nuestra zona de cobertura')
          setIsLoading(false)
          return
        }

        finalShippingResult = serverShippingResult
        shipping = serverShippingResult.shippingCost
      } else {
        // Sin zonas configuradas, usar costo de envío estándar
        shipping = shippingResult.shippingCost
      }

      const total = subtotal + shipping

      const orderItems = items
        .map(
          (item) =>
            `• ${item.quantity}x ${item.product.name} - ${formatPrice(item.product.price * item.quantity)}`
        )
        .join('\n')

      const paymentLabels = {
        cash: 'Efectivo',
        transfer: 'Transferencia',
        mercadopago: 'Mercado Pago',
      }

      let paymentInfo = `*Método de pago:* ${paymentLabels[paymentMethod]}`
      if (paymentMethod === 'cash' && cashAmount) {
        paymentInfo += `\n*Paga con:* $${cashAmount}`
      }

      const fullAddress = deliveryData.apartment
        ? `${deliveryData.address}, ${deliveryData.apartment}`
        : deliveryData.address

      // Generar link de Google Maps si hay coordenadas
      const locationLink = deliveryData.coordinates
        ? `https://www.google.com/maps?q=${deliveryData.coordinates.lat},${deliveryData.coordinates.lng}`
        : ''

      // Include zone name if available (use server-validated result)
      const zoneInfo = finalShippingResult.zone
        ? `\n*Zona:* ${finalShippingResult.zone.name}`
        : ''

      // Build shipping line with zone context
      let shippingLine = `*Envío:* `
      if (finalShippingResult.isFreeShipping) {
        shippingLine += 'Gratis'
        if (finalShippingResult.zone) {
          shippingLine += ` (${finalShippingResult.zone.name})`
        }
      } else if (shipping === 0) {
        shippingLine += 'Gratis'
      } else {
        shippingLine += formatPrice(shipping)
        if (finalShippingResult.zone) {
          shippingLine += ` (${finalShippingResult.zone.name})`
        }
      }

      const message = encodeURIComponent(
        `🍔 *NUEVO PEDIDO - QUE COPADO*\n\n` +
          `*Cliente:* ${deliveryData.name}\n` +
          `*Teléfono:* ${deliveryData.phone}\n` +
          `*Dirección:* ${fullAddress}${zoneInfo}\n` +
          (locationLink ? `*📍 Ubicación:* ${locationLink}\n` : '') +
          (deliveryData.notes ? `*Notas:* ${deliveryData.notes}\n` : '') +
          `\n` +
          `*PEDIDO:*\n${orderItems}\n\n` +
          `*Subtotal:* ${formatPrice(subtotal)}\n` +
          `${shippingLine}\n` +
          `*TOTAL: ${formatPrice(total)}*\n\n` +
          `${paymentInfo}\n\n` +
          `_Enviado desde queCopado.com_`
      )

      const whatsappNumber =
        process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491100000000'
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`

      window.open(whatsappUrl, '_blank')
      clearCart()
      toast.success('Pedido enviado! Te redirigimos a WhatsApp')
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error en checkout:', error)
      }
      toast.error('Ocurrió un error al procesar tu pedido. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        <Header />

        <main className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center">
            <div className="w-32 h-32 rounded-full bg-orange-100 flex items-center justify-center">
              <ShoppingCart className="h-16 w-16 text-orange-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-orange-900 mb-2">
                No hay productos en tu carrito
              </h1>
              <p className="text-orange-600/70">
                Agregá productos para poder realizar tu pedido
              </p>
            </div>
            <Link href="/#menu">
              <Button className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-bold px-8">
                Ver Menú
              </Button>
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  const isOutOfCoverage = useMemo(() =>
    shippingResult.isOutOfCoverage && zones.length > 0 && !!deliveryData.coordinates,
    [shippingResult.isOutOfCoverage, zones.length, deliveryData.coordinates]
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <Header />

      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Back Link */}
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Volver al carrito
        </Link>

        <h1 className="text-2xl md:text-3xl font-black text-orange-900 mb-8">
          Checkout
        </h1>

        {/* Out of coverage warning */}
        {isOutOfCoverage && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">
                Tu ubicación está fuera de nuestra zona de cobertura
              </p>
              <p className="text-sm text-amber-700 mt-1">
                No podemos realizar envíos a esta dirección. Contactanos por WhatsApp para coordinar.
              </p>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491100000000'}?text=Hola! Mi dirección está fuera de la zona de cobertura. ¿Pueden ayudarme?`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-green-700 hover:text-green-800"
              >
                <MessageCircle className="h-4 w-4" />
                Contactar por WhatsApp
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Forms */}
          <div className="lg:col-span-7 space-y-6">
            <DeliveryForm
              data={deliveryData}
              onChange={handleDeliveryDataChange}
              shippingResult={shippingResult}
              hasZones={zones.length > 0}
              isCalculatingShipping={isCalculatingShipping}
            />
            <PaymentMethodSelector
              selected={paymentMethod}
              onSelect={setPaymentMethod}
              cashAmount={cashAmount}
              onCashAmountChange={setCashAmount}
            />
          </div>

          {/* Summary */}
          <div className="lg:col-span-5">
            <CheckoutSummary
              onCheckout={handleCheckout}
              isLoading={isLoading}
              shippingResult={shippingResult}
              isBlocked={!!isOutOfCoverage}
              isCalculatingShipping={isCalculatingShipping}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
