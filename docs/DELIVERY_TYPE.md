# Funcionalidad de Tipo de Entrega

## Resumen

Se implementó un selector de tipo de entrega en el checkout que permite a los clientes elegir entre:
- **Envío a domicilio**: El cliente recibe el pedido en su casa (con costo de envío según zona)
- **Retiro en local**: El cliente retira el pedido en el local (envío gratis)

## Componentes Creados

### 1. DeliveryTypeSelector (`/components/checkout/delivery-type-selector.tsx`)
Selector visual con dos opciones en formato de cards:
- Diseño mobile-first con animaciones de Framer Motion
- Indicador visual de selección con checkmark
- Badge "Envío gratis" en la opción de retiro
- Sigue la paleta de colores naranja/amber del proyecto

### 2. ContactForm (`/components/checkout/contact-form.tsx`)
Formulario simplificado para retiro en local:
- Solo solicita nombre y teléfono
- Reutiliza los estilos del DeliveryForm
- Validación en el checkout

### 3. PickupInfo (`/components/checkout/pickup-info.tsx`)
Información del local para retiro:
- Muestra dirección del local
- Horarios de atención
- Botón "Cómo llegar" que abre Google Maps
- Mensaje informativo sobre el flujo de retiro

**NOTA:** Actualmente usa datos de ejemplo. Para personalizar:
```typescript
// Editar en /components/checkout/pickup-info.tsx
const STORE_ADDRESS = 'Tu dirección real'
const STORE_COORDINATES = { lat: -34.6037, lng: -58.3816 }
const STORE_HOURS = 'Lun a Dom 11:00 - 23:00'
```

## Modificaciones en Componentes Existentes

### CheckoutSummary
- Nuevo prop `isPickup` para manejar el caso de retiro en local
- Cuando `isPickup=true`, el envío se muestra siempre como "Gratis" ($0)
- Se oculta la información de zona cuando es retiro

### Página de Checkout (`/app/checkout/page.tsx`)
- Estado `deliveryType` para controlar el tipo de entrega seleccionado
- Renderizado condicional de formularios según el tipo
- Lógica de validación diferenciada:
  - **Delivery**: Requiere nombre, teléfono, dirección y validación de zona
  - **Pickup**: Solo requiere nombre y teléfono
- Cálculo de shipping adaptado (siempre $0 para pickup)
- Generación de pedido con dirección "Retiro en local" cuando corresponde

## Flujo de Usuario

### Retiro en Local
1. Usuario selecciona "Retiro en local"
2. Completa nombre y teléfono
3. Ve la dirección del local y horarios
4. Selecciona método de pago
5. El resumen muestra "Envío: Gratis"
6. Genera pedido por WhatsApp indicando que es retiro

### Envío a Domicilio
1. Usuario selecciona "Envío a domicilio"
2. Completa todos los datos de entrega (nombre, teléfono, dirección)
3. Selecciona ubicación en el mapa
4. Sistema calcula costo de envío según zona
5. Selecciona método de pago
6. Genera pedido por WhatsApp con todos los detalles de delivery

## Integración con Base de Datos

El campo `customer_address` en la tabla `orders` contiene:
- **Para delivery**: Dirección completa del cliente
- **Para pickup**: String "Retiro en local"

El campo `customer_coordinates` en la tabla `orders`:
- **Para delivery**: Coordenadas GPS (`{ lat, lng }`)
- **Para pickup**: `null`

## Estilos y UX

### Diseño Mobile-First
- Cards responsive: 1 columna en mobile, 2 en desktop
- Animaciones suaves con Framer Motion
- Touch-friendly con áreas de toque grandes

### Paleta de Colores
- Primario: `#FEC501` (amarillo/naranja)
- Selección: Borde amarillo + fondo amarillo/10
- Hover: Ligera elevación y cambio de borde

### Micro-interacciones
- Escala al hacer hover (scale: 1.02)
- Escala al hacer click (scale: 0.98)
- Checkmark animado al seleccionar
- Transiciones suaves en todos los estados

## Testing Recomendado

1. **Flujo de retiro completo**
   - Seleccionar retiro
   - Completar datos
   - Verificar que shipping = 0
   - Confirmar pedido por WhatsApp
   - Verificar que el mensaje indica "Retiro en local"

2. **Flujo de delivery completo**
   - Seleccionar delivery
   - Completar datos y dirección
   - Verificar cálculo de zona
   - Confirmar pedido
   - Verificar dirección en WhatsApp

3. **Cambio de tipo durante checkout**
   - Completar datos para delivery
   - Cambiar a pickup
   - Verificar que el shipping se actualiza a $0
   - Cambiar nuevamente a delivery
   - Verificar que mantiene los datos ya ingresados

4. **Validaciones**
   - Intentar checkout sin nombre (ambos tipos)
   - Intentar checkout sin teléfono (ambos tipos)
   - Intentar checkout sin dirección (solo delivery)
   - Verificar mensajes de error apropiados

## Próximas Mejoras Sugeridas

1. **Configuración desde Admin**
   - Panel para editar dirección del local
   - Gestión de horarios de atención
   - Toggle para habilitar/deshabilitar retiro en local

2. **Tiempo de preparación estimado**
   - Mostrar tiempo estimado de preparación
   - Diferente para pickup vs delivery

3. **Notificaciones**
   - Email/SMS cuando el pedido está listo para retirar
   - Recordatorio antes de cerrar el local

4. **Estadísticas**
   - Métricas de pickup vs delivery
   - Análisis de preferencias por zona/horario
