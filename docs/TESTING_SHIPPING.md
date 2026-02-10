# Guía de Testing - Sistema de Shipping por Zonas

## Configuración Inicial

### 1. Crear Zonas de Prueba

Acceder al panel admin: `/admin/delivery-zones`

#### Zona 1: Centro (Envío Económico)
```json
Nombre: Centro
Costo de envío: 1000 (ARS)
Umbral envío gratis: 15000 (ARS)
Color: #FF6B00 (Naranja)
```

**Coordenadas de ejemplo (San Fernando del Valle de Catamarca - Centro):**
```
Punto 1: -28.460, -65.790
Punto 2: -28.460, -65.770
Punto 3: -28.480, -65.770
Punto 4: -28.480, -65.790
```

#### Zona 2: Zona Norte (Envío Estándar)
```json
Nombre: Zona Norte
Costo de envío: 1500 (ARS)
Umbral envío gratis: 20000 (ARS)
Color: #3B82F6 (Azul)
```

#### Zona 3: Zona Sur (Envío Premium)
```json
Nombre: Zona Sur
Costo de envío: 2000 (ARS)
Umbral envío gratis: null (sin envío gratis)
Color: #8B5CF6 (Púrpura)
```

### 2. Verificar Datos en Supabase

```sql
-- Ver todas las zonas
SELECT id, name, shipping_cost, free_shipping_threshold, is_active
FROM delivery_zones
ORDER BY sort_order;

-- Ver polígonos
SELECT name, polygon
FROM delivery_zones;
```

## Casos de Prueba

### Test 1: Dentro de Zona con Envío Pago

**Setup:**
- Crear pedido con subtotal: $10,000 ARS
- Seleccionar dirección en Centro

**Pasos:**
1. Ir a `/checkout`
2. Agregar productos al carrito (total $10,000)
3. Ingresar dirección en la zona Centro
4. Observar el indicador de zona

**Resultado Esperado:**
```
✅ Zona detectada: Centro
✅ Costo de envío: $1,000
✅ Total: $11,000
✅ Mensaje: "Envío a Centro"
```

**Screenshot UI:**
```
┌─────────────────────────────────────┐
│ 🟠 Zona: Centro                     │
│ 🚚 Envío: $1,000                    │
└─────────────────────────────────────┘
```

### Test 2: Envío Gratis por Umbral

**Setup:**
- Crear pedido con subtotal: $16,000 ARS (> $15,000)
- Seleccionar dirección en Centro

**Pasos:**
1. Agregar productos al carrito (total $16,000)
2. Ingresar dirección en Centro
3. Verificar que el envío sea gratis

**Resultado Esperado:**
```
✅ Zona detectada: Centro
✅ Costo de envío: Gratis (✓)
✅ Total: $16,000
✅ Mensaje: "Envío gratis en zona Centro"
```

**Screenshot UI:**
```
┌─────────────────────────────────────┐
│ 🟠 Zona: Centro                     │
│ ✅ Envío gratis                     │
└─────────────────────────────────────┘
```

### Test 3: Fuera de Cobertura

**Setup:**
- Seleccionar dirección fuera de todas las zonas

**Pasos:**
1. Ingresar coordenadas fuera de zonas: `-34.0, -64.0` (Buenos Aires)
2. Observar indicador de zona

**Resultado Esperado:**
```
⚠️ Sin cobertura
⚠️ Botón de checkout DESHABILITADO
⚠️ Mensaje de alerta visible
⚠️ Link a WhatsApp para contacto
```

**Screenshot UI:**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Tu ubicación está fuera de nuestra zona de cobertura│
│                                                          │
│ No podemos realizar envíos a esta dirección.            │
│ Contactanos por WhatsApp para coordinar.                │
│                                                          │
│ 💬 Contactar por WhatsApp                               │
└─────────────────────────────────────────────────────────┘

[Pedir por WhatsApp] ← DESHABILITADO
```

### Test 4: Cambio de Zona (Drag Marker)

**Setup:**
- Seleccionar dirección en Zona Centro
- Arrastrar marcador a Zona Norte

**Pasos:**
1. Ingresar dirección en Centro
2. Verificar zona: "Centro" - $1,000
3. Arrastrar marcador del mapa a Zona Norte
4. Observar cambio automático

**Resultado Esperado:**
```
Antes:
  🟠 Centro - $1,000

Después:
  🔵 Zona Norte - $1,500

Total actualizado automáticamente
```

### Test 5: Loading States

**Setup:**
- Verificar estados de carga

**Pasos:**
1. Seleccionar dirección con coordenadas
2. Observar el estado de "Calculando..."

**Resultado Esperado:**
```
Durante 300ms:
┌─────────────────────────────────────┐
│ ⏳ Verificando zona de cobertura... │
└─────────────────────────────────────┘

Resumen:
Envío: Calculando... ⏳

Después:
Zona detectada con costo
```

### Test 6: Validación Server-Side en Checkout

**Setup:**
- Intentar manipular el shipping client-side (DevTools)

**Pasos:**
1. Abrir DevTools
2. Modificar `shippingResult.shippingCost = 0` manualmente
3. Hacer clic en "Pedir por WhatsApp"
4. Verificar que el servidor recalcula

**Resultado Esperado:**
```
✅ El mensaje de WhatsApp contiene el costo REAL (server-side)
✅ No se puede falsificar el costo de envío
```

### Test 7: Sin Zonas Configuradas

**Setup:**
- Desactivar todas las zonas (Admin → Toggle off)

**Pasos:**
1. Ir a checkout
2. Ingresar cualquier dirección

**Resultado Esperado:**
```
⚠️ Sin zonas configuradas
⚠️ isOutOfCoverage = true
⚠️ Checkout bloqueado
```

### Test 8: Múltiples Zonas Superpuestas (NO debería ocurrir)

**Setup:**
- Intentar crear zona que se superpone

**Pasos:**
1. Admin → Crear zona
2. Dibujar polígono que se superpone con "Centro"
3. Guardar

**Resultado Esperado:**
```
❌ Error: "La zona se superpone con 'Centro'"
❌ No se permite crear la zona
```

### Test 9: Mensaje de WhatsApp

**Setup:**
- Completar checkout con zona detectada

**Pasos:**
1. Agregar productos al carrito
2. Completar datos de entrega
3. Seleccionar dirección en "Centro"
4. Hacer clic en "Pedir por WhatsApp"
5. Copiar mensaje generado

**Resultado Esperado:**
```
🍔 NUEVO PEDIDO - QUE COPADO

Cliente: Juan Pérez
Teléfono: 11 2345-6789
Dirección: Av. Belgrano 123, Piso 2
Zona: Centro
📍 Ubicación: https://www.google.com/maps?q=-28.4696,-65.7795

PEDIDO:
• 2x Hamburguesa Clásica - $6,000
• 1x Papas Fritas - $2,000

Subtotal: $8,000
Envío: $1,000 (Centro)
TOTAL: $9,000

Método de pago: Efectivo

Enviado desde queCopado.com
```

### Test 10: Edge Cases

#### 10.1: Coordenadas en el Borde
```
Input: Coordenadas exactamente en el límite del polígono
Expected: Detecta la zona (Turf.js incluye bordes)
```

#### 10.2: Zona Inactiva
```
Setup: Marcar zona como inactiva
Input: Dirección en esa zona
Expected: isOutOfCoverage = true (zona no se considera)
```

#### 10.3: Sin Coordenadas
```
Setup: Solo escribir dirección sin seleccionar del autocomplete
Input: Dirección sin coordenadas
Expected: Permite checkout, muestra advertencia
```

#### 10.4: Subtotal = Threshold Exacto
```
Setup: Subtotal = $15,000, threshold = $15,000
Expected: isFreeShipping = true (>= threshold)
```

## Validación de Datos

### Coordenadas Válidas

```typescript
// ✅ Válido: San Fernando del Valle de Catamarca
{ lat: -28.4696, lng: -65.7795 }

// ✅ Válido: Buenos Aires
{ lat: -34.6037, lng: -58.3816 }

// ❌ Inválido: lat fuera de rango
{ lat: 100, lng: -65.7795 }

// ❌ Inválido: lng fuera de rango
{ lat: -28.4696, lng: 200 }
```

### Formato de Polígono

```json
// ✅ Válido
{
  "type": "Polygon",
  "coordinates": [
    [
      [-65.790, -28.460], // lng, lat
      [-65.770, -28.460],
      [-65.770, -28.480],
      [-65.790, -28.480],
      [-65.790, -28.460]  // cerrado (first = last)
    ]
  ]
}

// ❌ Inválido: lat, lng (orden incorrecto)
{
  "type": "Polygon",
  "coordinates": [
    [
      [-28.460, -65.790], // ¡INCORRECTO!
      ...
    ]
  ]
}

// ❌ Inválido: no está cerrado
{
  "type": "Polygon",
  "coordinates": [
    [
      [-65.790, -28.460],
      [-65.770, -28.460],
      [-65.770, -28.480]
      // Falta el punto de cierre
    ]
  ]
}
```

## Debugging

### Console Logs Útiles

```typescript
// En calculateShippingByZone (lib/services/shipping.ts)
console.log('Customer point:', { lat, lng })
console.log('Zones to check:', zones.length)
console.log('Found zone:', result.zone?.name)
console.log('Shipping cost:', result.shippingCost)
console.log('Is free shipping:', result.isFreeShipping)
```

### React DevTools

```
Componente: CheckoutPage
Props:
  - zones: DeliveryZone[] (length)
  - zonesLoaded: boolean
  - shippingResult: ShippingResult
  - isCalculatingShipping: boolean

Componente: DeliveryForm
Props:
  - shippingResult: verificar zone, shippingCost
  - hasZones: debe ser true si hay zonas

Componente: CheckoutSummary
Props:
  - shippingResult: mismo que DeliveryForm
  - isBlocked: debe ser true si isOutOfCoverage
```

### Network Tab

```
Request: POST /api/...?delivery-zones.getActiveDeliveryZones
Response:
  - data: Array de DeliveryZone
  - Verificar que is_active = true
  - Verificar sort_order

Request: POST /api/...?shipping.calculateShippingCost
Payload: { lat, lng, subtotal }
Response:
  - data: ShippingResult
  - Verificar zone no sea null si está en cobertura
```

## Errores Comunes

### 1. "Siempre dice fuera de cobertura"

**Causa:** Polígono mal formado (lat/lng invertido)

**Solución:**
```typescript
// INCORRECTO
coordinates: [[[lat, lng], ...]]

// CORRECTO
coordinates: [[[lng, lat], ...]]
```

### 2. "No detecta el cambio de coordenadas"

**Causa:** React no detecta el cambio de objeto

**Solución:**
```typescript
// INCORRECTO
data.coordinates.lat = newLat

// CORRECTO
onChange({
  ...data,
  coordinates: { lat: newLat, lng: newLng }
})
```

### 3. "Loading infinito"

**Causa:** No se actualiza isCalculatingShipping

**Solución:**
```typescript
useEffect(() => {
  // ...
  const timer = setTimeout(() => {
    setIsCalculatingShipping(false) // ¡Importante!
  }, 300)
  return () => clearTimeout(timer)
}, [...])
```

### 4. "Shipping cost es 0 cuando no debería"

**Causa:** Cálculo usa zona incorrecta o subtotal es string

**Solución:**
```typescript
const subtotal = getTotal() // debe ser number
console.log(typeof subtotal) // verificar
```

## Checklist de Testing Completo

- [ ] Carga de zonas activas en mount
- [ ] Cálculo correcto dentro de zona
- [ ] Cálculo correcto de envío gratis por umbral
- [ ] Detección de fuera de cobertura
- [ ] Bloqueo de checkout cuando fuera de cobertura
- [ ] Link a WhatsApp cuando fuera de cobertura
- [ ] Loading state al calcular (300ms)
- [ ] Actualización automática al mover marcador
- [ ] Validación server-side en checkout
- [ ] Mensaje de WhatsApp con zona correcta
- [ ] Mensaje de WhatsApp con costo correcto
- [ ] Prevención de superposición de zonas (admin)
- [ ] Manejo de errores (red, invalid data)
- [ ] Responsive en mobile
- [ ] Accesibilidad (keyboard navigation)

## Performance Benchmarks

**Target:**
- Carga de zonas: < 500ms
- Cálculo de shipping: < 50ms (client-side)
- Validación server-side: < 1s

**Medición:**
```typescript
console.time('loadZones')
const zones = await getActiveDeliveryZones()
console.timeEnd('loadZones')

console.time('calculateShipping')
const result = calculateShippingByZone(...)
console.timeEnd('calculateShipping')
```

## Conclusión

Todos los tests deben pasar para considerar el sistema de shipping como funcional. Priorizar los Tests 1-6 para validación básica, y 7-10 para edge cases y seguridad.
