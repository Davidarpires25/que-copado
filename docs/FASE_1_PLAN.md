# PLAN DE IMPLEMENTACIÓN - FASE 1: HERRAMIENTAS ADMIN

Plan detallado para implementar el sistema de gestión de pedidos y dashboard de ventas en "Que Copado".

---

## ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Paso 1: Migraciones de Base de Datos](#paso-1-migraciones-de-base-de-datos)
3. [Paso 2: Actualizar Tipos TypeScript](#paso-2-actualizar-tipos-typescript)
4. [Paso 3: Server Actions](#paso-3-server-actions)
5. [Paso 4: Servicios de Lógica de Negocio](#paso-4-servicios-de-lógica-de-negocio)
6. [Paso 5: Componentes UI](#paso-5-componentes-ui)
7. [Paso 6: Páginas del Admin](#paso-6-páginas-del-admin)
8. [Paso 7: Integrar Guardado de Pedidos en Checkout](#paso-7-integrar-guardado-de-pedidos-en-checkout)
9. [Paso 8: Validación de Horarios](#paso-8-validación-de-horarios)
10. [Paso 9: Testing y Validación](#paso-9-testing-y-validación)
11. [Orden de Implementación](#orden-de-implementación)
12. [Checklist de Entregables](#checklist-de-entregables)

---

## RESUMEN EJECUTIVO

### Objetivos Fase 1
- Guardar pedidos en la base de datos al finalizar checkout
- Dashboard de métricas y ventas para el admin
- Sistema de gestión de pedidos (cambio de estado, filtros)
- Sistema de horarios y pausas de negocio

### Arquitectura General
```
Checkout (Cliente) → Server Actions → Supabase
                                           ↓
Admin Dashboard ← Server Components ← Base de Datos
```

### Tecnologías Utilizadas
- **Base de datos**: PostgreSQL/Supabase con RLS
- **Backend**: Server Actions (Next.js)
- **Frontend Admin**: Server Components + Client Components con Radix UI
- **Gráficos**: Recharts (nueva dependencia)
- **Estado**: Sin estado global (Server Components refresh via revalidatePath)

---

## PASO 1: MIGRACIONES DE BASE DE DATOS

### 1.1 Migración: Actualizar tabla `orders`

**Archivo**: `supabase/migrations/001_update_orders_table.sql`

```sql
-- Fase 1: Migración para actualizar tabla orders
-- Fecha: 2026-02-10

-- 1. Actualizar enum de estados (de 6 a 4 estados)
-- Primero crear el nuevo enum
CREATE TYPE order_status_new AS ENUM ('recibido', 'pagado', 'entregado', 'cancelado');

-- 2. Agregar columnas nuevas con valores temporales
ALTER TABLE orders
  ADD COLUMN customer_name TEXT,
  ADD COLUMN customer_address TEXT,
  ADD COLUMN customer_coordinates JSONB,
  ADD COLUMN shipping_cost NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  ADD COLUMN delivery_zone_id UUID REFERENCES delivery_zones(id) ON DELETE SET NULL,
  ADD COLUMN notes TEXT,
  ADD COLUMN payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'mercadopago')),
  ADD COLUMN status_new order_status_new DEFAULT 'recibido';

-- 3. Migrar datos existentes si los hay
UPDATE orders SET status_new =
  CASE
    WHEN status = 'pending' THEN 'recibido'::order_status_new
    WHEN status = 'confirmed' THEN 'pagado'::order_status_new
    WHEN status = 'preparing' THEN 'pagado'::order_status_new
    WHEN status = 'ready' THEN 'pagado'::order_status_new
    WHEN status = 'delivered' THEN 'entregado'::order_status_new
    WHEN status = 'cancelled' THEN 'cancelado'::order_status_new
  END;

-- 4. Eliminar columna status antigua y renombrar
ALTER TABLE orders DROP COLUMN status;
ALTER TABLE orders RENAME COLUMN status_new TO status;

-- 5. Eliminar el enum viejo
DROP TYPE IF EXISTS order_status_old CASCADE;

-- 6. Crear índices para optimizar queries
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_delivery_zone ON orders(delivery_zone_id);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);

-- 7. Hacer campos obligatorios (después de la migración de datos)
ALTER TABLE orders
  ALTER COLUMN customer_name SET NOT NULL,
  ALTER COLUMN customer_address SET NOT NULL,
  ALTER COLUMN payment_method SET NOT NULL;

-- 8. Comentarios para documentación
COMMENT ON COLUMN orders.customer_coordinates IS 'JSON with lat/lng: {"lat": -34.6037, "lng": -58.3816}';
COMMENT ON COLUMN orders.shipping_cost IS 'Shipping cost in ARS at time of order';
COMMENT ON COLUMN orders.delivery_zone_id IS 'Reference to delivery zone (null if zones not configured)';
COMMENT ON COLUMN orders.payment_method IS 'Payment method: cash, transfer, or mercadopago';
```

### 1.2 Migración: Crear tabla `business_settings`

**Archivo**: `supabase/migrations/002_create_business_settings_table.sql`

```sql
-- Fase 1: Crear tabla de configuración del negocio
-- Fecha: 2026-02-10

-- 1. Crear tabla business_settings
CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Días de operación (array de números: 0=Domingo, 1=Lunes, ..., 6=Sábado)
  operating_days INTEGER[] DEFAULT '{1,2,3,4,5,6}' NOT NULL,

  -- Horarios (formato 24h: "09:00", "22:30")
  opening_time TEXT DEFAULT '10:00' NOT NULL,
  closing_time TEXT DEFAULT '23:00' NOT NULL,

  -- Control manual de pausas
  is_paused BOOLEAN DEFAULT FALSE NOT NULL,
  pause_message TEXT DEFAULT 'Estamos cerrados temporalmente. Volvemos pronto!',

  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT valid_opening_time CHECK (opening_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT valid_closing_time CHECK (closing_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT valid_operating_days CHECK (
    operating_days <@ ARRAY[0,1,2,3,4,5,6] AND
    array_length(operating_days, 1) > 0
  )
);

-- 2. Insertar configuración por defecto (singleton pattern)
INSERT INTO business_settings (id, operating_days, opening_time, closing_time)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- ID fijo para singleton
  '{1,2,3,4,5,6}', -- Lunes a Sábado
  '10:00',
  '23:00'
);

-- 3. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_business_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_business_settings_updated_at();

-- 4. Prevenir inserción de múltiples filas (singleton)
CREATE OR REPLACE FUNCTION prevent_multiple_business_settings()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM business_settings) > 0 AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Solo puede existir una fila en business_settings';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_singleton_business_settings
  BEFORE INSERT ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_multiple_business_settings();

-- 5. Comentarios
COMMENT ON TABLE business_settings IS 'Singleton table for business operation hours and status';
COMMENT ON COLUMN business_settings.operating_days IS 'Array of weekdays: 0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN business_settings.is_paused IS 'Manual pause switch for orders';
```

### 1.3 Migración: Políticas RLS

**Archivo**: `supabase/migrations/003_orders_rls_policies.sql`

```sql
-- Fase 1: Row Level Security para orders y business_settings
-- Fecha: 2026-02-10

-- TABLA: orders
-- =============

-- 1. Habilitar RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Lectura para usuarios autenticados (admin)
CREATE POLICY "Admin can read all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Policy: Inserción para cualquiera (checkout público)
CREATE POLICY "Anyone can create orders"
  ON orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 4. Policy: Actualización solo para autenticados (admin)
CREATE POLICY "Admin can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Policy: No se pueden eliminar pedidos (auditoría)
-- No crear policy de DELETE = nadie puede eliminar


-- TABLA: business_settings
-- =========================

-- 1. Habilitar RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Lectura pública (para validar horarios en checkout)
CREATE POLICY "Anyone can read business settings"
  ON business_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Policy: Solo admin puede actualizar
CREATE POLICY "Admin can update business settings"
  ON business_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. No permitir INSERT ni DELETE (singleton con 1 fila existente)
```

### 1.4 Instrucciones de Aplicación

**Desde Supabase Dashboard:**
1. Ir a SQL Editor
2. Ejecutar migrations en orden: `001` → `002` → `003`
3. Verificar en Table Editor que las tablas se crearon correctamente

**Desde Supabase CLI (alternativa):**
```bash
# Crear archivos en carpeta supabase/migrations/
# Luego aplicar:
supabase db push
```

---

## PASO 2: ACTUALIZAR TIPOS TYPESCRIPT

### 2.1 Actualizar `lib/types/database.ts`

**Acción**: Reemplazar tipos existentes de `orders` y agregar `business_settings`.

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum para estados de pedidos (simplificado a 4 estados)
export type OrderStatus = 'recibido' | 'pagado' | 'entregado' | 'cancelado'

// Enum para métodos de pago
export type PaymentMethod = 'cash' | 'transfer' | 'mercadopago'

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_active: boolean
          is_out_of_stock: boolean
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          is_active?: boolean
          is_out_of_stock?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_active?: boolean
          is_out_of_stock?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          created_at: string
          total: number
          items: Json
          customer_name: string
          customer_phone: string
          customer_address: string
          customer_coordinates: Json | null
          shipping_cost: number
          delivery_zone_id: string | null
          notes: string | null
          payment_method: PaymentMethod
          status: OrderStatus
        }
        Insert: {
          id?: string
          created_at?: string
          total: number
          items: Json
          customer_name: string
          customer_phone: string
          customer_address: string
          customer_coordinates?: Json | null
          shipping_cost?: number
          delivery_zone_id?: string | null
          notes?: string | null
          payment_method: PaymentMethod
          status?: OrderStatus
        }
        Update: {
          id?: string
          created_at?: string
          total?: number
          items?: Json
          customer_name?: string
          customer_phone?: string
          customer_address?: string
          customer_coordinates?: Json | null
          shipping_cost?: number
          delivery_zone_id?: string | null
          notes?: string | null
          payment_method?: PaymentMethod
          status?: OrderStatus
        }
      }
      business_settings: {
        Row: {
          id: string
          operating_days: number[]
          opening_time: string
          closing_time: string
          is_paused: boolean
          pause_message: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          operating_days?: number[]
          opening_time?: string
          closing_time?: string
          is_paused?: boolean
          pause_message?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          operating_days?: number[]
          opening_time?: string
          closing_time?: string
          is_paused?: boolean
          pause_message?: string
          updated_at?: string
        }
      }
      delivery_zones: {
        Row: {
          id: string
          name: string
          polygon: Json // GeoJSON
          shipping_cost: number
          color: string
          is_active: boolean
          sort_order: number
          free_shipping_threshold: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          polygon: Json
          shipping_cost: number
          color: string
          is_active?: boolean
          sort_order?: number
          free_shipping_threshold?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          polygon?: Json
          shipping_cost?: number
          color?: string
          is_active?: boolean
          sort_order?: number
          free_shipping_threshold?: number | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Tipos exportados para uso en la aplicación
export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type BusinessSettings = Database['public']['Tables']['business_settings']['Row']

export type ProductWithCategory = Product & {
  categories: Category
}

// Tipo para items del pedido
export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  subtotal: number
}

// Tipo extendido de Order con relaciones
export type OrderWithZone = Order & {
  delivery_zones: DeliveryZone | null
}

// GeoJSON Types for Delivery Zones
export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface DeliveryZone {
  id: string
  name: string
  polygon: GeoJSONPolygon
  shipping_cost: number
  color: string
  is_active: boolean
  sort_order: number
  free_shipping_threshold: number | null
  created_at: string
  updated_at: string
}

export interface ShippingResult {
  zone: DeliveryZone | null
  shippingCost: number
  isFreeShipping: boolean
  isOutOfCoverage: boolean
}

// Coordenadas para pedidos
export interface Coordinates {
  lat: number
  lng: number
}
```

### 2.2 Crear archivo de tipos adicionales

**Archivo**: `lib/types/orders.ts`

```typescript
import type { OrderStatus, PaymentMethod, OrderItem, Coordinates } from './database'

// Parámetros para crear una orden
export interface CreateOrderParams {
  total: number
  items: OrderItem[]
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_coordinates: Coordinates | null
  shipping_cost: number
  delivery_zone_id: string | null
  notes: string | null
  payment_method: PaymentMethod
}

// Estadísticas del dashboard
export interface DashboardStats {
  today: {
    revenue: number
    orders: number
  }
  week: {
    revenue: number
    orders: number
  }
  month: {
    revenue: number
    orders: number
  }
  averageTicket: number
}

// Datos para gráfico de ventas
export interface SalesChartData {
  date: string
  revenue: number
  orders: number
}

// Top productos vendidos
export interface TopProduct {
  productName: string
  quantity: number
  revenue: number
}

// Estado de horarios de negocio
export interface BusinessStatus {
  isOpen: boolean
  isPaused: boolean
  message: string | null
  nextOpenTime?: string
}

// Mapeo de labels para UI
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  recibido: 'Recibido',
  pagado: 'Pagado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
}

// Colores para badges de estados
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  recibido: 'bg-blue-100 text-blue-700 border-blue-200',
  pagado: 'bg-green-100 text-green-700 border-green-200',
  entregado: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelado: 'bg-red-100 text-red-700 border-red-200',
}
```

---

## PASO 3: SERVER ACTIONS

### 3.1 Server Action: `app/actions/orders.ts`

**Archivo nuevo**: Manejo de pedidos desde el admin y checkout.

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  CreateOrderParams,
  OrderStatus,
  Order,
  OrderWithZone,
  OrderItem,
} from '@/lib/types/database'

/**
 * Crear un nuevo pedido (llamado desde checkout)
 * Usa anon client porque es público
 */
export async function createOrder(
  params: CreateOrderParams
): Promise<{ data: Order | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Validaciones
    if (!params.customer_name.trim()) {
      return { data: null, error: 'El nombre es requerido' }
    }
    if (!params.customer_phone.trim()) {
      return { data: null, error: 'El teléfono es requerido' }
    }
    if (!params.customer_address.trim()) {
      return { data: null, error: 'La dirección es requerida' }
    }
    if (params.total <= 0) {
      return { data: null, error: 'El total debe ser mayor a 0' }
    }
    if (!params.items || params.items.length === 0) {
      return { data: null, error: 'El pedido debe tener al menos un producto' }
    }

    // Insertar orden
    const { data, error } = await supabase
      .from('orders')
      .insert({
        total: params.total,
        items: params.items as any, // Json type
        customer_name: params.customer_name,
        customer_phone: params.customer_phone,
        customer_address: params.customer_address,
        customer_coordinates: params.customer_coordinates as any,
        shipping_cost: params.shipping_cost,
        delivery_zone_id: params.delivery_zone_id,
        notes: params.notes,
        payment_method: params.payment_method,
        status: 'recibido', // Estado inicial
      })
      .select()
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating order:', error)
      }
      return { data: null, error: 'Error al crear el pedido' }
    }

    return { data, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in createOrder:', error)
    }
    return { data: null, error: 'Error inesperado al crear el pedido' }
  }
}

/**
 * Obtener todos los pedidos (admin)
 * Requiere autenticación
 */
export async function getAllOrders(): Promise<{
  data: OrderWithZone[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .order('created_at', { ascending: false })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching orders:', error)
      }
      return { data: null, error: 'Error al cargar pedidos' }
    }

    return { data, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getAllOrders:', error)
    }
    return { data: null, error: 'Error inesperado al cargar pedidos' }
  }
}

/**
 * Obtener pedidos filtrados por estado (admin)
 */
export async function getOrdersByStatus(status: OrderStatus): Promise<{
  data: OrderWithZone[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching orders by status:', error)
      }
      return { data: null, error: 'Error al cargar pedidos' }
    }

    return { data, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getOrdersByStatus:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener un pedido por ID (admin)
 */
export async function getOrderById(orderId: string): Promise<{
  data: OrderWithZone | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .eq('id', orderId)
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching order:', error)
      }
      return { data: null, error: 'Error al cargar pedido' }
    }

    return { data, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getOrderById:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Actualizar estado de un pedido (admin)
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ data: Order | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating order status:', error)
      }
      return { data: null, error: 'Error al actualizar estado' }
    }

    // Revalidar páginas del admin
    revalidatePath('/admin/orders')
    revalidatePath('/admin/dashboard')

    return { data, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in updateOrderStatus:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener pedidos de un rango de fechas (admin)
 */
export async function getOrdersByDateRange(
  startDate: string,
  endDate: string
): Promise<{
  data: OrderWithZone[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, delivery_zones(*)')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching orders by date:', error)
      }
      return { data: null, error: 'Error al cargar pedidos' }
    }

    return { data, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getOrdersByDateRange:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}
```

### 3.2 Server Action: `app/actions/business-settings.ts`

**Archivo nuevo**: Gestión de horarios y configuración del negocio.

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { BusinessSettings } from '@/lib/types/database'

const SINGLETON_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Obtener configuración del negocio
 * Acceso público (necesario para validar en checkout)
 */
export async function getBusinessSettings(): Promise<{
  data: BusinessSettings | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching business settings:', error)
      }
      return { data: null, error: 'Error al cargar configuración' }
    }

    return { data, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getBusinessSettings:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Actualizar horarios de operación (admin)
 */
export async function updateBusinessHours(params: {
  operating_days: number[]
  opening_time: string
  closing_time: string
}): Promise<{
  data: BusinessSettings | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    // Validaciones
    if (!params.operating_days || params.operating_days.length === 0) {
      return { data: null, error: 'Debe seleccionar al menos un día' }
    }

    if (!params.opening_time.match(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)) {
      return { data: null, error: 'Formato de hora de apertura inválido' }
    }

    if (!params.closing_time.match(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)) {
      return { data: null, error: 'Formato de hora de cierre inválido' }
    }

    const { data, error } = await supabase
      .from('business_settings')
      .update({
        operating_days: params.operating_days,
        opening_time: params.opening_time,
        closing_time: params.closing_time,
      })
      .eq('id', SINGLETON_ID)
      .select()
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating business hours:', error)
      }
      return { data: null, error: 'Error al actualizar horarios' }
    }

    revalidatePath('/admin/settings')
    revalidatePath('/checkout')

    return { data, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in updateBusinessHours:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Pausar/reanudar pedidos manualmente (admin)
 */
export async function toggleBusinessPause(
  isPaused: boolean,
  pauseMessage?: string
): Promise<{
  data: BusinessSettings | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const updateData: any = { is_paused: isPaused }
    if (pauseMessage !== undefined) {
      updateData.pause_message = pauseMessage
    }

    const { data, error } = await supabase
      .from('business_settings')
      .update(updateData)
      .eq('id', SINGLETON_ID)
      .select()
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error toggling pause:', error)
      }
      return { data: null, error: 'Error al cambiar estado' }
    }

    revalidatePath('/admin/settings')
    revalidatePath('/checkout')

    return { data, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in toggleBusinessPause:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}
```

### 3.3 Server Action: `app/actions/dashboard.ts`

**Archivo nuevo**: Estadísticas y métricas para el dashboard.

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  DashboardStats,
  SalesChartData,
  TopProduct,
  OrderItem,
} from '@/lib/types/orders'

/**
 * Obtener estadísticas del dashboard (admin)
 */
export async function getDashboardStats(): Promise<{
  data: DashboardStats | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(today)
    monthAgo.setDate(monthAgo.getDate() - 30)

    // Pedidos del día (solo entregados y pagados)
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', today.toISOString())
      .in('status', ['pagado', 'entregado'])

    // Pedidos de la semana
    const { data: weekOrders } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', weekAgo.toISOString())
      .in('status', ['pagado', 'entregado'])

    // Pedidos del mes
    const { data: monthOrders } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', monthAgo.toISOString())
      .in('status', ['pagado', 'entregado'])

    const todayRevenue = todayOrders?.reduce((sum, o) => sum + o.total, 0) || 0
    const weekRevenue = weekOrders?.reduce((sum, o) => sum + o.total, 0) || 0
    const monthRevenue = monthOrders?.reduce((sum, o) => sum + o.total, 0) || 0

    const stats: DashboardStats = {
      today: {
        revenue: todayRevenue,
        orders: todayOrders?.length || 0,
      },
      week: {
        revenue: weekRevenue,
        orders: weekOrders?.length || 0,
      },
      month: {
        revenue: monthRevenue,
        orders: monthOrders?.length || 0,
      },
      averageTicket: monthOrders?.length
        ? monthRevenue / monthOrders.length
        : 0,
    }

    return { data: stats, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getDashboardStats:', error)
    }
    return { data: null, error: 'Error al cargar estadísticas' }
  }
}

/**
 * Obtener datos para gráfico de ventas (últimos 7 días)
 */
export async function getSalesChartData(): Promise<{
  data: SalesChartData[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6) // 6 days ago + today = 7 days
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const { data: orders } = await supabase
      .from('orders')
      .select('created_at, total')
      .gte('created_at', sevenDaysAgo.toISOString())
      .in('status', ['pagado', 'entregado'])
      .order('created_at', { ascending: true })

    if (!orders) {
      return { data: [], error: null }
    }

    // Agrupar por día
    const salesByDay = new Map<string, { revenue: number; orders: number }>()

    // Inicializar todos los días con 0
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      salesByDay.set(dateStr, { revenue: 0, orders: 0 })
    }

    // Acumular ventas
    orders.forEach((order) => {
      const dateStr = order.created_at.split('T')[0]
      const current = salesByDay.get(dateStr) || { revenue: 0, orders: 0 }
      salesByDay.set(dateStr, {
        revenue: current.revenue + order.total,
        orders: current.orders + 1,
      })
    })

    // Convertir a array
    const chartData: SalesChartData[] = Array.from(salesByDay.entries()).map(
      ([date, stats]) => ({
        date,
        revenue: stats.revenue,
        orders: stats.orders,
      })
    )

    return { data: chartData, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getSalesChartData:', error)
    }
    return { data: null, error: 'Error al cargar datos del gráfico' }
  }
}

/**
 * Obtener top 5 productos más vendidos del mes
 */
export async function getTopProducts(): Promise<{
  data: TopProduct[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)

    const { data: orders } = await supabase
      .from('orders')
      .select('items')
      .gte('created_at', monthAgo.toISOString())
      .in('status', ['pagado', 'entregado'])

    if (!orders) {
      return { data: [], error: null }
    }

    // Agregar productos de todos los pedidos
    const productStats = new Map<
      string,
      { quantity: number; revenue: number }
    >()

    orders.forEach((order) => {
      const items = order.items as OrderItem[]
      items.forEach((item) => {
        const current = productStats.get(item.productName) || {
          quantity: 0,
          revenue: 0,
        }
        productStats.set(item.productName, {
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + item.subtotal,
        })
      })
    })

    // Convertir a array y ordenar por cantidad
    const topProducts: TopProduct[] = Array.from(
      productStats.entries()
    ).map(([productName, stats]) => ({
      productName,
      quantity: stats.quantity,
      revenue: stats.revenue,
    }))

    // Ordenar por cantidad descendente y tomar top 5
    topProducts.sort((a, b) => b.quantity - a.quantity)
    const top5 = topProducts.slice(0, 5)

    return { data: top5, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getTopProducts:', error)
    }
    return { data: null, error: 'Error al cargar productos más vendidos' }
  }
}
```

---

## PASO 4: SERVICIOS DE LÓGICA DE NEGOCIO

### 4.1 Servicio: `lib/services/business-hours.ts`

**Archivo nuevo**: Validación de horarios de negocio.

```typescript
import type { BusinessSettings } from '@/lib/types/database'
import type { BusinessStatus } from '@/lib/types/orders'

/**
 * Verifica si el negocio está abierto según configuración
 */
export function checkBusinessStatus(
  settings: BusinessSettings,
  currentDate: Date = new Date()
): BusinessStatus {
  // Si está pausado manualmente
  if (settings.is_paused) {
    return {
      isOpen: false,
      isPaused: true,
      message: settings.pause_message,
    }
  }

  const dayOfWeek = currentDate.getDay() // 0=Domingo, 6=Sábado
  const currentTime = formatTime(currentDate)

  // Verificar si hoy es un día de operación
  const isOperatingDay = settings.operating_days.includes(dayOfWeek)

  if (!isOperatingDay) {
    const nextOpenDay = getNextOpenDay(settings.operating_days, dayOfWeek)
    return {
      isOpen: false,
      isPaused: false,
      message: 'Hoy no abrimos. Volvé pronto!',
      nextOpenTime: `${getDayName(nextOpenDay)} ${settings.opening_time}`,
    }
  }

  // Verificar horario
  const isWithinHours =
    currentTime >= settings.opening_time && currentTime <= settings.closing_time

  if (!isWithinHours) {
    const isBeforeOpening = currentTime < settings.opening_time
    return {
      isOpen: false,
      isPaused: false,
      message: isBeforeOpening
        ? `Abrimos hoy a las ${settings.opening_time}`
        : `Cerrado. Abrimos mañana a las ${settings.opening_time}`,
    }
  }

  return {
    isOpen: true,
    isPaused: false,
    message: null,
  }
}

/**
 * Formatea una fecha a HH:MM
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Obtiene el siguiente día de operación
 */
function getNextOpenDay(operatingDays: number[], currentDay: number): number {
  const sortedDays = [...operatingDays].sort((a, b) => a - b)

  for (const day of sortedDays) {
    if (day > currentDay) {
      return day
    }
  }

  // Si no hay días después, devolver el primer día de la semana siguiente
  return sortedDays[0]
}

/**
 * Convierte número de día a nombre
 */
function getDayName(day: number): string {
  const days = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ]
  return days[day]
}

/**
 * Parsea una hora en formato "HH:MM" a minutos desde medianoche
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Valida formato de hora "HH:MM"
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)
}
```

### 4.2 Servicio: `lib/services/order-formatter.ts`

**Archivo nuevo**: Formateadores para datos de pedidos.

```typescript
import type { OrderItem } from '@/lib/types/database'
import { formatPrice } from '@/lib/utils'

/**
 * Convierte items del carrito al formato de OrderItem
 */
export function formatCartItemsForOrder(cartItems: any[]): OrderItem[] {
  return cartItems.map((item) => ({
    productId: item.product.id,
    productName: item.product.name,
    quantity: item.quantity,
    price: item.product.price,
    subtotal: item.product.price * item.quantity,
  }))
}

/**
 * Genera string legible de items para mensajes
 */
export function formatOrderItemsText(items: OrderItem[]): string {
  return items
    .map(
      (item) =>
        `• ${item.quantity}x ${item.productName} - ${formatPrice(item.subtotal)}`
    )
    .join('\n')
}

/**
 * Parsea items de JSON a OrderItem[]
 */
export function parseOrderItems(itemsJson: any): OrderItem[] {
  if (Array.isArray(itemsJson)) {
    return itemsJson as OrderItem[]
  }
  return []
}

/**
 * Calcula subtotal de items
 */
export function calculateItemsSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0)
}
```

---

## PASO 5: COMPONENTES UI

### 5.1 Componente: Order Status Badge

**Archivo**: `components/admin/orders/order-status-badge.tsx`

```typescript
'use client'

import { Badge } from '@/components/ui/badge'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types/orders'
import type { OrderStatus } from '@/lib/types/database'

interface OrderStatusBadgeProps {
  status: OrderStatus
  onClick?: () => void
  className?: string
}

export function OrderStatusBadge({
  status,
  onClick,
  className,
}: OrderStatusBadgeProps) {
  const label = ORDER_STATUS_LABELS[status]
  const colorClass = ORDER_STATUS_COLORS[status]

  return (
    <Badge
      variant="outline"
      className={`${colorClass} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className || ''}`}
      onClick={onClick}
    >
      {label}
    </Badge>
  )
}
```

### 5.2 Componente: Change Status Dialog

**Archivo**: `components/admin/orders/change-status-dialog.tsx`

```typescript
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ORDER_STATUS_LABELS } from '@/lib/types/orders'
import type { OrderStatus } from '@/lib/types/database'
import { toast } from 'sonner'
import { updateOrderStatus } from '@/app/actions/orders'
import { Loader2 } from 'lucide-react'

interface ChangeStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  currentStatus: OrderStatus
  onSuccess?: () => void
}

const STATUSES: OrderStatus[] = ['recibido', 'pagado', 'entregado', 'cancelado']

export function ChangeStatusDialog({
  open,
  onOpenChange,
  orderId,
  currentStatus,
  onSuccess,
}: ChangeStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(currentStatus)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (selectedStatus === currentStatus) {
      toast.info('No hay cambios para guardar')
      return
    }

    setIsLoading(true)
    const { data, error } = await updateOrderStatus(orderId, selectedStatus)

    if (error) {
      toast.error(error)
    } else {
      toast.success('Estado actualizado correctamente')
      onOpenChange(false)
      onSuccess?.()
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar Estado del Pedido</DialogTitle>
          <DialogDescription>
            Selecciona el nuevo estado para este pedido
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value as OrderStatus)}
          >
            {STATUSES.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <RadioGroupItem value={status} id={status} />
                <Label htmlFor={status} className="cursor-pointer">
                  {ORDER_STATUS_LABELS[status]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 5.3 Componente: Order Details Drawer

**Archivo**: `components/admin/orders/order-details-drawer.tsx`

```typescript
'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from './order-status-badge'
import { formatPrice } from '@/lib/utils'
import { formatOrderItemsText, parseOrderItems } from '@/lib/services/order-formatter'
import { PAYMENT_METHOD_LABELS } from '@/lib/types/orders'
import type { OrderWithZone } from '@/lib/types/database'
import { MapPin, Phone, User, FileText, CreditCard, Package } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { ChangeStatusDialog } from './change-status-dialog'

interface OrderDetailsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: OrderWithZone | null
  onStatusChanged?: () => void
}

export function OrderDetailsDrawer({
  open,
  onOpenChange,
  order,
  onStatusChanged,
}: OrderDetailsDrawerProps) {
  const [showStatusDialog, setShowStatusDialog] = useState(false)

  if (!order) return null

  const items = parseOrderItems(order.items)
  const coordinates = order.customer_coordinates as { lat: number; lng: number } | null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Pedido #{order.id.slice(0, 8)}</span>
              <OrderStatusBadge
                status={order.status}
                onClick={() => setShowStatusDialog(true)}
              />
            </SheetTitle>
            <SheetDescription>
              {format(new Date(order.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                locale: es,
              })}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
            {/* Cliente */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-sm text-slate-500 uppercase">
                Información del Cliente
              </h3>

              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-sm text-slate-500">Nombre</p>
                  <p className="font-medium">{order.customer_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-sm text-slate-500">Teléfono</p>
                  <p className="font-medium">{order.customer_phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-slate-400 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-slate-500">Dirección</p>
                  <p className="font-medium">{order.customer_address}</p>
                  {order.delivery_zones && (
                    <p className="text-xs text-blue-600 mt-1">
                      Zona: {order.delivery_zones.name}
                    </p>
                  )}
                  {coordinates && (
                    <a
                      href={`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      Ver en Google Maps
                    </a>
                  )}
                </div>
              </div>

              {order.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-slate-400 mt-1" />
                  <div>
                    <p className="text-sm text-slate-500">Notas</p>
                    <p className="font-medium">{order.notes}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Pedido */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-sm text-slate-500 uppercase">
                Detalle del Pedido
              </h3>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">
                        {item.quantity}x {item.productName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatPrice(item.price)} c/u
                      </p>
                    </div>
                    <p className="font-semibold">{formatPrice(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Totales */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">
                  {formatPrice(order.total - order.shipping_cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Envío</span>
                <span className="font-medium">
                  {order.shipping_cost === 0
                    ? 'Gratis'
                    : formatPrice(order.shipping_cost)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold">{formatPrice(order.total)}</span>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Pago */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-500 uppercase">
                Método de Pago
              </h3>
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-slate-400" />
                <span className="font-medium">
                  {PAYMENT_METHOD_LABELS[order.payment_method]}
                </span>
              </div>
            </div>
          </ScrollArea>

          <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-white">
            <Button
              onClick={() => setShowStatusDialog(true)}
              className="w-full"
            >
              Cambiar Estado
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ChangeStatusDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        orderId={order.id}
        currentStatus={order.status}
        onSuccess={() => {
          onStatusChanged?.()
          onOpenChange(false)
        }}
      />
    </>
  )
}
```

### 5.4 Componente: Stats Card

**Archivo**: `components/admin/dashboard/stats-card.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  isPrice?: boolean
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-slate-600',
  isPrice = false,
}: StatsCardProps) {
  const displayValue = isPrice && typeof value === 'number'
    ? formatPrice(value)
    : value

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}
```

### 5.5 Componente: Sales Chart

**Archivo**: `components/admin/dashboard/sales-chart.tsx`

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { SalesChartData } from '@/lib/types/orders'
import { formatPrice } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface SalesChartProps {
  data: SalesChartData[]
}

export function SalesChart({ data }: SalesChartProps) {
  // Formatear datos para el gráfico
  const chartData = data.map((item) => ({
    ...item,
    date: format(new Date(item.date), 'dd MMM', { locale: es }),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas de los Últimos 7 Días</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
              formatter={(value: any, name: string) => {
                if (name === 'revenue') {
                  return [formatPrice(value), 'Ingresos']
                }
                return [value, 'Pedidos']
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#f97316"
              strokeWidth={2}
              name="Ingresos"
              dot={{ fill: '#f97316' }}
            />
            <Line
              type="monotone"
              dataKey="orders"
              stroke="#0ea5e9"
              strokeWidth={2}
              name="Pedidos"
              dot={{ fill: '#0ea5e9' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

### 5.6 Componente: Top Products Table

**Archivo**: `components/admin/dashboard/top-products-table.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TopProduct } from '@/lib/types/orders'
import { formatPrice } from '@/lib/utils'
import { Package } from 'lucide-react'

interface TopProductsTableProps {
  products: TopProduct[]
}

export function TopProductsTable({ products }: TopProductsTableProps) {
  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Productos Más Vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <Package className="h-12 w-12 mb-2 opacity-50" />
            <p>No hay datos de ventas aún</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos Más Vendidos (Último Mes)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Ingresos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {product.productName}
                </TableCell>
                <TableCell className="text-right">
                  {product.quantity}
                </TableCell>
                <TableCell className="text-right">
                  {formatPrice(product.revenue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

---

## PASO 6: PÁGINAS DEL ADMIN

### 6.1 Página: Dashboard Principal (actualizada)

**Archivo**: `app/admin/dashboard/page.tsx` (modificar existente)

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardOverview } from './dashboard-overview'
import { getDashboardStats, getSalesChartData, getTopProducts } from '@/app/actions/dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  // Cargar datos en paralelo
  const [statsResult, chartResult, topProductsResult] = await Promise.all([
    getDashboardStats(),
    getSalesChartData(),
    getTopProducts(),
  ])

  return (
    <DashboardOverview
      stats={statsResult.data}
      chartData={chartResult.data || []}
      topProducts={topProductsResult.data || []}
    />
  )
}
```

### 6.2 Componente: Dashboard Overview

**Archivo**: `app/admin/dashboard/dashboard-overview.tsx`

```typescript
'use client'

import { StatsCard } from '@/components/admin/dashboard/stats-card'
import { SalesChart } from '@/components/admin/dashboard/sales-chart'
import { TopProductsTable } from '@/components/admin/dashboard/top-products-table'
import type { DashboardStats, SalesChartData, TopProduct } from '@/lib/types/orders'
import { DollarSign, ShoppingCart, TrendingUp, Package } from 'lucide-react'

interface DashboardOverviewProps {
  stats: DashboardStats | null
  chartData: SalesChartData[]
  topProducts: TopProduct[]
}

export function DashboardOverview({
  stats,
  chartData,
  topProducts,
}: DashboardOverviewProps) {
  if (!stats) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Error al cargar estadísticas</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-2">
          Resumen de ventas y estadísticas del negocio
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ventas Hoy"
          value={stats.today.revenue}
          subtitle={`${stats.today.orders} pedidos`}
          icon={DollarSign}
          iconColor="text-green-600"
          isPrice
        />
        <StatsCard
          title="Ventas Semana"
          value={stats.week.revenue}
          subtitle={`${stats.week.orders} pedidos`}
          icon={TrendingUp}
          iconColor="text-blue-600"
          isPrice
        />
        <StatsCard
          title="Ventas Mes"
          value={stats.month.revenue}
          subtitle={`${stats.month.orders} pedidos`}
          icon={ShoppingCart}
          iconColor="text-orange-600"
          isPrice
        />
        <StatsCard
          title="Ticket Promedio"
          value={stats.averageTicket}
          subtitle="Último mes"
          icon={Package}
          iconColor="text-purple-600"
          isPrice
        />
      </div>

      {/* Sales Chart */}
      <SalesChart data={chartData} />

      {/* Top Products */}
      <TopProductsTable products={topProducts} />
    </div>
  )
}
```

### 6.3 Página: Gestión de Pedidos

**Archivo**: `app/admin/orders/page.tsx`

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllOrders } from '@/app/actions/orders'
import { OrdersTable } from './orders-table'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  const { data: orders, error } = await getAllOrders()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-slate-500 mt-2">
          Gestiona todos los pedidos del negocio
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <OrdersTable initialOrders={orders || []} />
    </div>
  )
}
```

### 6.4 Componente: Orders Table

**Archivo**: `app/admin/orders/orders-table.tsx`

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
import { OrderDetailsDrawer } from '@/components/admin/orders/order-details-drawer'
import { ChangeStatusDialog } from '@/components/admin/orders/change-status-dialog'
import type { OrderWithZone, OrderStatus } from '@/lib/types/database'
import { formatPrice } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OrdersTableProps {
  initialOrders: OrderWithZone[]
}

export function OrdersTable({ initialOrders }: OrdersTableProps) {
  const router = useRouter()
  const [orders] = useState(initialOrders)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithZone | null>(null)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [orderToChangeStatus, setOrderToChangeStatus] = useState<OrderWithZone | null>(null)

  // Filtrar y buscar
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filtro por estado
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false
      }

      // Búsqueda por nombre, teléfono o ID
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          order.customer_name.toLowerCase().includes(query) ||
          order.customer_phone.includes(query) ||
          order.id.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [orders, statusFilter, searchQuery])

  const handleStatusClick = (order: OrderWithZone) => {
    setOrderToChangeStatus(order)
    setShowStatusDialog(true)
  }

  const handleViewDetails = (order: OrderWithZone) => {
    setSelectedOrder(order)
    setShowDetailsDrawer(true)
  }

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, teléfono o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="recibido">Recibido</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No se encontraron pedidos
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-xs text-slate-500">
                            {order.customer_phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatPrice(order.total)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge
                          status={order.status}
                          onClick={() => handleStatusClick(order)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer de detalles */}
      <OrderDetailsDrawer
        open={showDetailsDrawer}
        onOpenChange={setShowDetailsDrawer}
        order={selectedOrder}
        onStatusChanged={handleRefresh}
      />

      {/* Dialog de cambio de estado */}
      {orderToChangeStatus && (
        <ChangeStatusDialog
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          orderId={orderToChangeStatus.id}
          currentStatus={orderToChangeStatus.status}
          onSuccess={handleRefresh}
        />
      )}
    </>
  )
}
```

### 6.5 Actualizar Sidebar (agregar link a Orders)

**Archivo**: `components/admin/layout/admin-sidebar.tsx` (modificar)

Agregar el link de "Pedidos" en el sidebar:

```typescript
// Agregar en el array de navigation items:
{
  name: 'Pedidos',
  href: '/admin/orders',
  icon: ShoppingCart, // Importar de lucide-react
},
```

---

## PASO 7: INTEGRAR GUARDADO DE PEDIDOS EN CHECKOUT

### 7.1 Modificar `app/checkout/page.tsx`

**Modificaciones**:
1. Importar `createOrder` y `getBusinessSettings`
2. Validar horarios antes de permitir checkout
3. Guardar pedido en BD antes de abrir WhatsApp
4. Agregar mensaje de horarios si está cerrado

**Cambios específicos**:

```typescript
// 1. Agregar imports
import { createOrder } from '@/app/actions/orders'
import { getBusinessSettings } from '@/app/actions/business-settings'
import { formatCartItemsForOrder } from '@/lib/services/order-formatter'
import { checkBusinessStatus } from '@/lib/services/business-hours'
import { Clock, AlertCircle } from 'lucide-react'

// 2. Agregar estado para business settings
const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null)
const [businessStatus, setBusinessStatus] = useState<BusinessStatus | null>(null)

// 3. Cargar business settings al inicio (junto con zones)
useEffect(() => {
  async function loadBusinessSettings() {
    const { data, error } = await getBusinessSettings()
    if (data) {
      setBusinessSettings(data)
      const status = checkBusinessStatus(data)
      setBusinessStatus(status)
    }
  }
  loadBusinessSettings()
}, [])

// 4. Modificar handleCheckout para guardar en BD
const handleCheckout = async () => {
  // ... validaciones existentes ...

  // Validar horarios
  if (businessStatus && !businessStatus.isOpen) {
    toast.error(businessStatus.message || 'El negocio está cerrado')
    return
  }

  setIsLoading(true)

  try {
    // ... cálculo de shipping existente ...

    const total = subtotal + shipping

    // NUEVO: Formatear items para la orden
    const orderItems = formatCartItemsForOrder(items)

    // NUEVO: Guardar pedido en base de datos
    const { data: order, error: orderError } = await createOrder({
      total,
      items: orderItems,
      customer_name: deliveryData.name,
      customer_phone: deliveryData.phone,
      customer_address: deliveryData.apartment
        ? `${deliveryData.address}, ${deliveryData.apartment}`
        : deliveryData.address,
      customer_coordinates: deliveryData.coordinates || null,
      shipping_cost: shipping,
      delivery_zone_id: finalShippingResult.zone?.id || null,
      notes: deliveryData.notes || null,
      payment_method: paymentMethod,
    })

    if (orderError || !order) {
      toast.error('Error al guardar el pedido. Intenta nuevamente.')
      setIsLoading(false)
      return
    }

    // Generar mensaje de WhatsApp (código existente)
    // ... resto del código de WhatsApp ...

    // MODIFICAR: Incluir ID de pedido en mensaje de WhatsApp
    const message = encodeURIComponent(
      `🍔 *NUEVO PEDIDO - QUE COPADO*\n\n` +
        `*Pedido #${order.id.slice(0, 8)}*\n\n` +
        // ... resto del mensaje existente ...
    )

    window.open(whatsappUrl, '_blank')
    clearCart()
    toast.success('Pedido registrado y enviado!')
  } catch (error) {
    // ... manejo de errores existente ...
  } finally {
    setIsLoading(false)
  }
}

// 5. Agregar mensaje de horarios cerrados (antes del form)
{businessStatus && !businessStatus.isOpen && (
  <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
    <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
    <div>
      <p className="font-semibold text-amber-800">
        {businessStatus.message}
      </p>
      {businessStatus.nextOpenTime && (
        <p className="text-sm text-amber-700 mt-1">
          Próxima apertura: {businessStatus.nextOpenTime}
        </p>
      )}
    </div>
  </div>
)}
```

---

## PASO 8: VALIDACIÓN DE HORARIOS

### 8.1 Página de Configuración

**Archivo**: `app/admin/settings/page.tsx`

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBusinessSettings } from '@/app/actions/business-settings'
import { BusinessSettingsForm } from './business-settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  const { data: settings } = await getBusinessSettings()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-slate-500 mt-2">
          Gestiona los horarios y estado del negocio
        </p>
      </div>

      <BusinessSettingsForm settings={settings} />
    </div>
  )
}
```

### 8.2 Formulario de Configuración

**Archivo**: `app/admin/settings/business-settings-form.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import type { BusinessSettings } from '@/lib/types/database'
import { updateBusinessHours, toggleBusinessPause } from '@/app/actions/business-settings'
import { toast } from 'sonner'
import { Loader2, Clock, PauseCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BusinessSettingsFormProps {
  settings: BusinessSettings | null
}

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

export function BusinessSettingsForm({ settings }: BusinessSettingsFormProps) {
  const router = useRouter()
  const [isLoadingHours, setIsLoadingHours] = useState(false)
  const [isLoadingPause, setIsLoadingPause] = useState(false)

  const [operatingDays, setOperatingDays] = useState<number[]>(
    settings?.operating_days || [1, 2, 3, 4, 5, 6]
  )
  const [openingTime, setOpeningTime] = useState(settings?.opening_time || '10:00')
  const [closingTime, setClosingTime] = useState(settings?.closing_time || '23:00')
  const [isPaused, setIsPaused] = useState(settings?.is_paused || false)
  const [pauseMessage, setPauseMessage] = useState(
    settings?.pause_message || 'Estamos cerrados temporalmente. Volvemos pronto!'
  )

  const handleDayToggle = (day: number) => {
    setOperatingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSaveHours = async () => {
    if (operatingDays.length === 0) {
      toast.error('Debe seleccionar al menos un día de operación')
      return
    }

    setIsLoadingHours(true)
    const { error } = await updateBusinessHours({
      operating_days: operatingDays,
      opening_time: openingTime,
      closing_time: closingTime,
    })

    if (error) {
      toast.error(error)
    } else {
      toast.success('Horarios actualizados correctamente')
      router.refresh()
    }
    setIsLoadingHours(false)
  }

  const handleTogglePause = async () => {
    setIsLoadingPause(true)
    const newPausedState = !isPaused

    const { error } = await toggleBusinessPause(newPausedState, pauseMessage)

    if (error) {
      toast.error(error)
    } else {
      setIsPaused(newPausedState)
      toast.success(
        newPausedState ? 'Pedidos pausados' : 'Pedidos reanudados'
      )
      router.refresh()
    }
    setIsLoadingPause(false)
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-slate-500 text-center">Error al cargar configuración</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6">
      {/* Horarios de Operación */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Horarios de Operación</CardTitle>
          </div>
          <CardDescription>
            Configura los días y horarios en los que aceptas pedidos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Días */}
          <div>
            <Label className="mb-3 block">Días de operación</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAYS.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={operatingDays.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <Label
                    htmlFor={`day-${day.value}`}
                    className="cursor-pointer font-normal"
                  >
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="opening-time">Hora de apertura</Label>
              <Input
                id="opening-time"
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="closing-time">Hora de cierre</Label>
              <Input
                id="closing-time"
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <Button onClick={handleSaveHours} disabled={isLoadingHours}>
            {isLoadingHours && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Horarios
          </Button>
        </CardContent>
      </Card>

      {/* Pausa Manual */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5" />
            <CardTitle>Pausa Manual de Pedidos</CardTitle>
          </div>
          <CardDescription>
            Activa esta opción para pausar temporalmente los pedidos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Pausar pedidos</p>
              <p className="text-sm text-slate-500">
                {isPaused ? 'Los pedidos están pausados' : 'Los pedidos están activos'}
              </p>
            </div>
            <Switch
              checked={isPaused}
              onCheckedChange={handleTogglePause}
              disabled={isLoadingPause}
            />
          </div>

          <div>
            <Label htmlFor="pause-message">Mensaje cuando está pausado</Label>
            <Textarea
              id="pause-message"
              value={pauseMessage}
              onChange={(e) => setPauseMessage(e.target.value)}
              className="mt-1.5"
              rows={3}
              placeholder="Estamos cerrados temporalmente..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 8.3 Actualizar Sidebar (agregar Settings)

Agregar en el sidebar:

```typescript
{
  name: 'Configuración',
  href: '/admin/settings',
  icon: Settings, // Importar de lucide-react
},
```

---

## PASO 9: TESTING Y VALIDACIÓN

### 9.1 Checklist de Testing

**Base de Datos:**
- [ ] Migraciones aplicadas correctamente
- [ ] RLS policies funcionando (admin puede leer/escribir, anon puede crear)
- [ ] Singleton de business_settings funciona (no se pueden crear múltiples filas)
- [ ] Índices creados (verificar performance de queries)

**Server Actions:**
- [ ] `createOrder` crea pedidos con todos los campos
- [ ] `getAllOrders` requiere auth y devuelve órdenes con zonas
- [ ] `updateOrderStatus` actualiza y revalida paths
- [ ] `getBusinessSettings` es accesible públicamente
- [ ] `updateBusinessHours` valida formatos de tiempo
- [ ] `getDashboardStats` calcula correctamente por períodos

**Checkout:**
- [ ] Valida horarios antes de permitir checkout
- [ ] Guarda pedido en BD antes de abrir WhatsApp
- [ ] Mensaje de WhatsApp incluye ID de pedido
- [ ] Muestra mensaje si negocio está cerrado/pausado
- [ ] Maneja error si falla guardado de pedido

**Admin - Dashboard:**
- [ ] Stats cards muestran datos correctos
- [ ] Gráfico de ventas muestra últimos 7 días
- [ ] Top productos ordena por cantidad correctamente
- [ ] Formato de precios correcto en toda la UI

**Admin - Pedidos:**
- [ ] Tabla muestra todos los pedidos
- [ ] Filtros por estado funcionan
- [ ] Búsqueda por nombre/teléfono/ID funciona
- [ ] Click en badge abre dialog de cambio de estado
- [ ] Drawer de detalles muestra toda la info
- [ ] Cambio de estado refresca la página
- [ ] Link a Google Maps funciona si hay coordenadas

**Admin - Configuración:**
- [ ] Muestra horarios actuales
- [ ] Validación de días (al menos 1 seleccionado)
- [ ] Validación de formato de hora
- [ ] Switch de pausa funciona
- [ ] Mensaje de pausa se puede editar
- [ ] Cambios se reflejan en checkout inmediatamente

### 9.2 Script de Testing Manual

**Archivo**: `docs/TESTING_FASE_1.md`

```markdown
# Testing Manual - Fase 1

## Setup Inicial
1. Verificar que migraciones están aplicadas en Supabase
2. Verificar variables de entorno en `.env.local`
3. Instalar dependencia nueva: `npm install recharts`

## Flujo 1: Checkout → Pedido en BD

1. Agregar productos al carrito
2. Ir a checkout
3. Completar formulario con datos válidos
4. Seleccionar dirección con coordenadas (mapa)
5. Verificar que muestra zona de delivery y costo
6. Seleccionar método de pago
7. Click en "Realizar Pedido"
8. Verificar:
   - Toast de éxito
   - WhatsApp se abre con mensaje
   - Mensaje incluye #ID del pedido
   - Carrito se limpia

**Verificación en Supabase:**
- Ir a Table Editor → orders
- Verificar que existe una nueva fila con:
  - Status: "recibido"
  - Todos los campos completos
  - Items en formato JSON correcto
  - Coordenadas guardadas

## Flujo 2: Admin Dashboard

1. Login en `/admin/login`
2. Ir a Dashboard
3. Verificar:
   - 4 cards de stats con datos correctos
   - Gráfico de ventas muestra últimos 7 días
   - Tabla de top productos (si hay datos)
   - Formato de precios correcto (ARS)

## Flujo 3: Gestión de Pedidos

1. En admin, ir a "Pedidos"
2. Verificar tabla muestra todos los pedidos
3. Probar filtro por estado (seleccionar "Recibido")
4. Probar búsqueda por nombre
5. Click en badge de estado:
   - Debe abrir dialog
   - Seleccionar "Pagado"
   - Guardar
   - Verificar que badge cambia
6. Click en "Ver":
   - Abre drawer lateral
   - Muestra toda la info del pedido
   - Link de Google Maps funciona
   - Botón "Cambiar Estado" funciona
7. Cambiar a "Entregado"
8. Verificar que stats en dashboard se actualizan

## Flujo 4: Horarios y Pausas

1. En admin, ir a "Configuración"
2. Cambiar días de operación (desmarcar Domingo)
3. Cambiar horarios (ej: 11:00 - 22:00)
4. Guardar
5. Activar pausa manual
6. Verificar en checkout:
   - Mensaje de "pausado" se muestra
   - Botón de checkout está deshabilitado
7. Volver a configuración y desactivar pausa
8. Cambiar horario de apertura a una hora futura
9. Verificar en checkout que muestra mensaje "Abrimos hoy a las..."

## Flujo 5: Edge Cases

1. Crear pedido fuera de cobertura:
   - Seleccionar ubicación fuera de zonas
   - Verificar mensaje de error
   - Checkout debe estar bloqueado
2. Intentar checkout con carrito vacío:
   - Debe redirigir a página "carrito vacío"
3. Intentar acceder a /admin/orders sin login:
   - Debe redirigir a login
4. Crear pedido sin zona configurada:
   - Eliminar todas las zonas
   - Hacer checkout
   - Debe usar costo estándar
   - delivery_zone_id debe ser null

## Verificaciones de Performance

1. Admin dashboard carga en < 2 segundos
2. Tabla de pedidos con 50+ órdenes sigue siendo responsiva
3. Filtros de búsqueda responden instantáneamente
4. Gráficos se renderizan suavemente
```

---

## ORDEN DE IMPLEMENTACIÓN

### Fase A: Base de Datos (1-2 horas)
1. Crear archivos de migration en `supabase/migrations/`
2. Aplicar migrations en Supabase Dashboard
3. Verificar tablas y RLS policies
4. Probar inserción manual de datos de prueba

### Fase B: Tipos y Servicios (1 hora)
1. Actualizar `lib/types/database.ts`
2. Crear `lib/types/orders.ts`
3. Crear servicios en `lib/services/`:
   - `business-hours.ts`
   - `order-formatter.ts`

### Fase C: Server Actions (2 horas)
1. Crear `app/actions/orders.ts`
2. Crear `app/actions/business-settings.ts`
3. Crear `app/actions/dashboard.ts`
4. Probar cada action individualmente

### Fase D: Componentes UI (3-4 horas)
1. Instalar Recharts: `npm install recharts`
2. Crear componentes en `components/admin/orders/`:
   - `order-status-badge.tsx`
   - `change-status-dialog.tsx`
   - `order-details-drawer.tsx`
3. Crear componentes en `components/admin/dashboard/`:
   - `stats-card.tsx`
   - `sales-chart.tsx`
   - `top-products-table.tsx`

### Fase E: Páginas Admin (2-3 horas)
1. Actualizar `app/admin/dashboard/page.tsx`
2. Crear `app/admin/dashboard/dashboard-overview.tsx`
3. Crear `app/admin/orders/page.tsx`
4. Crear `app/admin/orders/orders-table.tsx`
5. Crear `app/admin/settings/page.tsx`
6. Crear `app/admin/settings/business-settings-form.tsx`
7. Actualizar sidebar con nuevos links

### Fase F: Integración Checkout (1-2 horas)
1. Modificar `app/checkout/page.tsx`
2. Agregar validación de horarios
3. Agregar guardado de pedido antes de WhatsApp
4. Agregar mensaje de horarios cerrados
5. Testing del flujo completo

### Fase G: Testing (2-3 horas)
1. Testing manual según checklist
2. Verificar cada flujo
3. Probar edge cases
4. Ajustes y correcciones

**Tiempo total estimado: 12-17 horas**

---

## CHECKLIST DE ENTREGABLES

### Base de Datos
- [ ] Migration 001: Actualizar tabla orders
- [ ] Migration 002: Crear tabla business_settings
- [ ] Migration 003: RLS policies
- [ ] Verificación de índices y constraints

### Tipos TypeScript
- [ ] `lib/types/database.ts` actualizado
- [ ] `lib/types/orders.ts` creado
- [ ] Todos los tipos exportados correctamente

### Server Actions
- [ ] `app/actions/orders.ts` (7 funciones)
- [ ] `app/actions/business-settings.ts` (3 funciones)
- [ ] `app/actions/dashboard.ts` (3 funciones)

### Servicios
- [ ] `lib/services/business-hours.ts`
- [ ] `lib/services/order-formatter.ts`

### Componentes UI
- [ ] `components/admin/orders/order-status-badge.tsx`
- [ ] `components/admin/orders/change-status-dialog.tsx`
- [ ] `components/admin/orders/order-details-drawer.tsx`
- [ ] `components/admin/dashboard/stats-card.tsx`
- [ ] `components/admin/dashboard/sales-chart.tsx`
- [ ] `components/admin/dashboard/top-products-table.tsx`

### Páginas Admin
- [ ] `app/admin/dashboard/page.tsx` (actualizado)
- [ ] `app/admin/dashboard/dashboard-overview.tsx`
- [ ] `app/admin/orders/page.tsx`
- [ ] `app/admin/orders/orders-table.tsx`
- [ ] `app/admin/settings/page.tsx`
- [ ] `app/admin/settings/business-settings-form.tsx`
- [ ] Sidebar actualizado con nuevos links

### Integración Checkout
- [ ] `app/checkout/page.tsx` modificado
- [ ] Validación de horarios implementada
- [ ] Guardado de pedidos funcionando
- [ ] Mensaje de horarios en UI

### Documentación
- [ ] `docs/FASE_1_PLAN.md` (este documento)
- [ ] `docs/TESTING_FASE_1.md`
- [ ] Comentarios en código completos

### Testing
- [ ] Todos los flujos principales probados
- [ ] Edge cases verificados
- [ ] Performance validada
- [ ] RLS policies verificadas

---

## CONSIDERACIONES IMPORTANTES

### Seguridad
- Las policies RLS permiten que anon cree orders (necesario para checkout público)
- Solo admin autenticado puede leer/actualizar orders
- Business settings es público para lectura (necesario para validar horarios en checkout)
- Validación de inputs en todos los server actions
- No exponer detalles de errores al cliente

### Performance
- Índices en orders por status, created_at, zone_id
- Queries optimizadas con selects específicos
- Server Components para evitar hydration de datos grandes
- Memoización en filtros de tabla de pedidos

### UX
- Loading states en todos los componentes interactivos
- Toasts para feedback inmediato
- Drawer lateral para detalles (no modal blocking)
- Badges clickeables para cambio rápido de estado
- Búsqueda y filtros instantáneos

### Escalabilidad
- Estructura preparada para agregar más estados en el futuro
- Dashboard stats pueden extenderse fácilmente
- Sistema de filtros extensible
- Diseño de BD permite agregar más campos sin romper nada

### Mantenibilidad
- Separación clara de responsabilidades
- Server Actions para toda la lógica de backend
- Servicios reutilizables
- Componentes atómicos y composables
- Tipos fuertes en toda la aplicación

---

## PRÓXIMOS PASOS (POST FASE 1)

Una vez completada la Fase 1, se pueden agregar:

1. **Notificaciones**:
   - Email al admin cuando llega nuevo pedido
   - SMS/WhatsApp al cliente cuando cambia estado

2. **Reportes avanzados**:
   - Exportar pedidos a Excel
   - Gráficos de productos más vendidos por período
   - Análisis de zonas de delivery

3. **Gestión de inventario**:
   - Stock automático al crear pedido
   - Alertas de stock bajo

4. **Integraciones de pago**:
   - Mercado Pago checkout online
   - Tracking de pagos

5. **Sistema de usuarios**:
   - Multiple roles (admin, delivery, cocina)
   - Permisos granulares

---

**FIN DEL PLAN DE IMPLEMENTACIÓN FASE 1**
