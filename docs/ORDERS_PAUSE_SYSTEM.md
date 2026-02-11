# Sistema de Pausa de Pedidos

## Descripción General

El sistema de pausa de pedidos permite al administrador detener temporalmente la recepción de nuevos pedidos. Esto es útil para:

- Pausas por sobrecarga de pedidos
- Cierre temporal del negocio
- Mantenimiento o eventos especiales
- Horarios de operación configurados

## Arquitectura

### 1. Base de Datos

Tabla: `business_settings`

```sql
- is_paused: boolean (default: false)
- pause_message: text (mensaje personalizado para mostrar)
- operating_days: integer[] (días activos: 0-6, Dom-Sab)
- opening_time: text (formato HH:MM)
- closing_time: text (formato HH:MM)
```

### 2. Server Actions

#### `/app/actions/business-settings.ts`

**getBusinessSettings()**
- Obtiene la configuración actual del negocio
- Pública (no requiere autenticación)
- Retorna configuración por defecto si no existe

**toggleBusinessPause(isPaused, message?)**
- Activa/desactiva la pausa de pedidos
- Requiere autenticación (admin)
- Revalida `/admin/settings`, `/checkout`, `/`

**checkIfAcceptingOrders()**
- Verifica si el negocio está aceptando pedidos
- Pública (para checkout)
- Valida tanto la pausa manual como los horarios

#### `/app/actions/orders.ts`

**createOrder(data)**
- **VALIDACIÓN CRÍTICA**: Antes de crear la orden, verifica:
  1. Si el negocio está pausado manualmente (`is_paused`)
  2. Si el negocio está dentro del horario de operación
- Bloquea la creación si alguna validación falla
- Retorna error descriptivo al usuario

### 3. Cliente

#### `/app/checkout/page.tsx`

**Verificaciones al montar:**
```typescript
useEffect(() => {
  checkIfAcceptingOrders()
  // Actualiza: isAcceptingOrders, businessMessage
}, [])
```

**Validaciones en handleCheckout():**
1. Verifica `isAcceptingOrders` PRIMERO
2. Muestra toast con `businessMessage` si está bloqueado
3. Continúa con otras validaciones solo si puede aceptar pedidos

**UI Bloqueada:**
- Mensaje de advertencia rojo con icono de pausa
- Botón de checkout deshabilitado (`isBlocked={!isAcceptingOrders}`)
- Link a WhatsApp para consultas

### 4. Panel de Administración

#### `/app/admin/settings/business-settings-form.tsx`

**Toggle de Pausa:**
- Botón prominente para pausar/reanudar pedidos
- Estados visuales claros (verde/rojo)
- Feedback inmediato con toast

**Estado del Negocio:**
- Card con indicador visual (punto pulsante)
- Muestra si está "Abierto" o "Cerrado"
- Mensaje descriptivo del estado

## Flujo de Validación

### Cuando el Admin Pausa Pedidos

1. Admin hace clic en "Pausar Pedidos"
2. `toggleBusinessPause(true, message)` se ejecuta
3. Se actualiza `is_paused = true` en la BD
4. Se revalidan páginas (`/checkout`, `/admin/settings`, `/`)
5. Nuevos visitantes al checkout ven el mensaje de pausa

### Cuando un Usuario Intenta Hacer un Pedido

1. Usuario completa el formulario de checkout
2. Hace clic en "Pedir por WhatsApp"
3. **Validación Cliente:**
   - Verifica `isAcceptingOrders` (ya verificado al montar)
   - Si está pausado, muestra toast y retorna
4. **Validación Servidor:**
   - `createOrder()` llama a `getBusinessSettings()`
   - Ejecuta `checkBusinessStatus(settings)`
   - Si `isPaused=true` O `isOpen=false`, retorna error
   - Error se propaga al cliente con mensaje descriptivo

### Capas de Seguridad

```
┌─────────────────────────────────────┐
│   1. UI (Checkout Page)             │
│   - Deshabilita botón               │
│   - Muestra mensaje de advertencia  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   2. Validación Cliente (onClick)   │
│   - Verifica isAcceptingOrders      │
│   - Toast de error si pausado       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   3. Validación Servidor (createOrder)│
│   - Consulta business_settings      │
│   - checkBusinessStatus()           │
│   - Bloquea inserción en BD         │
└─────────────────────────────────────┘
```

## Servicios de Lógica de Negocio

### `/lib/services/business-hours.ts`

**checkBusinessStatus(settings, now?)**

Retorna:
```typescript
{
  isOpen: boolean      // ¿Está abierto ahora?
  isPaused: boolean    // ¿Pausa manual activa?
  message: string      // Mensaje descriptivo
  nextOpenTime?: string // Próxima apertura (si cerrado)
}
```

Lógica:
1. Si `is_paused = true` → Retorna `isPaused=true` con mensaje
2. Verifica día actual en `operating_days`
3. Verifica hora actual entre `opening_time` y `closing_time`
4. Maneja horarios que cruzan medianoche (ej: 21:00-01:00)

## Testing

### Casos de Prueba

#### 1. Pausar Pedidos Manualmente
- [ ] Admin activa pausa desde panel
- [ ] Checkout muestra mensaje de pausa
- [ ] Usuario no puede enviar pedido (UI bloqueada)
- [ ] Usuario intenta enviar por API → Error 400

#### 2. Horarios de Operación
- [ ] Cerrado fuera de horario → mensaje "Abrimos a las XX:XX"
- [ ] Abierto dentro de horario → permite pedidos
- [ ] Horario cruza medianoche → maneja correctamente

#### 3. Reanudar Pedidos
- [ ] Admin desactiva pausa
- [ ] Checkout permite pedidos nuevamente
- [ ] Mensaje de pausa desaparece

#### 4. Validación Server-Side
- [ ] Intentar crear orden con API cuando pausado → Error
- [ ] Mensaje de error descriptivo
- [ ] No se guarda en base de datos

## Mejoras Futuras

### Posibles Extensiones

1. **Pausa Programada:**
   - Programar pausas automáticas por fecha/hora
   - Ej: "Pausar pedidos a las 23:00 hasta las 09:00"

2. **Notificaciones:**
   - Notificar usuarios registrados cuando se reanuden pedidos
   - Email/SMS cuando cambie el estado

3. **Analytics:**
   - Registrar cuántas veces se pausaron pedidos
   - Cuántos usuarios intentaron pedir estando pausado

4. **Límite de Pedidos:**
   - Pausar automáticamente al alcanzar X pedidos
   - Contador de pedidos por hora/día

5. **Zonas de Delivery:**
   - Pausar pedidos por zona específica
   - Ej: "No aceptamos pedidos en Zona Norte hoy"

## Troubleshooting

### Problema: Usuarios pueden enviar pedidos estando pausado

**Verificar:**
1. ¿Se ejecutó la migración `002_create_business_settings.sql`?
2. ¿El campo `is_paused` está en `true` en la BD?
3. ¿Las páginas se revalidaron después de pausar?
4. ¿Hay cache del lado del cliente?

**Solución:**
```bash
# Verificar estado en Supabase
SELECT is_paused, pause_message FROM business_settings;

# Revalidar manualmente (o reiniciar servidor)
```

### Problema: Checkout no muestra mensaje de pausa

**Verificar:**
1. ¿`checkIfAcceptingOrders()` se está llamando en `useEffect`?
2. ¿El estado `isAcceptingOrders` se actualiza?
3. ¿El componente de advertencia está renderizándose?

**Debug:**
```typescript
console.log('Business Status:', { isAcceptingOrders, businessMessage })
```

## Comandos SQL Útiles

```sql
-- Pausar pedidos manualmente
UPDATE business_settings
SET is_paused = true,
    pause_message = 'Estamos cerrados temporalmente'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Reanudar pedidos
UPDATE business_settings
SET is_paused = false
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Ver configuración actual
SELECT * FROM business_settings;

-- Ver pedidos creados mientras estaba pausado (no debería haber)
SELECT * FROM orders
WHERE created_at > (
  SELECT updated_at FROM business_settings
  WHERE is_paused = true
);
```

## Seguridad

### Protecciones Implementadas

1. **No es posible bypassear la validación:**
   - Validación server-side en `createOrder()`
   - No depende solo del cliente

2. **RLS en Supabase:**
   - Solo admin puede modificar `business_settings`
   - Público puede leer para verificar estado

3. **Revalidación automática:**
   - Al cambiar estado, se revalidan páginas relevantes
   - Evita cache desactualizada

### Consideraciones

- La configuración es pública (necesaria para checkout)
- No expone información sensible
- Solo el estado de operación del negocio
