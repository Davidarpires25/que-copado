'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore, getCartItemName, getCartItemPrice } from '@/lib/store/cart-store'
import { getActiveDeliveryZones } from '@/app/actions/delivery-zones'
import { calculateShippingCost } from '@/app/actions/shipping'
import { createOrder, validateCartStock } from '@/app/actions/orders'
import { checkIfAcceptingOrders } from '@/app/actions/business-settings'
import { calculateShippingByZone } from '@/lib/services/shipping'
import { generateWhatsAppMessage } from '@/lib/services/order-formatter'
import { toast } from 'sonner'
import type { DeliveryZone, ShippingResult } from '@/lib/types/database'
import type { DeliveryFormData, DeliveryType, PaymentMethod } from '@/components/checkout/delivery-form'
import type { OrderItem } from '@/lib/types/orders'
import type { PendingOrder } from '@/app/order-confirmation/page'

const SHIPPING_CALC_DEBOUNCE_MS = 300

const INITIAL_SHIPPING: ShippingResult = {
  zone: null,
  shippingCost: 0,
  isFreeShipping: false,
  isOutOfCoverage: false,
}

const PICKUP_SHIPPING: ShippingResult = {
  zone: null,
  shippingCost: 0,
  isFreeShipping: true,
  isOutOfCoverage: false,
}

export function useCheckout() {
  const router = useRouter()
  const { items, getTotal } = useCartStore()

  // Form state
  const [deliveryType, setDeliveryType] = useState<DeliveryType | null>(null)
  const [deliveryData, setDeliveryData] = useState<DeliveryFormData>({
    name: '',
    phone: '',
    address: '',
    apartment: '',
    notes: '',
    coordinates: undefined,
  })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'phone' | 'address', string>>>({})

  // Business status
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(true)
  const [businessMessage, setBusinessMessage] = useState<string | null>(null)
  const [checkingBusiness, setCheckingBusiness] = useState(true)

  // Delivery zones
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [zonesLoaded, setZonesLoaded] = useState(false)

  // Shipping
  const [shippingResult, setShippingResult] = useState<ShippingResult>(INITIAL_SHIPPING)
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)

  // Check business status on mount
  useEffect(() => {
    async function checkBusiness() {
      try {
        const { accepting, message } = await checkIfAcceptingOrders()
        setIsAcceptingOrders(accepting)
        setBusinessMessage(message)
      } catch {
        setIsAcceptingOrders(true)
      } finally {
        setCheckingBusiness(false)
      }
    }
    checkBusiness()
  }, [])

  // Load delivery zones on mount
  useEffect(() => {
    async function loadZones() {
      try {
        const { data, error } = await getActiveDeliveryZones()
        if (error) {
          toast.error('Error al cargar zonas de delivery')
        } else if (data) {
          setZones(data)
        }
      } catch {
        // Silently fail - zones will be empty
      } finally {
        setZonesLoaded(true)
      }
    }
    loadZones()
  }, [])

  // Calculate shipping when coordinates or subtotal change
  const subtotal = getTotal()
  useEffect(() => {
    if (deliveryType === 'pickup') {
      setShippingResult(PICKUP_SHIPPING)
      setIsCalculatingShipping(false)
      return
    }

    if (!deliveryData.coordinates || zones.length === 0) {
      setShippingResult({
        zone: null,
        shippingCost: 0,
        isFreeShipping: false,
        isOutOfCoverage: !zonesLoaded || zones.length === 0,
      })
      setIsCalculatingShipping(false)
      return
    }

    setIsCalculatingShipping(true)

    const result = calculateShippingByZone(
      deliveryData.coordinates.lat,
      deliveryData.coordinates.lng,
      subtotal,
      zones
    )

    const timer = setTimeout(() => {
      setShippingResult(result)
      setIsCalculatingShipping(false)
    }, SHIPPING_CALC_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [deliveryType, deliveryData.coordinates, zones, zonesLoaded, subtotal])

  const handleDeliveryTypeChange = useCallback((type: DeliveryType) => {
    setDeliveryType(type)
    if (type === 'pickup') {
      setShippingResult(PICKUP_SHIPPING)
    }
  }, [])

  const isOutOfCoverage = useMemo(() =>
    deliveryType === 'delivery' && shippingResult.isOutOfCoverage && zones.length > 0 && !!deliveryData.coordinates,
    [deliveryType, shippingResult.isOutOfCoverage, zones.length, deliveryData.coordinates]
  )

  const handleCheckout = useCallback(async () => {
    if (!isAcceptingOrders) {
      toast.error(businessMessage || 'No estamos recibiendo pedidos en este momento')
      return
    }

    if (!deliveryType) {
      toast.error('Por favor seleccioná cómo recibís tu pedido')
      return
    }

    // Accumulative field validation
    const errors: Partial<Record<'name' | 'phone' | 'address', string>> = {}
    if (!deliveryData.name.trim()) errors.name = 'Ingresá tu nombre'
    if (!deliveryData.phone.trim()) errors.phone = 'Ingresá tu teléfono'
    if (deliveryType === 'delivery' && !deliveryData.address.trim()) errors.address = 'Ingresá tu dirección'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    if (deliveryType === 'delivery' && shippingResult.isOutOfCoverage && zones.length > 0) {
      toast.error('Tu ubicación está fuera de nuestra zona de cobertura')
      return
    }

    setIsLoading(true)

    try {
      // VALIDACIÓN DE STOCK: Verificar disponibilidad antes de procesar pago/envío
      // For half-and-half, validate only the primary half (conservative)
      const cartSnapshot = items.map((i) => ({
        id: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
      }))
      const { issues, error: stockValidationError } = await validateCartStock(cartSnapshot)

      if (stockValidationError) {
        toast.error('No pudimos verificar el stock. Intenta nuevamente.')
        setIsLoading(false)
        return
      }

      if (issues.length > 0) {
        const first = issues[0]
        if (first.issue === 'not_found') {
          toast.error(`"${first.productName}" ya no está disponible. Actualizá tu carrito.`)
        } else if (first.issue === 'out_of_stock') {
          toast.error(`"${first.productName}" se agotó. Eliminalo del carrito para continuar.`)
        } else {
          toast.error(
            `Solo quedan ${first.available} unidades de "${first.productName}" y pediste ${first.requested}.`
          )
        }
        setIsLoading(false)
        return
      }

      const currentSubtotal = getTotal()
      let shipping = 0
      let finalShippingResult = shippingResult

      if (deliveryType === 'pickup') {
        shipping = 0
        finalShippingResult = PICKUP_SHIPPING
      } else {
        if (deliveryData.coordinates && zones.length > 0) {
          const { data: serverShippingResult, error: shippingError } = await calculateShippingCost({
            lat: deliveryData.coordinates.lat,
            lng: deliveryData.coordinates.lng,
            subtotal: currentSubtotal,
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

          if (serverShippingResult.isOutOfCoverage) {
            toast.error('Tu ubicación está fuera de nuestra zona de cobertura')
            setIsLoading(false)
            return
          }

          finalShippingResult = serverShippingResult
          shipping = serverShippingResult.shippingCost
        } else {
          shipping = shippingResult.shippingCost
        }
      }

      const total = currentSubtotal + shipping

      const orderItems: OrderItem[] = items.map((item) => ({
        id: item.product.id,
        name: getCartItemName(item),
        price: getCartItemPrice(item),
        quantity: item.quantity,
        image_url: item.product.image_url,
      }))

      const fullAddress = deliveryType === 'pickup'
        ? 'Retiro en local'
        : deliveryData.address

      const { data: order, error: orderError } = await createOrder({
        customer_name: deliveryData.name,
        customer_phone: deliveryData.phone,
        customer_address: fullAddress,
        customer_coordinates: deliveryType === 'pickup' ? null : (deliveryData.coordinates || null),
        items: orderItems,
        total,
        shipping_cost: shipping,
        delivery_zone_id: finalShippingResult.zone?.id || null,
        notes: deliveryType === 'pickup' ? null : (deliveryData.notes || null),
        payment_method: paymentMethod,
      })

      if (orderError || !order) {
        toast.error(orderError || 'Error al guardar el pedido')
        setIsLoading(false)
        return
      }

      const message = generateWhatsAppMessage({
        orderId: order.id,
        customerName: deliveryData.name,
        customerPhone: deliveryData.phone,
        address: fullAddress,
        coordinates: deliveryType === 'pickup' ? undefined : deliveryData.coordinates,
        zone: finalShippingResult.zone,
        notes: deliveryType === 'pickup' ? undefined : deliveryData.notes,
        items: orderItems,
        subtotal: currentSubtotal,
        shipping,
        isFreeShipping: finalShippingResult.isFreeShipping,
        total,
        paymentMethod,
        cashAmount: paymentMethod === 'cash' ? cashAmount : undefined,
      })

      const whatsappNumber =
        process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491100000000'
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`

      const pendingOrder: PendingOrder = {
        whatsappUrl,
        customerName: deliveryData.name,
        customerPhone: deliveryData.phone,
        itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
        subtotal: currentSubtotal,
        shippingCost: shipping,
        total,
        deliveryType: deliveryType as 'delivery' | 'pickup',
        address: fullAddress,
        paymentMethod,
        orderNumber: String(Math.floor(1000 + Math.random() * 9000)),
      }
      sessionStorage.setItem('qc_pending_order', JSON.stringify(pendingOrder))
      router.push('/order-confirmation')
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error en checkout:', error)
      }
      toast.error('Ocurrió un error al procesar tu pedido. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }, [
    isAcceptingOrders, businessMessage, deliveryType, deliveryData,
    shippingResult, zones, items, getTotal, paymentMethod, cashAmount, router,
  ])

  const clearFieldError = useCallback((field: 'name' | 'phone' | 'address') => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  return {
    // Cart
    items,

    // Form state
    deliveryType,
    deliveryData,
    paymentMethod,
    cashAmount,
    isLoading,
    fieldErrors,

    // Business status
    isAcceptingOrders,
    businessMessage,
    checkingBusiness,

    // Zones & Shipping
    zones,
    shippingResult,
    isCalculatingShipping,
    isOutOfCoverage,

    // Handlers
    onDeliveryDataChange: setDeliveryData,
    onDeliveryTypeChange: handleDeliveryTypeChange,
    onPaymentMethodChange: setPaymentMethod,
    onCashAmountChange: setCashAmount,
    onCheckout: handleCheckout,
    clearFieldError,
  }
}
