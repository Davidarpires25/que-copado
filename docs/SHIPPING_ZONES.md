# Sistema de Zonas de Delivery

## Resumen

El sistema de zonas de delivery permite configurar áreas geográficas con costos de envío específicos y umbrales de envío gratis personalizados. Cuando un cliente selecciona una dirección en el checkout, el sistema:

1. Verifica si las coordenadas están dentro de alguna zona activa
2. Calcula el costo de envío según la zona detectada
3. Aplica envío gratis si el subtotal supera el umbral de la zona
4. Bloquea el pedido si la dirección está fuera de cobertura

## Arquitectura

### Base de Datos

**Tabla:** `delivery_zones`

```sql
- id: UUID (Primary Key)
- name: TEXT (Nombre de la zona, ej: "Centro", "Zona Norte")
- polygon: JSONB (Polígono en formato GeoJSON)
- shipping_cost: INTEGER (Costo de envío en ARS)
- color: TEXT (Color hex para visualización, ej: "#FF6B00")
- is_active: BOOLEAN (Si la zona está activa)
- sort_order: INTEGER (Orden de prioridad para verificación)
- free_shipping_threshold: INTEGER | NULL (Umbral para envío gratis)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**Row Level Security (RLS):**
- Lectura pública: Solo zonas activas (`is_active = true`)
- Gestión completa: Solo usuarios autenticados (admin)

### Componentes Clave

#### Server Actions

**`/app/actions/delivery-zones.ts`**
- `getDeliveryZones()` - Obtener todas las zonas (admin)
- `getActiveDeliveryZones()` - Obtener zonas activas (público)
- `createDeliveryZone()` - Crear nueva zona con validación de superposición
- `updateDeliveryZone()` - Actualizar zona existente
- `deleteDeliveryZone()` - Eliminar zona
- `toggleZoneActive()` - Activar/desactivar zona
- `reorderDeliveryZones()` - Reordenar prioridad de zonas

**`/app/actions/shipping.ts`**
- `calculateShippingCost()` - **SERVER-SIDE** cálculo seguro de envío
- `getShippingInfo()` - Obtener mensaje de envío formateado

#### Servicios

**`/lib/services/shipping.ts`**
- `calculateShippingByZone()` - Lógica de cálculo usando Turf.js
- `getShippingMessage()` - Mensajes user-friendly

#### UI Components

**`/app/checkout/page.tsx`**
- Página principal de checkout
- Carga zonas activas en el mount
- Calcula shipping client-side para feedback instantáneo
- Valida shipping server-side antes de confirmar pedido

**`/components/checkout/delivery-form.tsx`**
- Formulario de datos de entrega
- Selector de dirección con autocompletado
- Mapa interactivo para ajustar ubicación
- Indicador de zona detectada con costo de envío

**`/components/checkout/checkout-summary.tsx`**
- Resumen del pedido
- Muestra zona detectada y costo de envío
- Bloquea checkout si está fuera de cobertura

## Flujo de Funcionamiento

### 1. Carga Inicial (Checkout Mount)

```typescript
// app/checkout/page.tsx
useEffect(() => {
  async function loadZones() {
    const { data } = await getActiveDeliveryZones()
    if (data) setZones(data)
  }
  loadZones()
}, [])
```

### 2. Selección de Dirección

El usuario puede:
- Escribir y seleccionar de autocompletado (Google Places / Nominatim)
- Hacer clic en el mapa para marcar ubicación exacta
- Arrastrar el marcador para ajustar

Cuando se obtienen coordenadas:

```typescript
// components/checkout/delivery-form.tsx
const handleMapCoordinatesChange = (coords, address) => {
  onChange({
    ...data,
    coordinates: coords,
    address: address || data.address,
  })
}
```

### 3. Cálculo de Shipping (Client-Side)

**Ventaja:** Feedback instantáneo al usuario

```typescript
// app/checkout/page.tsx
useEffect(() => {
  if (!deliveryData.coordinates || zones.length === 0) {
    setShippingResult({ ...defaultOutOfCoverage })
    return
  }

  setIsCalculatingShipping(true)

  const result = calculateShippingByZone(
    deliveryData.coordinates.lat,
    deliveryData.coordinates.lng,
    subtotal,
    zones
  )

  setTimeout(() => {
    setShippingResult(result)
    setIsCalculatingShipping(false)
  }, 300)
}, [deliveryData.coordinates, zones, subtotal])
```

### 4. Lógica de Cálculo (Turf.js)

```typescript
// lib/services/shipping.ts
export function calculateShippingByZone(
  lat: number,
  lng: number,
  subtotal: number,
  zones: DeliveryZone[]
): ShippingResult {
  const customerPoint = point([lng, lat])

  for (const zone of zones) {
    if (!zone.is_active) continue

    const isInside = booleanPointInPolygon(customerPoint, {
      type: 'Polygon',
      coordinates: zone.polygon.coordinates,
    })

    if (isInside) {
      const isFreeShipping =
        zone.free_shipping_threshold !== null &&
        subtotal >= zone.free_shipping_threshold

      return {
        zone,
        shippingCost: isFreeShipping ? 0 : zone.shipping_cost,
        isFreeShipping,
        isOutOfCoverage: false,
      }
    }
  }

  return { ...outOfCoverage }
}
```

**Algoritmo:**
1. Convierte coordenadas del cliente a punto GeoJSON
2. Itera zonas en orden de `sort_order`
3. Verifica si el punto está dentro del polígono (Turf.js)
4. Primera zona que contiene el punto → calcula costo
5. Si ninguna zona contiene el punto → fuera de cobertura

### 5. Validación Server-Side (Checkout)

**Seguridad:** El servidor valida antes de generar el mensaje de WhatsApp

```typescript
// app/checkout/page.tsx - handleCheckout()
if (deliveryData.coordinates && zones.length > 0) {
  const { data: serverShippingResult, error } = await calculateShippingCost({
    lat: deliveryData.coordinates.lat,
    lng: deliveryData.coordinates.lng,
    subtotal,
  })

  if (serverShippingResult?.isOutOfCoverage) {
    toast.error('Tu ubicación está fuera de nuestra zona de cobertura')
    return
  }

  shipping = serverShippingResult.shippingCost
}
```

**Server Action:**

```typescript
// app/actions/shipping.ts
export async function calculateShippingCost(params) {
  // Validar input
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { data: null, error: 'Coordenadas inválidas' }
  }

  // Fetch zonas desde Supabase
  const { data: zones } = await getActiveDeliveryZones()

  // Calcular usando el mismo servicio
  const result = calculateShippingByZone(lat, lng, subtotal, zones)

  return { data: result, error: null }
}
```

### 6. Generación del Mensaje WhatsApp

```typescript
const zoneInfo = finalShippingResult.zone
  ? `\n*Zona:* ${finalShippingResult.zone.name}`
  : ''

let shippingLine = `*Envío:* `
if (finalShippingResult.isFreeShipping) {
  shippingLine += 'Gratis'
  if (finalShippingResult.zone) {
    shippingLine += ` (${finalShippingResult.zone.name})`
  }
} else {
  shippingLine += formatPrice(shipping)
  if (finalShippingResult.zone) {
    shippingLine += ` (${finalShippingResult.zone.name})`
  }
}
```

## UI/UX States

### Loading States

1. **Cargando zonas:**
   ```
   useEffect(() => {
     setZonesLoaded(false)
     await getActiveDeliveryZones()
     setZonesLoaded(true)
   }, [])
   ```

2. **Calculando shipping:**
   - Se muestra spinner en el indicador de zona
   - Se muestra "Calculando..." en el resumen
   - Duración: 300ms (para feedback visual)

### Estados de Cobertura

#### Sin Coordenadas
- No se muestra indicador de zona
- Botón de checkout habilitado (validación en submit)

#### Dentro de Zona
```tsx
<div style={{
  backgroundColor: `${zone.color}10`,
  borderColor: `${zone.color}40`
}}>
  <div style={{ backgroundColor: zone.color }} />
  <p>Zona: {zone.name}</p>
  {isFreeShipping ? (
    <span>✓ Envío gratis</span>
  ) : (
    <span>Envío: {formatPrice(shippingCost)}</span>
  )}
</div>
```

#### Fuera de Cobertura
```tsx
<div className="bg-amber-50 border-amber-200">
  <AlertTriangle />
  <p>Tu ubicación está fuera de nuestra zona de cobertura</p>
  <a href="whatsapp">Contactar por WhatsApp</a>
</div>
```

**Bloqueado:** El botón de checkout se deshabilita

## Gestión de Zonas (Admin)

### Crear/Editar Zona

1. Dibujar polígono en el mapa (Leaflet + Geoman)
2. Configurar datos:
   - Nombre de la zona
   - Costo de envío (en ARS)
   - Umbral de envío gratis (opcional)
   - Color de visualización
   - Orden de prioridad

3. Validaciones:
   - Polígono debe tener al menos 3 vértices
   - No puede superponerse con otras zonas
   - Campos requeridos no vacíos

### Validación de Superposición

```typescript
// app/actions/delivery-zones.ts
async function validateNoOverlap(polygon, excludeId?) {
  const existingZones = await fetchZones()
  const newPolygon = turfPolygon(polygon.coordinates)

  for (const zone of existingZones) {
    const existing = turfPolygon(zone.polygon.coordinates)

    if (booleanIntersects(newPolygon, existing)) {
      return {
        isValid: false,
        overlappingZone: zone.name
      }
    }
  }

  return { isValid: true }
}
```

## Tipos TypeScript

```typescript
// lib/types/database.ts

export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][] // [[[lng, lat], ...]]
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
```

## Manejo de Errores

### Client-Side

```typescript
try {
  const { data, error } = await getActiveDeliveryZones()
  if (error) {
    setZonesError(error)
    toast.error('Error al cargar zonas de delivery')
  }
} catch (error) {
  console.error('Error loading zones:', error)
  setZonesError('Error inesperado')
}
```

### Server-Side

```typescript
export async function calculateShippingCost(params) {
  try {
    // Validar input
    if (typeof lat !== 'number' || lat < -90 || lat > 90) {
      return { data: null, error: 'Coordenadas inválidas' }
    }

    // Fetch zones
    const { data: zones, error } = await getActiveDeliveryZones()
    if (error) {
      return { data: null, error: 'Error al cargar zonas' }
    }

    // Calculate
    const result = calculateShippingByZone(...)
    return { data: result, error: null }

  } catch (error) {
    console.error('Error calculating shipping:', error)
    return { data: null, error: 'Error al calcular envío' }
  }
}
```

## Optimizaciones

### 1. Memoization
- Zonas se cargan una vez en mount
- Shipping se calcula solo cuando cambian: coordenadas, zonas, subtotal

### 2. Client-Side First
- Cálculo client-side para feedback instantáneo
- Validación server-side solo al confirmar (seguridad)

### 3. Indexes en DB
```sql
CREATE INDEX idx_delivery_zones_is_active ON delivery_zones(is_active);
CREATE INDEX idx_delivery_zones_sort_order ON delivery_zones(sort_order);
```

### 4. RLS Policies
- Lectura pública: Solo zonas activas (reduce payload)
- Escritura: Solo admin

### 5. Loading States
- 300ms delay para mostrar feedback sin parpadeo excesivo
- Spinner solo si el cálculo tarda

## Testing

### Unit Tests (Recomendado)

```typescript
// lib/services/shipping.test.ts
describe('calculateShippingByZone', () => {
  it('should return zone shipping cost when inside zone', () => {
    const result = calculateShippingByZone(
      -28.4696, // lat
      -65.7795, // lng
      10000,    // subtotal
      mockZones
    )
    expect(result.isOutOfCoverage).toBe(false)
    expect(result.zone?.name).toBe('Centro')
    expect(result.shippingCost).toBe(1000)
  })

  it('should return free shipping when above threshold', () => {
    const result = calculateShippingByZone(
      -28.4696,
      -65.7795,
      20000, // above threshold
      mockZones
    )
    expect(result.isFreeShipping).toBe(true)
    expect(result.shippingCost).toBe(0)
  })

  it('should return out of coverage when outside all zones', () => {
    const result = calculateShippingByZone(
      -34.0, // Buenos Aires
      -64.0,
      10000,
      mockZones
    )
    expect(result.isOutOfCoverage).toBe(true)
    expect(result.zone).toBeNull()
  })
})
```

### Integration Tests

```typescript
// app/actions/shipping.test.ts
describe('calculateShippingCost', () => {
  it('should validate coordinates', async () => {
    const result = await calculateShippingCost({
      lat: 100, // invalid
      lng: 0,
      subtotal: 5000,
    })
    expect(result.error).toBe('Coordenadas inválidas')
  })
})
```

## Troubleshooting

### Problema: Zonas no se cargan

**Solución:**
1. Verificar que la tabla `delivery_zones` existe
2. Ejecutar migración: `/supabase/migrations/20240209_delivery_zones.sql`
3. Verificar RLS policies: `SELECT * FROM delivery_zones` (debería devolver solo activas)

### Problema: Siempre dice "fuera de cobertura"

**Solución:**
1. Verificar formato del polígono:
   ```json
   {
     "type": "Polygon",
     "coordinates": [
       [[lng, lat], [lng, lat], ...] // ¡LNG primero, LAT segundo!
     ]
   }
   ```
2. Verificar que el polígono está cerrado (primer punto = último punto)
3. Verificar que la zona está activa (`is_active = true`)

### Problema: Shipping siempre es gratis

**Solución:**
1. Verificar `free_shipping_threshold` de la zona
2. Si es `NULL`, no hay envío gratis automático
3. Si el subtotal supera el threshold, envío será gratis (comportamiento correcto)

## Mejoras Futuras

1. **Cache de zonas en localStorage**
   - Reducir llamadas a Supabase
   - Invalidar cache cuando se actualizan zonas

2. **Geofencing con Service Workers**
   - Detectar zona automáticamente usando ubicación del usuario
   - Notificaciones push cuando entre/salga de zona

3. **Analytics de zonas**
   - Tracking de cuántos pedidos por zona
   - Optimización de zonas según demanda

4. **Multi-zona**
   - Permitir que un punto esté en múltiples zonas
   - Elegir la zona con menor costo de envío

5. **Horarios por zona**
   - Diferentes costos según horario (noche, fines de semana)
   - Zonas activas/inactivas por horario

## Referencias

- [Turf.js Documentation](https://turfjs.org/)
- [GeoJSON Specification](https://geojson.org/)
- [Leaflet Geoman](https://geoman.io/leaflet-geoman)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
