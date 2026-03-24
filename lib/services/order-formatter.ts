import { formatPrice } from '@/lib/utils'
import type { Json, PaymentMethod } from '@/lib/types/database'
import type { OrderItem } from '@/lib/types/orders'
import { PAYMENT_METHOD_CONFIG } from '@/lib/types/orders'

/**
 * Formatea los items de una orden para WhatsApp
 */
export function formatOrderItemsForWhatsApp(items: OrderItem[]): string {
  return items
    .map(
      (item) =>
        `• ${item.quantity}x ${item.name} - ${formatPrice(item.price * item.quantity)}`
    )
    .join('\n')
}

/**
 * Obtiene el label del método de pago
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_CONFIG[method]?.label || method
}

/**
 * Obtiene el ícono del método de pago
 */
export function getPaymentMethodIcon(method: PaymentMethod): string {
  return PAYMENT_METHOD_CONFIG[method]?.icon || '💰'
}

/**
 * Formatea una fecha relativa (hace X minutos, hoy, ayer, etc.)
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return 'Ahora'
  }

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`
  }

  if (diffHours < 24) {
    return `Hace ${diffHours}h`
  }

  if (diffDays === 1) {
    return 'Ayer'
  }

  if (diffDays < 7) {
    return `Hace ${diffDays} días`
  }

  // Formatear fecha completa
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/**
 * Formatea fecha y hora completa
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Opciones para generar mensaje de WhatsApp desde checkout
 */
interface WhatsAppMessageOptions {
  orderId: string
  customerName: string
  customerPhone: string
  address: string
  coordinates?: { lat: number; lng: number } | null
  zone?: { id: string; name: string } | null
  notes?: string | null
  items: OrderItem[]
  subtotal: number
  shipping: number
  isFreeShipping: boolean
  total: number
  paymentMethod: PaymentMethod
  cashAmount?: string
}

/**
 * Genera el mensaje de WhatsApp para el checkout
 */
export function generateWhatsAppMessage(options: WhatsAppMessageOptions): string {
  const {
    orderId,
    customerName,
    customerPhone,
    address,
    coordinates,
    zone,
    notes,
    items,
    subtotal,
    shipping,
    isFreeShipping,
    total,
    paymentMethod,
    cashAmount,
  } = options

  const orderItems = formatOrderItemsForWhatsApp(items)
  const paymentLabel = getPaymentMethodLabel(paymentMethod)

  // Generar link de Google Maps si hay coordenadas
  const locationLink = coordinates
    ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
    : ''

  // Info de zona
  const zoneInfo = zone ? `\n*Zona:* ${zone.name}` : ''

  // Construir línea de envío
  let shippingLine = `*Envío:* `
  if (isFreeShipping || shipping === 0) {
    shippingLine += 'Gratis'
    if (zone) {
      shippingLine += ` (${zone.name})`
    }
  } else {
    shippingLine += formatPrice(shipping)
    if (zone) {
      shippingLine += ` (${zone.name})`
    }
  }

  // Info de pago
  let paymentInfo = `*Método de pago:* ${paymentLabel}`
  if (paymentMethod === 'cash' && cashAmount) {
    paymentInfo += `\n*Paga con:* $${cashAmount}`
  }

  let message = `🍔 *NUEVO PEDIDO - QUE COPADO*\n\n`
  message += `*Pedido #${orderId.slice(0, 8).toUpperCase()}*\n\n`
  message += `*Cliente:* ${customerName}\n`
  message += `*Teléfono:* ${customerPhone}\n`
  message += `*Dirección:* ${address}${zoneInfo}\n`

  if (locationLink) {
    message += `*📍 Ubicación:* ${locationLink}\n`
  }

  if (notes) {
    message += `*Notas:* ${notes}\n`
  }

  message += `\n*PEDIDO:*\n${orderItems}\n\n`
  message += `*Subtotal:* ${formatPrice(subtotal)}\n`
  message += `${shippingLine}\n`
  message += `*TOTAL: ${formatPrice(total)}*\n\n`
  message += `${paymentInfo}\n\n`
  message += `_Enviado desde queCopado.com_`

  return message
}

/**
 * Genera un ID corto para mostrar (primeros 8 caracteres)
 */
export function getShortOrderId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase()
}

function isOrderItemLike(item: Json): item is { [key: string]: Json | undefined } & { name: Json; price: Json } {
  return typeof item === 'object' && item !== null && !Array.isArray(item) && 'name' in item && 'price' in item
}

/**
 * Parsea los items de una orden desde JSON con validacion de tipos
 */
export function parseOrderItems(items: Json): OrderItem[] {
  if (!items || !Array.isArray(items)) {
    return []
  }

  return items.filter(isOrderItemLike).map((item) => ({
    id: String(item.id ?? ''),
    name: String(item.name ?? 'Producto'),
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
    image_url: item.image_url ? String(item.image_url) : null,
  }))
}
