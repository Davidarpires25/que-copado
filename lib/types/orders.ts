import type { Order, OrderStatus, PaymentMethod, DeliveryZone } from './database'

// Item del carrito guardado en la orden
export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string | null
}

// Datos para crear una orden desde el checkout
export interface CreateOrderData {
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_coordinates?: { lat: number; lng: number } | null
  items: OrderItem[]
  total: number
  shipping_cost: number
  delivery_zone_id?: string | null
  notes?: string | null
  payment_method: PaymentMethod
}

// Orden con la zona de delivery incluida
export interface OrderWithZone extends Order {
  delivery_zones: DeliveryZone | null
}

// Filtros para listar órdenes
export interface OrderFilters {
  status?: OrderStatus | 'all'
  dateFrom?: string
  dateTo?: string
  search?: string
}

// Estadísticas del dashboard
export interface DashboardStats {
  todayRevenue: number
  todayOrders: number
  weekRevenue: number
  weekOrders: number
  monthRevenue: number
  monthOrders: number
  averageTicket: number
}

// Producto más vendido
export interface TopProduct {
  id: string
  name: string
  quantity: number
  revenue: number
}

// Datos para el gráfico de ventas
export interface SalesChartData {
  date: string
  revenue: number
  orders: number
}

// Configuración de estados con colores y labels
export const ORDER_STATUS_CONFIG: Record<OrderStatus, {
  label: string
  color: string
  bgColor: string
  textColor: string
}> = {
  recibido: {
    label: 'Recibido',
    color: '#FEC501',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-500',
  },
  pagado: {
    label: 'Pagado',
    color: '#3B82F6',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-500',
  },
  entregado: {
    label: 'Entregado',
    color: '#22C55E',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-500',
  },
  cancelado: {
    label: 'Cancelado',
    color: '#EF4444',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-500',
  },
}

// Configuración de métodos de pago
export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, {
  label: string
  icon: string
}> = {
  cash: {
    label: 'Efectivo',
    icon: '💵',
  },
  transfer: {
    label: 'Transferencia',
    icon: '🏦',
  },
  mercadopago: {
    label: 'Mercado Pago',
    icon: '💳',
  },
}
