# Guía de Testing: Sistema de Pausa de Pedidos

## Preparación

### 1. Acceso Requerido

- Panel de Administración (`/admin/login`)
- Cuenta de administrador configurada
- Acceso al checkout público (`/checkout`)

### 2. Estado Inicial

```sql
-- Verificar estado actual en Supabase SQL Editor
SELECT is_paused, pause_message, opening_time, closing_time, operating_days
FROM business_settings
WHERE id = '00000000-0000-0000-0000-000000000001';
```

## Test 1: Pausar Pedidos Manualmente

### Objetivo
Verificar que cuando el admin pausa los pedidos, los usuarios no pueden realizar nuevos pedidos.

### Pasos

1. **Iniciar sesión como Admin**
   ```
   URL: /admin/login
   Credenciales: [usar credenciales de admin]
   ```

2. **Ir a Configuración**
   ```
   URL: /admin/settings
   ```

3. **Verificar Estado Inicial**
   - Estado debe mostrar "Abierto" o "Cerrado" según horario
   - Botón debe decir "Pausar Pedidos"

4. **Pausar Pedidos**
   - Clic en "Pausar Pedidos"
   - Esperar toast de confirmación: "Pedidos pausados"
   - Estado cambia a "Cerrado"
   - Botón cambia a "Reanudar Pedidos" (verde)

5. **Verificar en Base de Datos**
   ```sql
   SELECT is_paused, pause_message FROM business_settings;
   -- Resultado esperado: is_paused = true
   ```

6. **Probar Checkout (Nueva Sesión)**
   - Abrir navegador de incógnito
   - Ir a `/`
   - Agregar productos al carrito
   - Ir a `/checkout`
   - **Verificar:**
     - ✅ Aparece mensaje rojo: "No estamos recibiendo pedidos"
     - ✅ Muestra el `pause_message` configurado
     - ✅ Botón "Pedir por WhatsApp" está DESHABILITADO
     - ✅ Link a WhatsApp para consultas está visible

7. **Intentar Enviar Pedido (Debe Fallar)**
   - Completar formulario de delivery
   - Intentar hacer clic en "Pedir por WhatsApp"
   - **Verificar:**
     - ✅ Botón no hace nada (está deshabilitado)
     - ✅ No se abre WhatsApp
     - ✅ No se crea orden en la base de datos

8. **Verificar que No se Crearon Órdenes**
   ```sql
   SELECT * FROM orders
   WHERE created_at > NOW() - INTERVAL '5 minutes'
   ORDER BY created_at DESC;
   -- No debe haber órdenes nuevas
   ```

### Resultado Esperado
- ❌ Los usuarios NO pueden realizar pedidos cuando está pausado
- ✅ Se muestra mensaje claro explicando la situación
- ✅ No se crean órdenes en la base de datos

---

## Test 2: Reanudar Pedidos

### Objetivo
Verificar que al reanudar pedidos, los usuarios pueden volver a realizar pedidos normalmente.

### Pasos

1. **Como Admin, ir a Configuración**
   ```
   URL: /admin/settings
   ```

2. **Reanudar Pedidos**
   - Clic en "Reanudar Pedidos" (botón verde)
   - Esperar toast: "Pedidos reanudados"
   - Estado cambia según horario actual
   - Botón vuelve a "Pausar Pedidos"

3. **Verificar en Base de Datos**
   ```sql
   SELECT is_paused FROM business_settings;
   -- Resultado esperado: is_paused = false
   ```

4. **Probar Checkout (Actualizar Página)**
   - Recargar `/checkout` en el navegador de incógnito
   - **Verificar:**
     - ✅ Mensaje rojo de pausa DESAPARECE
     - ✅ Botón "Pedir por WhatsApp" está HABILITADO
     - ✅ Formulario funciona normalmente

5. **Realizar Pedido de Prueba**
   - Completar formulario con datos válidos
   - Seleccionar ubicación en el mapa
   - Clic en "Pedir por WhatsApp"
   - **Verificar:**
     - ✅ Se abre WhatsApp con mensaje
     - ✅ Se crea orden en la base de datos
     - ✅ Carrito se vacía
     - ✅ Toast de éxito: "Pedido enviado!"

6. **Verificar Orden Creada**
   ```sql
   SELECT id, customer_name, total, status, created_at
   FROM orders
   ORDER BY created_at DESC
   LIMIT 1;
   -- Debe aparecer la orden de prueba
   ```

### Resultado Esperado
- ✅ Los usuarios pueden realizar pedidos normalmente
- ✅ Las órdenes se guardan en la base de datos
- ✅ El flujo de checkout funciona correctamente

---

## Test 3: Validación Server-Side (Bypass Intento)

### Objetivo
Verificar que no es posible bypassear la validación del lado del cliente y crear órdenes cuando está pausado.

### Pasos

1. **Pausar Pedidos**
   - Como admin, pausar pedidos desde `/admin/settings`

2. **Intentar Crear Orden con API Directa**
   - Usar herramienta como Postman o consola del navegador
   - Ejecutar en consola del navegador (en `/checkout`):

   ```javascript
   // Copiar un item del carrito
   const testOrder = {
     customer_name: "Test User",
     customer_phone: "1234567890",
     customer_address: "Test Address 123",
     customer_coordinates: { lat: -34.6037, lng: -58.3816 },
     items: [{
       id: "test-id",
       name: "Test Product",
       price: 1000,
       quantity: 1,
       image_url: null
     }],
     total: 1000,
     shipping_cost: 0,
     delivery_zone_id: null,
     notes: "Test order",
     payment_method: "cash"
   };

   // Intentar crear orden
   const { createOrder } = await import('./app/actions/orders');
   const result = await createOrder(testOrder);
   console.log('Result:', result);
   ```

3. **Verificar Respuesta**
   - **Resultado Esperado:**
     ```javascript
     {
       data: null,
       error: "Los pedidos están pausados temporalmente"
       // o el mensaje configurado en pause_message
     }
     ```

4. **Verificar que No se Creó Orden**
   ```sql
   SELECT * FROM orders
   WHERE customer_name = 'Test User';
   -- No debe existir
   ```

### Resultado Esperado
- ✅ La server action rechaza la creación de orden
- ✅ Retorna error descriptivo
- ✅ No se guarda nada en la base de datos
- ✅ La validación server-side funciona correctamente

---

## Test 4: Horarios de Operación

### Objetivo
Verificar que el sistema bloquea pedidos fuera del horario de operación.

### Pasos

1. **Configurar Horario Restrictivo**
   - Como admin, ir a `/admin/settings`
   - Configurar horario que NO incluya la hora actual
   - Ejemplo: Si son las 15:00, configurar: 21:00 - 01:00
   - Guardar configuración

2. **Verificar Estado**
   - El indicador debe mostrar "Cerrado"
   - Mensaje: "Abrimos hoy a las 21:00" (o similar)

3. **Probar Checkout**
   - Ir a `/checkout`
   - **Verificar:**
     - ✅ Aparece mensaje de cierre
     - ✅ Botón deshabilitado
     - ✅ Muestra próxima hora de apertura

4. **Intentar Crear Orden**
   - Debe fallar con mensaje de horario

5. **Restaurar Horario Normal**
   - Volver a configurar horario 24/7 o normal

### Resultado Esperado
- ✅ El sistema respeta los horarios configurados
- ✅ Bloquea pedidos fuera de horario
- ✅ Muestra información clara sobre próxima apertura

---

## Test 5: Mensaje de Pausa Personalizado

### Objetivo
Verificar que el mensaje personalizado se muestra correctamente.

### Pasos

1. **Configurar Mensaje Personalizado**
   - Como admin, ir a `/admin/settings`
   - En "Mensaje de Pausa", escribir:
     ```
     Estamos cerrados por mantenimiento.
     Volvemos mañana a las 10:00 hs.
     Gracias por tu paciencia!
     ```
   - Guardar configuración

2. **Pausar Pedidos**
   - Clic en "Pausar Pedidos"

3. **Verificar en Checkout**
   - Ir a `/checkout`
   - **Verificar:**
     - ✅ Se muestra el mensaje personalizado exacto
     - ✅ Formato y saltos de línea se respetan

4. **Reanudar y Volver a Pausar**
   - Verificar que el mensaje persiste

### Resultado Esperado
- ✅ El mensaje personalizado se guarda correctamente
- ✅ Se muestra en el checkout cuando está pausado
- ✅ Persiste entre pausas

---

## Checklist Final

### Funcionalidad Core
- [ ] Pausar pedidos desde admin funciona
- [ ] Reanudar pedidos desde admin funciona
- [ ] Mensaje de pausa se muestra en checkout
- [ ] Botón de checkout se deshabilita cuando pausado
- [ ] Server action rechaza órdenes cuando pausado
- [ ] No se pueden bypassear validaciones

### UI/UX
- [ ] Mensaje de pausa es claro y visible
- [ ] Link a WhatsApp para consultas funciona
- [ ] Estado del negocio se muestra en admin
- [ ] Toast de confirmación al pausar/reanudar
- [ ] Indicador visual del estado (punto pulsante)

### Horarios
- [ ] Respeta días de operación configurados
- [ ] Respeta horarios de apertura/cierre
- [ ] Maneja horarios que cruzan medianoche
- [ ] Muestra próxima apertura cuando cerrado

### Seguridad
- [ ] Solo admin puede pausar pedidos
- [ ] Validación server-side funciona
- [ ] RLS policies están activas
- [ ] No se pueden crear órdenes cuando pausado (API directa)

### Base de Datos
- [ ] `business_settings` tabla existe
- [ ] Configuración singleton funciona (ID fijo)
- [ ] Triggers de `updated_at` funcionan
- [ ] Constraints de validación activos

---

## Comandos SQL Útiles para Testing

```sql
-- Ver estado actual
SELECT * FROM business_settings;

-- Pausar manualmente (para testing)
UPDATE business_settings
SET is_paused = true,
    pause_message = 'TESTING - Sistema pausado'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Reanudar manualmente
UPDATE business_settings
SET is_paused = false
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Ver órdenes recientes
SELECT id, customer_name, total, created_at, status
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- Limpiar órdenes de prueba
DELETE FROM orders
WHERE customer_name LIKE '%Test%' OR customer_name LIKE '%Prueba%';

-- Restaurar configuración por defecto
UPDATE business_settings
SET operating_days = '{0,1,2,3,4,5,6}',
    opening_time = '21:00',
    closing_time = '01:00',
    is_paused = false,
    pause_message = 'Estamos cerrados temporalmente. Volvemos pronto!'
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

## Errores Comunes y Soluciones

### Error: "No se puede pausar/reanudar pedidos"
**Causa:** No hay autenticación de admin
**Solución:** Iniciar sesión en `/admin/login`

### Error: El mensaje de pausa no se muestra
**Causa:** Cache del navegador
**Solución:** Recargar con Ctrl+Shift+R o usar modo incógnito

### Error: Se pueden crear órdenes estando pausado
**Causa:** Validación server-side no implementada
**Solución:** Verificar que `createOrder()` incluye las validaciones

### Error: "business_settings no existe"
**Causa:** Migración no ejecutada
**Solución:** Ejecutar `002_create_business_settings.sql` y `003_rls_policies.sql`

---

## Notas para Desarrolladores

1. **Caché:** El estado del negocio se verifica en cada carga del checkout, no hay caché prolongada

2. **Revalidación:** Cuando se pausa/reanuda, se revalidan automáticamente:
   - `/admin/settings`
   - `/checkout`
   - `/`

3. **Horarios:** El sistema usa la hora local del servidor, no del cliente

4. **Timezone:** Asegurar que el servidor tenga el timezone correcto configurado

5. **Monitoreo:** Considerar agregar logs cuando se pausan/reanudan pedidos para auditoría
