# Analisis Tecnico: Estadisticas y Reportes para Que Copado

> **Tipo de documento:** Ingenieria inversa conceptual + roadmap de implementacion
> **Fecha:** 2026-02-16
> **Contexto:** Hamburgueseria argentina, checkout via WhatsApp, SaaS Next.js + Supabase
> **Audiencia:** Equipo de desarrollo (nivel senior)

---

## Resumen Ejecutivo

Este documento presenta un analisis exhaustivo de las funcionalidades de estadisticas y reportes de las principales plataformas FoodTech a nivel global y regional (Fudo, Toast POS, Square for Restaurants, PedidosYa Partner, iFood, Lightspeed, TouchBistro), y las traduce en un roadmap priorizado para **Que Copado**.

El producto actual cuenta con un dashboard basico (ventas dia/semana/mes, ticket promedio, top 5 productos, grafico de ventas de 7 dias, pedidos recientes). El objetivo es evolucionar este dashboard hacia una **herramienta de decision** que permita al dueno de una hamburgueseria optimizar sus operaciones, entender a sus clientes y maximizar su rentabilidad.

**Estado actual de la base de datos (produccion):**
- 5 tablas: `orders` (7 registros), `products` (19), `categories` (8), `delivery_zones` (5), `business_settings` (1)
- 7 clientes unicos, $101.500 ARS de revenue total, ticket promedio $14.500 ARS
- Metodos de pago: 86% efectivo, 14% transferencia, 0% MercadoPago
- 0 pedidos cancelados hasta la fecha

**Conclusion principal:** El 70% de las funcionalidades de analytics de alto impacto se pueden implementar **sin cambios de base de datos**, usando exclusivamente los datos que ya capturamos en la tabla `orders`. Esto permite un MVP de analytics en ~2 semanas de desarrollo.

---

## 1. Benchmarking contra Plataformas FoodTech Lideres

### 1.1 Matriz Comparativa de Modulos de Reportes

| Funcionalidad de Reporte | Fudo | Toast | Square | PedidosYa Partner | iFood | Que Copado (actual) |
|--------------------------|------|-------|--------|-------------------|-------|---------------------|
| **Ventas por periodo (dia/semana/mes)** | Si | Si | Si | Si | Si | Si (basico) |
| **Ventas por hora del dia** | Si (barras horizontales 0-23h) | Si ("Sales by Hour") | Si ("Section Sales") | No | No | No |
| **Ventas por dia de semana** | Si ("Ventas por semana") | Si ("Sales by Day of Week") | Si | No | No | No |
| **Periodo comparativo (vs anterior)** | Si (mes a la fecha vs equivalente anterior) | Si (flechas con % cambio) | Si | Si (MoM, YoY) | Si (retrospectiva anual) | No |
| **Top productos / Product Mix** | Si (ranking con desglose por categoria) | Si ("Product Mix Report" con revenue, qty, %) | Si | Si (top 3 platos) | Si (top 3 platos) | Si (top 5 basico) |
| **Distribucion por metodo de pago** | Si (torta porcentual) | Si ("Payment Methods Report") | Si (detallado con fees) | No aplica | No aplica | No |
| **Tasa de cancelacion** | No explicito | Si ("Void/Discount Reports") | Si ("Comps & Voids") | Si (KPI principal) | Si (reduccion 45% con IA) | No |
| **Ventas por zona geografica** | No | No | No (solo por "Revenue Center") | No (interno) | No (interno) | No (datos disponibles) |
| **Heatmap geografico** | No | No | No | No (interno) | No (interno) | No (datos disponibles) |
| **Tiempos operacionales** | No | Si ("Time to Complete") | Si ("Kitchen Performance") | Si (preparacion + entrega) | Si (con IA predictiva) | No |
| **Clientes recurrentes / CRM** | No (planes basicos) | Si ("Customer Frequency Reports") | Si ("Customer Directory") | Si (via PedidosYa Plus) | Si (cliente con mas pedidos) | No |
| **Food Cost / Margen** | Si (plan Pro: "Costo de Mercaderia Vendida") | Si ("Food Cost Percentage") | No nativo | No aplica | No aplica | No |
| **Cierre de caja (End of Day)** | Si (modulo dedicado) | Si ("End of Day Report") | Si | No aplica | No aplica | No |
| **Exportacion CSV/Excel** | Si (XLS) | Si (CSV) | Si (CSV) | Si (PDF) | No | No |
| **Dashboard tiempo real** | No | Si (Live Sales) | Si ("Live Sales Report") | Si (monitoreo activo) | Si (alertas IA) | No |
| **Promociones / Descuentos** | Si ("Descuentos ($)" en reporte de ventas) | Si ("Sales Exception Reports") | Si | Si (PedidosYa Plus, creditos) | Si (cupones) | No |
| **IA / Predictivo** | No | Si (2026: menu profitability, labor needs) | Si (2025: Square AI, demand forecasting) | No explicito | Si (asistentes Cris y Karen) | No |
| **Combos frecuentes (Market Basket)** | No | Si ("Item Pairing Analysis") | No | No | No | No |
| **Revenue de envio** | No separado | No separado | No separado | Si (comision + envio) | Si (comision) | No |
| **Historial de precios** | No | Si ("Menu Price Analysis") | No | No | No | No |
| **Metricas de crecimiento** | No explicito | Si (dashboards customizables) | Si (AI-powered forecasts) | Si (22% crecimiento YoY) | Si (retrospectiva) | No |

### 1.2 Hallazgos Clave del Benchmarking

**1. La tendencia 2025-2026 es IA embebida en analytics:**
- Toast esta invirtiendo fuertemente en "intelligence layers" sobre datos de POS, con ML para evaluar menu profitability en tiempo real, predecir necesidades de personal y alertar anomalias operativas.
- Square lanzo "Square AI", un asistente de lenguaje natural que permite preguntar "Que items del menu generan el mayor margen?" o "Como se comparan los costos laborales de esta semana vs la anterior?".
- iFood implemento asistentes IA (Cris y Karen) que interactuaron con 296.000 restaurantes, logrando una reduccion del 45% en cancelaciones por demora.

**2. Las plataformas de delivery (PedidosYa, iFood) ofrecen analytics limitados al partner:**
- Metricas de alto nivel: ordenes, revenue, top productos, metricas de Plus/fidelidad.
- No dan acceso a datos granulares (horarios, clientes individuales, margenes).
- Esto es una oportunidad: Que Copado puede ofrecer analytics que las plataformas de delivery no proveen.

**3. El analisis geoespacial es un vacio en toda la industria POS:**
- Ninguna plataforma POS estandar (Fudo, Toast, Square) ofrece heatmaps de pedidos o analisis por zona geografica a nivel de negocio individual.
- Que Copado ya captura `customer_coordinates` y tiene zonas GeoJSON configuradas. Esto es un diferenciador unico y concreto.

**4. El food cost es el "killer feature" de los planes premium:**
- Fudo lo reserva para su plan Pro. Toast lo tiene como feature principal de analytics.
- Para una hamburgueseria, donde el food cost ideal es 28-35%, esta metrica es la diferencia entre facturar y ganar dinero.

---

## 2. Funcionalidades de Estadisticas y Reportes Priorizadas

### Inventario de Datos: Lo que Tenemos vs. Lo que Necesitamos

#### Datos que YA capturamos y podemos explotar mejor

| Dato | Tabla.Campo | Uso Actual | Potencial sin Explotar |
|------|-------------|-----------|----------------------|
| Timestamp de creacion | `orders.created_at` | Filtro basico por fecha | Analisis por hora, dia de semana, estacionalidad, distribucion temporal |
| Items del pedido (JSONB) | `orders.items` | Top 5 productos (cantidad) | Combos frecuentes, mix de productos, cross-selling, revenue por producto |
| Total del pedido | `orders.total` | Ventas agregadas simples | Distribucion de tickets, percentiles, tendencias, comparativos |
| Costo de envio | `orders.shipping_cost` | Solo mostrar en pedido | Revenue por shipping, impacto de envio gratis en ticket promedio |
| Zona de delivery | `orders.delivery_zone_id` | Solo mostrar zona detectada | Ventas por zona, densidad de pedidos, optimizacion de cobertura |
| Coordenadas GPS | `orders.customer_coordinates` | Link a Google Maps | Heatmap geografico, clustering, expansion de zonas |
| Telefono del cliente | `orders.customer_phone` | Solo contacto WhatsApp | Identificador de cliente unico: frecuencia, recurrencia, LTV |
| Metodo de pago | `orders.payment_method` | Solo mostrar en pedido | Distribucion porcentual, tendencias, gestion de caja |
| Estado del pedido | `orders.status` | Gestion manual de estados | Tasa de cancelacion, funnel de conversion |
| Precio del producto | `products.price` | Solo catalogo | Impacto de cambios de precio en volumen |
| Categoria | `products.category_id` | Solo filtro de catalogo | Participacion de categorias en revenue, tendencias |
| Horarios del negocio | `business_settings.*` | Control de checkout | Correlacion horarios vs volumen de ventas |

#### Datos que NO capturamos y necesitariamos agregar

| Dato Faltante | Impacto | Solucion Tecnica | Complejidad |
|---------------|---------|------------------|-------------|
| Timestamps de cambio de estado | Muy Alto | Nueva tabla `order_status_history` | Media |
| Costo de materia prima | Muy Alto | Nuevo campo `products.cost` | Baja (schema), Alta (operativa) |
| Historial de precios | Medio | Nueva tabla `product_price_history` | Baja |
| Descuentos/promociones | Alto | Campos en `orders` + tabla `promotions` | Alta |
| Canal de origen | Medio | Campo `orders.source` | Baja |
| Tiempo estimado preparacion | Alto | Campos `orders.estimated_prep_time`, `orders.ready_at` | Media |

---

### FASE 1 -- MVP Analytics (Sin cambios de base de datos)

Todas las funcionalidades de esta fase se implementan con los datos existentes en la tabla `orders`. No requieren migraciones ni cambios de schema.

---

#### F1.1 Periodo Comparativo (vs. Periodo Anterior)

**Problema que resuelve:** El dashboard actual muestra numeros absolutos sin contexto. "$45.000 hoy" no significa nada sin saber si ayer fueron $30.000 o $80.000. Toda plataforma de analytics (Fudo, Toast, Square) muestra variaciones porcentuales.

**Datos necesarios:** `orders.created_at`, `orders.total` -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
// Extender getDashboardStats() en app/actions/dashboard.ts
// Para cada metrica (hoy, semana, mes), calcular el periodo anterior equivalente

interface ComparativeStats extends DashboardStats {
  todayRevenueChange: number      // % cambio vs ayer
  todayOrdersChange: number
  weekRevenueChange: number       // % cambio vs semana pasada
  weekOrdersChange: number
  monthRevenueChange: number      // % cambio vs mes pasado
  monthOrdersChange: number
  averageTicketChange: number
}

// Logica: ampliar el rango de la query para incluir el periodo anterior
// Formula: ((actual - anterior) / anterior) * 100
// Si anterior === 0, mostrar "+100%" o "Nuevo"
```

**Visualizacion:** El componente `StatsCard` ya acepta una prop `trend` con `{ value: number, isPositive: boolean }`. Solo falta calcular los datos y pasarlos.

**Complejidad:** Baja (extender query existente, usar prop existente de StatsCard)
**Impacto:** Alto -- Transforma datos crudos en insights accionables
**Estimacion:** 3-4 horas

---

#### F1.2 Ventas por Hora del Dia

**Problema que resuelve:** El dueno no sabe en que horarios tiene picos de demanda. Para una hamburgueseria que opera de 21:00 a 01:00, saber que el pico real es a las 22:30 (y no a las 23:00 como asume) cambia decisiones de staffing y preparacion.

**Referencia industria:** Fudo muestra barras horizontales 0-23h. Toast tiene "Sales by Hour". Square lo incluye en "Section Sales".

**Datos necesarios:** `orders.created_at`, `orders.total` -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
// app/actions/analytics.ts (nuevo archivo)

export async function getHourlySalesReport(
  period: 'today' | '7d' | '30d'
): Promise<{ data: HourlySalesData[] | null; error: string | null }> {
  // 1. Fetch orders del periodo
  // 2. Extraer hora de created_at: new Date(order.created_at).getHours()
  // 3. Agrupar por hora: { hour: 21, orders: 5, revenue: 75000, avgTicket: 15000 }
  // 4. Devolver array de 24 posiciones (o filtrado al rango operativo)
}

interface HourlySalesData {
  hour: number        // 0-23
  orders: number
  revenue: number
  avgTicket: number
}
```

**Visualizacion sugerida:** Grafico de barras verticales con Recharts (ya instalado). Eje X: horas (formato 24h), Eje Y: revenue. Tooltip con pedidos, revenue y ticket promedio. Opcion de filtrar solo al rango operativo del negocio (usando `business_settings.opening_time` y `closing_time`).

**Complejidad:** Baja
**Impacto:** Alto -- Optimizacion directa de turnos y tiempos de preparacion
**Estimacion:** 4-5 horas

---

#### F1.3 Ventas por Dia de la Semana

**Problema que resuelve:** Identificar dias fuertes vs. flojos. Si el martes es consistentemente el dia mas debil, se pueden lanzar promociones dirigidas. Si el viernes es el dia fuerte, se refuerza stock e insumos.

**Referencia industria:** Estandar en Fudo, Toast y Square. Es una de las metricas mas basicas de todo sistema POS.

**Datos necesarios:** `orders.created_at`, `orders.total` -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
export async function getWeekdaySalesReport(
  weeks: number = 4
): Promise<{ data: WeekdaySalesData[] | null; error: string | null }> {
  // 1. Fetch orders de las ultimas N semanas
  // 2. Extraer dayOfWeek: new Date(order.created_at).getDay()
  //    (0=Domingo, 1=Lunes ... 6=Sabado)
  // 3. Agrupar por dia: { day: 5, dayName: 'Viernes', orders: 12, revenue: 180000 }
  // 4. Calcular promedio por dia (revenue_total / num_semanas_con_ese_dia)
}

interface WeekdaySalesData {
  day: number           // 0-6
  dayName: string       // 'Lunes', 'Martes', etc.
  totalOrders: number
  totalRevenue: number
  avgOrders: number     // promedio por semana
  avgRevenue: number    // promedio por semana
}
```

**Visualizacion sugerida:** Grafico de barras verticales Lun-Dom. Linea superpuesta con promedio global. Indicadores de mejor y peor dia con iconografia.

**Complejidad:** Baja
**Impacto:** Alto -- Planificacion semanal de stock, personal y promociones
**Estimacion:** 3-4 horas

---

#### F1.4 Tasa de Cancelacion

**Problema que resuelve:** Medir la salud operativa del negocio. PedidosYa usa la tasa de aceptacion/cancelacion como KPI principal para rankear restaurantes. Una tasa alta indica problemas de stock, tiempos de espera o comunicacion.

**Datos necesarios:** `orders.status`, `orders.created_at` -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
export async function getCancellationRate(
  period: '7d' | '30d' | '90d'
): Promise<{ data: CancellationData | null; error: string | null }> {
  // 1. Contar orders totales y orders con status='cancelado' en el periodo
  // 2. Calcular: (cancelados / total) * 100
  // 3. Comparar con periodo anterior
  // 4. Desglosar por sub-periodo (por dia o por semana)
}

interface CancellationData {
  rate: number              // porcentaje
  cancelledOrders: number
  totalOrders: number
  previousRate: number      // periodo anterior para tendencia
  trend: number             // diferencia porcentual
  dailyBreakdown: Array<{ date: string; rate: number }>
}
```

**Visualizacion sugerida:** KPI card con porcentaje grande, flecha de tendencia, y sparkline de 30 dias. Umbral visual: verde <3%, amarillo 3-5%, rojo >5%.

**Complejidad:** Baja
**Impacto:** Alto -- Alerta temprana de problemas operativos
**Estimacion:** 2-3 horas

---

#### F1.5 Distribucion por Metodo de Pago

**Problema que resuelve:** Saber que porcentaje de ventas es efectivo vs transferencia vs MercadoPago. Critico para gestion de caja (saber cuanto efectivo tener disponible para cambio), y para evaluar si vale la pena integrar nuevos medios.

**Dato actual real:** 86% efectivo ($98.500), 14% transferencia ($3.000), 0% MercadoPago.

**Referencia industria:** Fudo muestra grafico de torta porcentual. Square tiene "Payment Methods Report" detallado con fees.

**Datos necesarios:** `orders.payment_method`, `orders.total` -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
export async function getPaymentMethodReport(
  period: '7d' | '30d' | '90d'
): Promise<{ data: PaymentMethodData[] | null; error: string | null }> {
  // 1. Agrupar orders por payment_method
  // 2. Para cada metodo: cantidad, revenue, porcentaje del total
  // 3. Comparar con periodo anterior
}

interface PaymentMethodData {
  method: PaymentMethod
  label: string
  orders: number
  revenue: number
  percentage: number          // del total
  previousPercentage: number  // periodo anterior
}
```

**Visualizacion sugerida:** Grafico de dona/pie de Recharts con 3 segmentos (colores: verde para efectivo, azul para transferencia, celeste para MercadoPago). Tabla detalle debajo.

**Complejidad:** Baja
**Impacto:** Medio -- Gestion de caja y planificacion financiera
**Estimacion:** 3-4 horas

---

#### F1.6 Top Productos Mejorado

**Problema que resuelve:** El top 5 actual solo muestra cantidad vendida. El dueno necesita saber cuales generan mas revenue (un combo barato puede venderse mucho pero generar poco ingreso), en que categoria estan, y que porcentaje del total representan.

**Referencia industria:** Toast tiene "Product Mix Report" con revenue, cantidad y porcentaje del total. Fudo incluye desglose por categoria.

**Datos necesarios:** `orders.items` (JSON), `products.category_id`, `categories.name` -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
// Extender getTopProducts() en app/actions/dashboard.ts

interface TopProductExtended extends TopProduct {
  percentage: number       // % sobre total de ventas
  category: string         // nombre de la categoria
  avgQuantityPerOrder: number
  trend: number            // % cambio vs periodo anterior
}

// Permitir top 10, top 20, "todos"
// Agregar ordenamiento: por cantidad O por revenue
// Agregar filtro por categoria
```

**Visualizacion sugerida:** Tabla expandible con columnas sortables. Pestanas para alternar "Por cantidad" vs "Por revenue". Barra de progreso relativa al #1. Filtro por categoria con chips.

**Complejidad:** Baja (extender logica existente en `dashboard.ts`)
**Impacto:** Medio -- Mejora decisiones sobre menu y pricing
**Estimacion:** 4-5 horas

---

#### F1.7 Grafico de Ventas Configurable (7, 14, 30, 90 dias)

**Problema que resuelve:** El grafico actual esta fijo en 7 dias. Para detectar tendencias de crecimiento o estacionalidad, se necesitan periodos mas largos.

**Referencia industria:** Fudo permite "7, 30 dias, 3, 6, 12 meses" con granularidad automatica. Toast permite cualquier rango custom.

**Datos necesarios:** `orders.created_at`, `orders.total` -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
// Modificar getSalesChartData() para aceptar rangos mayores
// Auto-ajustar granularidad:
//   7-14 dias: barras/puntos por dia
//   30 dias: barras por dia
//   90 dias: barras por semana
//   365 dias: barras por mes

// Agregar selector de periodo al componente SalesChart
// El selector puede ser tabs: [7D, 14D, 30D, 90D]
```

**Complejidad:** Baja
**Impacto:** Medio -- Comprension de tendencias a largo plazo
**Estimacion:** 3-4 horas

---

#### F1.8 Ventas por Zona de Delivery

**Problema que resuelve:** Entender de que zonas vienen mas pedidos y cuales generan mas revenue. Permite decidir si expandir o contraer zonas, ajustar costos de envio, o focalizar marketing local.

**DIFERENCIADOR UNICO:** Ninguna plataforma POS (Fudo, Toast, Square) ofrece este nivel de detalle geoespacial a nivel de negocio individual. Que Copado ya tiene zonas GeoJSON y delivery_zone_id en cada orden.

**Datos necesarios:** `orders.delivery_zone_id`, `orders.total`, `delivery_zones.*` -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
export async function getZoneSalesReport(
  period: '7d' | '30d' | '90d'
): Promise<{ data: ZoneSalesData[] | null; error: string | null }> {
  // 1. Query orders con JOIN a delivery_zones
  // 2. Agrupar por zona (incluyendo "Sin zona" para delivery_zone_id=null)
  // 3. Para cada zona:
  //    - Pedidos, revenue, ticket promedio
  //    - Shipping revenue (sum de shipping_cost de esa zona)
  //    - % de pedidos con envio gratis vs pago
  //    - Comparativa vs periodo anterior
}

interface ZoneSalesData {
  zoneId: string | null
  zoneName: string
  zoneColor: string
  orders: number
  revenue: number
  avgTicket: number
  shippingRevenue: number
  freeShippingOrders: number
  paidShippingOrders: number
  percentage: number         // % del total
}
```

**Visualizacion sugerida:**
- Tabla ranking de zonas con barras de progreso
- Mapa (Leaflet, ya integrado) con las zonas coloreadas por intensidad de pedidos
- Cards KPI por zona

**Complejidad:** Media (requiere JOIN y posible integracion con mapa)
**Impacto:** Alto -- Diferenciador competitivo concreto
**Estimacion:** 8-10 horas

---

#### F1.9 Revenue de Envio vs. Envio Gratis

**Problema que resuelve:** Cuantificar cuanto dinero genera el concepto de envio, y medir el impacto de los umbrales de envio gratis en el comportamiento del ticket. "Los clientes que superan el umbral de envio gratis gastan en promedio $18.500 vs $12.000 los que no lo superan".

**Datos necesarios:** `orders.shipping_cost`, `orders.total`, `delivery_zones.free_shipping_threshold` -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
export async function getShippingAnalysis(
  period: '7d' | '30d' | '90d'
): Promise<{ data: ShippingAnalysisData | null; error: string | null }> {
  // 1. Total shipping revenue del periodo
  // 2. Segmentar ordenes: shipping_cost > 0 vs shipping_cost === 0
  // 3. Para cada segmento: cantidad, revenue promedio, ticket promedio
  // 4. Calcular: "si bajamos el umbral de $15.000 a $12.000,
  //    X% mas de pedidos serian gratis, perderiamos $Y en shipping"
}

interface ShippingAnalysisData {
  totalShippingRevenue: number
  avgShippingCost: number
  freeShippingOrders: { count: number; avgTicket: number; totalRevenue: number }
  paidShippingOrders: { count: number; avgTicket: number; totalRevenue: number }
  ticketLiftFromFreeShipping: number   // % diferencia en ticket
}
```

**Complejidad:** Baja
**Impacto:** Medio -- Optimizacion directa de estrategia de pricing de envio
**Estimacion:** 3-4 horas

---

### FASE 2 -- Growth Analytics (Cambios moderados de base de datos)

---

#### F2.1 Analisis de Clientes Recurrentes

**Problema que resuelve:** Distinguir entre 100 clientes que compran 1 vez vs 20 clientes fieles que compran 5 veces. La recurrencia es el KPI mas importante para un negocio de comida: adquirir un cliente nuevo cuesta 5-7x mas que retener uno existente.

**Referencia industria:** Toast tiene "Customer Frequency Reports". Square ofrece "Customer Directory" con historial completo. PedidosYa mide frecuencia de recompra en su panel de PedidosYa Plus.

**Datos necesarios:** `orders.customer_phone` como identificador unico de cliente -- YA DISPONIBLE

**Implementacion tecnica:**

```typescript
export async function getCustomerAnalysis(
  period: '30d' | '90d' | 'all'
): Promise<{ data: CustomerAnalysisData | null; error: string | null }> {
  // 1. Agrupar orders por customer_phone
  // 2. Para cada "cliente virtual":
  //    - Cantidad de pedidos
  //    - Revenue total acumulado
  //    - Ticket promedio
  //    - Primer pedido, ultimo pedido
  //    - Frecuencia (dias promedio entre pedidos)
  // 3. Segmentar:
  //    - Nuevo: 1 pedido
  //    - Recurrente: 2-4 pedidos
  //    - Fiel: 5+ pedidos
  // 4. Calcular metricas agregadas
}

interface CustomerAnalysisData {
  totalUniqueCustomers: number
  newCustomers: number
  recurringCustomers: number
  loyalCustomers: number
  avgOrdersPerCustomer: number
  avgFrequencyDays: number       // dias promedio entre pedidos
  retentionRate: number          // % que repitio en los ultimos 30d
  topCustomers: Array<{
    phone: string               // ultimos 4 digitos (privacidad)
    name: string
    orders: number
    revenue: number
    avgTicket: number
    firstOrder: string
    lastOrder: string
  }>
  // Distribucion para grafico de dona
  segmentDistribution: Array<{
    segment: 'nuevo' | 'recurrente' | 'fiel'
    count: number
    percentage: number
    revenue: number
  }>
  // Tendencia de clientes nuevos por semana
  newCustomersTrend: Array<{
    week: string
    count: number
  }>
}
```

**Nota sobre privacidad:** El telefono ya es campo obligatorio del checkout. En el dashboard, mostrar solo los ultimos 4 digitos. No se almacenan datos sensibles adicionales.

**Complejidad:** Media (logica de agrupacion compleja pero sin cambios de schema)
**Impacto:** Alto -- La recurrencia define la sostenibilidad del negocio
**Estimacion:** 8-10 horas

---

#### F2.2 Historial de Estados del Pedido (Tiempos Operacionales)

**Problema que resuelve:** Medir cuanto tarda un pedido desde "recibido" hasta "entregado". Una hamburgueseria que tarda 25 min promedio vs una que tarda 50 min tiene una diferencia enorme en satisfaccion y recurrencia. PedidosYa penaliza tiempos largos en su ranking.

**Referencia industria:** Square tiene "Kitchen Performance Reporting". Toast mide "Time to Complete". PedidosYa e iFood miden tiempos de preparacion y entrega como KPIs principales.

**REQUIERE MIGRACION:**

```sql
-- Nueva tabla: order_status_history
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status_new,
  to_status order_status_new NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  changed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_osh_order_id ON order_status_history(order_id);
CREATE INDEX idx_osh_changed_at ON order_status_history(changed_at DESC);

-- Habilitar RLS
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read status history" ON order_status_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin insert status history" ON order_status_history
  FOR INSERT TO authenticated WITH CHECK (true);
```

**Implementacion tecnica:**

```typescript
// 1. Modificar updateOrderStatus() en app/actions/orders.ts
//    para insertar en order_status_history ANTES de actualizar orders

// 2. Nuevo action:
export async function getOperationalMetrics(
  period: '7d' | '30d'
): Promise<{ data: OperationalMetrics | null; error: string | null }> {
  // Calcular tiempos promedio:
  //   - recibido -> pagado (confirmacion de pago)
  //   - pagado -> entregado (preparacion + entrega)
  //   - recibido -> entregado (ciclo completo)
  // Desglosar por dia, por hora, tendencia
}

interface OperationalMetrics {
  avgCycleTime: number          // minutos promedio recibido->entregado
  avgPaymentTime: number        // minutos promedio recibido->pagado
  avgDeliveryTime: number       // minutos promedio pagado->entregado
  ordersOverThreshold: number   // pedidos que tardaron >45 min
  dailyTrend: Array<{ date: string; avgTime: number }>
}
```

**Complejidad:** Media
**Impacto:** Muy Alto -- KPI operacional mas importante segun toda la industria
**Estimacion:** 10-12 horas

---

#### F2.3 Costo de Producto y Margen Bruto

**Problema que resuelve:** El dueno sabe cuanto vende pero no cuanto gana. Sin food cost, maneja a ciegas. Para una hamburgueseria, el food cost ideal es 28-35% del precio de venta. Si una hamburguesa se vende a $6.000 pero los ingredientes cuestan $3.500, el food cost es 58% y el producto no es rentable.

**Referencia industria:** Fudo lo tiene en plan Pro como "Costo de Mercaderia Vendida". Toast lo calcula automaticamente como "Food Cost Percentage". Es la metrica premium por excelencia.

**REQUIERE MIGRACION:**

```sql
-- Agregar campo de costo a products
ALTER TABLE products ADD COLUMN cost NUMERIC(10, 2) DEFAULT NULL;
COMMENT ON COLUMN products.cost IS 'Costo de materia prima/ingredientes en ARS';
```

**Implementacion tecnica:**

```typescript
// 1. Agregar campo "cost" al formulario de producto en admin
// 2. Modificar OrderItem para capturar costo al momento del pedido:
interface OrderItemWithCost extends OrderItem {
  cost?: number  // costo al momento del pedido (snapshot)
}

// 3. Nuevo action:
export async function getProfitabilityReport(
  period: '7d' | '30d'
): Promise<{ data: ProfitabilityData | null; error: string | null }> {
  // Para cada producto vendido en el periodo:
  //   Revenue = sum(item.price * item.quantity)
  //   COGS = sum(item.cost * item.quantity)
  //   Margen = Revenue - COGS
  //   Margen % = ((Revenue - COGS) / Revenue) * 100
}

interface ProfitabilityData {
  totalRevenue: number
  totalCOGS: number
  grossMargin: number
  grossMarginPercentage: number
  foodCostPercentage: number       // inverso del margen
  productProfitability: Array<{
    id: string
    name: string
    revenue: number
    cogs: number
    margin: number
    marginPercentage: number
    quantitySold: number
  }>
}
```

**Nota critica sobre precision historica:** Para que el margen sea correcto historicamente, el costo debe guardarse como snapshot dentro del JSON de items de la orden al momento de la creacion. Si el costo del producto cambia despues, los pedidos anteriores mantienen el costo original.

**Complejidad:** Media (schema simple, pero requiere carga operativa del dueno)
**Impacto:** Muy Alto -- Es la diferencia entre facturar y ganar dinero
**Estimacion:** 12-15 horas

---

#### F2.4 Reporte de Cierre de Caja (End of Day)

**Problema que resuelve:** Al final del turno, el dueno necesita un resumen consolidado: cuanto vendio, por que metodo de pago (para cuadrar caja), cuanto fue envio, cuantos pedidos por estado. Esta es funcionalidad estandar en todo POS.

**Referencia industria:** Fudo tiene modulo dedicado de cierre de caja. Toast tiene "End of Day Report". Square lo genera automaticamente.

**Datos necesarios:** Todos los de `orders` filtrados por dia -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
export async function getDailySummaryReport(
  date: string // YYYY-MM-DD
): Promise<{ data: DailySummaryData | null; error: string | null }> {
  // Consolidar todo lo del dia:
  // - Total vendido (bruto)
  // - Subtotal (sin envio)
  // - Shipping revenue
  // - Desglose por metodo de pago (para cuadrar caja)
  // - Cantidad por estado (entregados, cancelados, pendientes)
  // - Top 3 productos del dia
  // - Comparacion con mismo dia semana anterior
  // Generar texto formateado para enviar por WhatsApp
}

interface DailySummaryData {
  date: string
  totalRevenue: number
  subtotalProducts: number
  totalShipping: number
  ordersByStatus: Record<string, number>
  ordersByPayment: Array<{ method: string; count: number; amount: number }>
  totalOrders: number
  cancelledOrders: number
  avgTicket: number
  topProducts: Array<{ name: string; quantity: number }>
  comparisonVsLastWeek: {
    revenueChange: number
    ordersChange: number
  }
  // Texto preformateado para enviar por WhatsApp
  whatsappSummary: string
}
```

**Funcion adicional: Generar resumen para WhatsApp:**

```typescript
export function formatDailySummaryForWhatsApp(summary: DailySummaryData): string {
  return `
*CIERRE DE CAJA - ${summary.date}*

*Total vendido:* ${formatPrice(summary.totalRevenue)}
*Pedidos:* ${summary.totalOrders}
*Ticket promedio:* ${formatPrice(summary.avgTicket)}

*Desglose por pago:*
${summary.ordersByPayment.map(p => `- ${p.method}: ${formatPrice(p.amount)} (${p.count} pedidos)`).join('\n')}

*Envios cobrados:* ${formatPrice(summary.totalShipping)}
*Cancelados:* ${summary.cancelledOrders}

${summary.comparisonVsLastWeek.revenueChange >= 0 ? '↑' : '↓'} ${Math.abs(summary.comparisonVsLastWeek.revenueChange)}% vs mismo dia semana pasada
  `.trim()
}
```

**Complejidad:** Baja-Media
**Impacto:** Alto -- Necesidad operativa diaria de toda gastronomia
**Estimacion:** 6-8 horas

---

#### F2.5 Combos y Productos Frecuentemente Comprados Juntos

**Problema que resuelve:** Identificar que productos se compran juntos permite crear combos rentables y sugerir upselling. "El 70% de los que piden Doble Mix tambien piden Coca-Cola" es informacion directamente monetizable.

**Referencia industria:** Toast tiene "Item Pairing Analysis". Es raro en plataformas POS basicas, seria un diferenciador.

**Datos necesarios:** `orders.items` (JSON con array de productos) -- YA DISPONIBLE

**Implementacion tecnica:**

```typescript
export async function getProductPairings(
  period: '30d' | '90d',
  minSupport: number = 0.05    // minimo 5% de ordenes
): Promise<{ data: ProductPairingData[] | null; error: string | null }> {
  // Market Basket Analysis (version simplificada):
  // 1. Para cada par de productos (A, B):
  //    - Contar en cuantas ordenes aparecen juntos
  //    - Support = ordenes_con_AB / total_ordenes
  //    - Confidence = ordenes_con_AB / ordenes_con_A
  // 2. Filtrar por minSupport
  // 3. Rankear por frecuencia
  // Con 19 productos, la combinatoria es C(19,2)=171 pares: trivial
}

interface ProductPairingData {
  productA: { id: string; name: string }
  productB: { id: string; name: string }
  coOccurrences: number
  support: number          // % de ordenes que tienen ambos
  confidenceAB: number     // % de ordenes con A que tambien tienen B
  confidenceBA: number     // % de ordenes con B que tambien tienen A
}
```

**Complejidad:** Media (algoritmo O(n*m^2) donde n=ordenes, m=items por orden, pero trivial con 19 productos)
**Impacto:** Medio -- Oportunidad de crear combos y aumentar ticket
**Estimacion:** 6-8 horas

---

#### F2.6 Dashboard en Tiempo Real (Pedidos Activos)

**Problema que resuelve:** Ver en vivo los pedidos activos (status "recibido" o "pagado") con timer de tiempo transcurrido. Alertar cuando un pedido lleva demasiado tiempo sin avanzar de estado.

**Referencia industria:** Square tiene "Live Sales Report". Toast muestra pedidos activos con timer. PedidosYa tiene monitoreo en tiempo real.

**Datos necesarios:** `orders.status`, `orders.created_at` -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
// Opcion A: Polling (simple, recomendado para MVP)
// Auto-refresh cada 30 segundos con setInterval + fetch

// Opcion B: Supabase Realtime (mejor UX, mas complejo)
import { createClient } from '@supabase/supabase-js'

// Suscripcion a cambios en orders:
const subscription = supabase
  .channel('active-orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: `status=in.(recibido,pagado)`
  }, (payload) => {
    // Actualizar lista de pedidos activos
  })
  .subscribe()

// Para cada pedido activo, calcular minutos transcurridos:
// const elapsedMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
// Colores: <15min verde, 15-30min amarillo, >30min rojo
```

**Complejidad:** Media (Supabase Realtime ya esta disponible, pero requiere setup de canal)
**Impacto:** Alto -- Mejora directa en operaciones diarias
**Estimacion:** 8-10 horas

---

#### F2.7 Metricas de Crecimiento

**Problema que resuelve:** Responder "mi negocio esta creciendo?" con datos. Incluye tasa de crecimiento de revenue, nuevos clientes por semana, y Customer Lifetime Value estimado.

**Datos necesarios:** `orders.created_at`, `orders.total`, `orders.customer_phone` -- YA DISPONIBLES

**Implementacion tecnica:**

```typescript
export async function getGrowthMetrics(): Promise<{
  data: GrowthMetricsData | null; error: string | null
}> {
  // Metricas:
  // 1. Revenue growth rate MoM: ((mes_actual - mes_anterior) / mes_anterior) * 100
  // 2. Orders growth rate MoM
  // 3. New customers per week (primera aparicion de customer_phone)
  // 4. Estimated CLV: ticket_promedio * frecuencia_promedio * meses_retencion_estimados
  // 5. Retention rate: clientes_que_repitieron / clientes_periodo_anterior * 100
}

interface GrowthMetricsData {
  revenueGrowthMoM: number
  ordersGrowthMoM: number
  newCustomersThisWeek: number
  newCustomersLastWeek: number
  estimatedCLV: number
  retentionRate: number
  customerGrowthTrend: Array<{ week: string; newCustomers: number; totalCustomers: number }>
}
```

**Complejidad:** Media
**Impacto:** Alto -- Metricas estrategicas de alto nivel
**Estimacion:** 6-8 horas

---

#### F2.8 Exportacion de Reportes (CSV)

**Problema que resuelve:** Descargar datos para el contador, analizar en Excel, o archivar para reportes fiscales.

**Referencia industria:** Estandar en toda plataforma. Fudo exporta XLS, Toast y Square exportan CSV.

**Implementacion tecnica:**

```typescript
// Generacion client-side (sin dependencias adicionales)
function exportToCSV(data: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h]
        // Escapar comillas y comas
        return typeof val === 'string' && (val.includes(',') || val.includes('"'))
          ? `"${val.replace(/"/g, '""')}"`
          : val
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

// Reportes exportables:
// 1. Ordenes detalladas (con items expandidos)
// 2. Resumen diario (revenue, pedidos, ticket por dia)
// 3. Resumen por producto (qty, revenue, % total)
// 4. Resumen por zona
```

**Complejidad:** Baja
**Impacto:** Medio -- Necesidad practica frecuente
**Estimacion:** 4-5 horas

---

### FASE 3 -- Premium Analytics (Diferenciadores de alto valor)

---

#### F3.1 Heatmap Geografico de Pedidos

**Problema que resuelve:** Visualizar en un mapa donde se concentran los pedidos. Permite decidir donde poner publicidad local (carteleria, volantes), donde expandir zonas, o detectar que una zona tiene pocos pedidos pero alto ticket.

**DIFERENCIADOR UNICO:** Ninguna plataforma POS estandar ofrece heatmaps de pedidos a nivel de negocio individual.

**Datos necesarios:** `orders.customer_coordinates`, `orders.total` -- YA DISPONIBLES

**Implementacion tecnica:**

```bash
# Dependencia adicional
npm install leaflet.heat
npm install @types/leaflet.heat  # si existe, sino declarar manualmente
```

```typescript
// Componente: components/admin/analytics/order-heatmap.tsx
// 1. Renderizar mapa con Leaflet (ya integrado: react-leaflet 5.0)
// 2. Agregar capa de heatmap con leaflet.heat
// 3. Cada punto = coordenadas del pedido, peso = total de la orden
// 4. Superponer zonas de delivery existentes como overlay
// 5. Filtrar por periodo con selector
// 6. Toggle entre heatmap y puntos individuales

import L from 'leaflet'
import 'leaflet.heat'

// Configurar heatmap layer
const heatData = orders
  .filter(o => o.customer_coordinates)
  .map(o => [
    o.customer_coordinates.lat,
    o.customer_coordinates.lng,
    o.total / maxTotal   // intensidad normalizada
  ])

const heatLayer = L.heatLayer(heatData, {
  radius: 25,
  blur: 15,
  maxZoom: 17,
  gradient: { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
})
```

**Complejidad:** Media (Leaflet ya esta integrado, plugin de heatmap es liviano)
**Impacto:** Alto -- Visualizacion poderosa, unica en el mercado POS
**Estimacion:** 10-12 horas

---

#### F3.2 Sistema de Descuentos y Promociones

**Problema que resuelve:** Actualmente no hay mecanismo de descuentos. Una hamburgueseria necesita poder ofrecer "2x1 los martes", "10% off en tu primer pedido", "envio gratis desde $X" (esto ultimo ya existe via zonas).

**Referencia industria:** Funcionalidad estandar en Fudo, Toast, Square, PedidosYa e iFood.

**REQUIERE MIGRACION:**

```sql
-- Campos nuevos en orders
ALTER TABLE orders
  ADD COLUMN discount_amount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN discount_type TEXT DEFAULT NULL
    CHECK (discount_type IN ('percentage', 'fixed_amount', 'coupon', 'manual')),
  ADD COLUMN discount_code TEXT DEFAULT NULL,
  ADD COLUMN source TEXT DEFAULT 'whatsapp'
    CHECK (source IN ('whatsapp', 'web', 'phone', 'walkin'));

-- Tabla de promociones
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping', '2x1')),
  value NUMERIC(10, 2) NOT NULL,
  code TEXT UNIQUE,
  min_order_amount NUMERIC(10, 2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  applicable_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
```

**Complejidad:** Alta (requiere logica de aplicacion de descuentos en checkout, validacion server-side, UI de gestion en admin)
**Impacto:** Alto -- Herramienta de marketing y crecimiento directa
**Estimacion:** 20-25 horas

---

#### F3.3 Historial de Precios e Impacto en Ventas

**Problema que resuelve:** Cuando el dueno sube el precio, necesita saber si eso impacto las ventas. "Subi la Doble Mix de $12.000 a $14.000 y vendi 20% menos unidades pero 8% mas revenue".

**REQUIERE MIGRACION:**

```sql
CREATE TABLE product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price NUMERIC(10, 2) NOT NULL,
  new_price NUMERIC(10, 2) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_pph_product_id ON product_price_history(product_id);
```

**Implementacion:** Trigger en `updateProduct()` cuando cambia el precio. Grafico de linea con precio superpuesto a ventas del producto.

**Complejidad:** Media
**Impacto:** Medio -- Util pero requiere volumen de datos para ser significativo
**Estimacion:** 8-10 horas

---

## 3. Modelo de Datos Ampliado

### 3.1 Schema Actual (Produccion)

```
categories (8 rows)
  id UUID PK
  name TEXT
  slug TEXT UNIQUE
  sort_order INT
  created_at TIMESTAMPTZ

products (19 rows)
  id UUID PK
  category_id UUID FK -> categories.id
  name TEXT
  description TEXT?
  price NUMERIC
  image_url TEXT?
  is_active BOOL
  is_out_of_stock BOOL
  created_at TIMESTAMPTZ

orders (7 rows)
  id UUID PK
  created_at TIMESTAMPTZ
  total NUMERIC
  items JSONB
  customer_phone TEXT
  customer_name TEXT?
  customer_address TEXT?
  customer_coordinates JSONB?
  shipping_cost NUMERIC (default 0)
  delivery_zone_id UUID? FK -> delivery_zones.id
  notes TEXT?
  payment_method TEXT CHECK (cash, transfer, mercadopago)
  status order_status_new ENUM (recibido, pagado, entregado, cancelado)

delivery_zones (5 rows)
  id UUID PK
  name TEXT
  polygon JSONB (GeoJSON Polygon)
  shipping_cost INT
  color TEXT
  is_active BOOL
  sort_order INT
  free_shipping_threshold INT?
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

business_settings (1 row, singleton)
  id UUID PK
  operating_days INT[]
  opening_time TEXT (HH:MM)
  closing_time TEXT (HH:MM)
  is_paused BOOL
  pause_message TEXT?
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

### 3.2 Cambios Propuestos por Fase

#### Fase 1: Sin cambios de schema
Todas las funcionalidades de Fase 1 operan sobre datos existentes.

#### Fase 2: Cambios moderados

```sql
-- 2A. Nuevo campo en products para food cost
ALTER TABLE products ADD COLUMN cost NUMERIC(10, 2) DEFAULT NULL;

-- 2B. Nueva tabla para historial de estados
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status_new,
  to_status order_status_new NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  changed_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_osh_order_id ON order_status_history(order_id);
CREATE INDEX idx_osh_changed_at ON order_status_history(changed_at DESC);
```

#### Fase 3: Cambios significativos

```sql
-- 3A. Campos de descuento en orders
ALTER TABLE orders
  ADD COLUMN discount_amount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN discount_type TEXT DEFAULT NULL,
  ADD COLUMN discount_code TEXT DEFAULT NULL,
  ADD COLUMN source TEXT DEFAULT 'whatsapp';

-- 3B. Tabla de promociones
CREATE TABLE promotions ( ... );  -- ver detalle en F3.2

-- 3C. Tabla de historial de precios
CREATE TABLE product_price_history ( ... );  -- ver detalle en F3.3
```

### 3.3 Diagrama de Relaciones Ampliado

```
categories 1:N products
products 1:N product_price_history          [Fase 3]
products.cost --> margen bruto calculation   [Fase 2]

delivery_zones 1:N orders

orders 1:N order_status_history             [Fase 2]
orders N:1 promotions (via discount_code)   [Fase 3]

-- Relaciones derivadas (no FK, sino por analisis de datos):
orders.customer_phone --> "virtual customer" (agrupacion logica, sin tabla)
orders.items (JSONB) --> products (referencia por id dentro del JSON)
```

### 3.4 Consideracion Critica: Normalizacion del JSON de Items

Actualmente, los items de cada orden se almacenan como JSONB:

```jsonb
[
  { "id": "uuid", "name": "Doble Mix", "price": 6000, "quantity": 2, "image_url": "..." },
  { "id": "uuid", "name": "Coca Cola", "price": 2500, "quantity": 1, "image_url": "..." }
]
```

**Ventaja actual:** Simplicidad, snapshot completo al momento del pedido.
**Limitacion para analytics:** No se puede indexar ni hacer JOIN directo. Todo el analisis de productos requiere parsear JSON en JavaScript.

**Recomendacion para escala (>100 ordenes/dia):** Crear una tabla `order_items` normalizada:

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  cost NUMERIC,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_oi_order_id ON order_items(order_id);
CREATE INDEX idx_oi_product_id ON order_items(product_id);
```

Esto permitiria queries SQL directas para analytics de productos sin parsear JSON. Sin embargo, con el volumen actual (7 ordenes, ~19 productos), la normalizacion no es necesaria todavia. Se recomienda implementar cuando se superen las 500 ordenes o cuando el procesamiento JavaScript de items se vuelva perceptiblemente lento.

### 3.5 Indices Recomendados para Performance de Analytics

```sql
-- Indice compuesto para filtros de fecha + estado (consultas mas frecuentes)
CREATE INDEX idx_orders_created_status ON orders(created_at DESC, status);

-- Indice para agrupacion por zona
CREATE INDEX idx_orders_zone ON orders(delivery_zone_id) WHERE delivery_zone_id IS NOT NULL;

-- Indice para analisis de clientes (agrupacion por telefono)
CREATE INDEX idx_orders_phone ON orders(customer_phone);

-- Indice para metodo de pago
CREATE INDEX idx_orders_payment ON orders(payment_method);
```

---

## 4. Priorizacion por Impacto/Esfuerzo

### Matriz de Priorizacion Visual

```
IMPACTO
  ^
  |
Alto  |  [F1.1 Comparativo]    [F1.2 Horario]    [F1.8 Zonas]
  |  [F1.4 Cancelacion]     [F1.3 Dia semana]
  |  [F2.2 Tiempos ops]     [F2.1 Clientes]    [F3.1 Heatmap]
  |  [F2.3 Food cost]       [F2.4 Cierre caja]
  |  [F2.6 Realtime]        [F2.7 Crecimiento]
  |
Medio |  [F1.5 Met. pago]      [F1.6 Top prod+]   [F2.5 Combos]
  |  [F1.9 Shipping]        [F1.7 Chart config]
  |  [F2.8 Export CSV]
  |                                              [F3.2 Promos]
  |                                              [F3.3 Hist. precio]
  |
  +----+------------------+-------------------+----------->
       Baja              Media               Alta      COMPLEJIDAD
```

### Resumen de Fases con Estimaciones

#### FASE 1 -- Must-Have (Sprint 1-2, ~2-3 semanas)

| # | Funcionalidad | Complejidad | Impacto | Horas Est. | Requiere Migracion |
|---|--------------|-------------|---------|-----------|-------------------|
| F1.1 | Periodo comparativo (vs anterior) | Baja | Alto | 3-4h | No |
| F1.2 | Ventas por hora del dia | Baja | Alto | 4-5h | No |
| F1.3 | Ventas por dia de la semana | Baja | Alto | 3-4h | No |
| F1.4 | Tasa de cancelacion | Baja | Alto | 2-3h | No |
| F1.5 | Distribucion por metodo de pago | Baja | Medio | 3-4h | No |
| F1.6 | Top productos mejorado | Baja | Medio | 4-5h | No |
| F1.7 | Grafico de ventas configurable | Baja | Medio | 3-4h | No |
| F1.8 | Ventas por zona de delivery | Media | Alto | 8-10h | No |
| F1.9 | Revenue de envio vs gratis | Baja | Medio | 3-4h | No |
| | **TOTAL FASE 1** | | | **33-43h** | |

**Valor entregado:** Dashboard pasa de "informativo basico" a "herramienta de decision". 9 funcionalidades nuevas sin riesgo de migraciones.

#### FASE 2 -- Should-Have (Sprint 3-5, ~3-4 semanas)

| # | Funcionalidad | Complejidad | Impacto | Horas Est. | Requiere Migracion |
|---|--------------|-------------|---------|-----------|-------------------|
| F2.1 | Analisis de clientes recurrentes | Media | Alto | 8-10h | No |
| F2.2 | Historial de estados (tiempos) | Media | Muy Alto | 10-12h | Si (nueva tabla) |
| F2.3 | Food cost y margen bruto | Media | Muy Alto | 12-15h | Si (campo nuevo) |
| F2.4 | Cierre de caja (End of Day) | Baja-Media | Alto | 6-8h | No |
| F2.5 | Combos frecuentes | Media | Medio | 6-8h | No |
| F2.6 | Dashboard tiempo real | Media | Alto | 8-10h | No |
| F2.7 | Metricas de crecimiento | Media | Alto | 6-8h | No |
| F2.8 | Exportacion CSV | Baja | Medio | 4-5h | No |
| | **TOTAL FASE 2** | | | **60-76h** | |

**Valor entregado:** El producto compite con Fudo en reportes y supera en analytics geoespacial y de clientes.

#### FASE 3 -- Nice-to-Have (Sprint 6+, mejora continua)

| # | Funcionalidad | Complejidad | Impacto | Horas Est. | Requiere Migracion |
|---|--------------|-------------|---------|-----------|-------------------|
| F3.1 | Heatmap geografico | Media | Alto | 10-12h | No |
| F3.2 | Descuentos y promociones | Alta | Alto | 20-25h | Si (tabla nueva) |
| F3.3 | Historial de precios | Media | Medio | 8-10h | Si (tabla nueva) |
| | **TOTAL FASE 3** | | | **38-47h** | |

**Valor entregado:** Funcionalidades premium que justifican pricing diferenciado y posicionan como alternativa seria a Fudo.

### Esfuerzo Total Estimado

| Fase | Horas | Semanas (~20h/semana) | Costo Relativo |
|------|-------|----------------------|----------------|
| Fase 1 (MVP) | 33-43h | 2-3 semanas | Bajo |
| Fase 2 (Growth) | 60-76h | 3-4 semanas | Medio |
| Fase 3 (Premium) | 38-47h | 2-3 semanas | Medio-Alto |
| **TOTAL** | **131-166h** | **7-10 semanas** | |

---

## 5. Recomendaciones Tecnicas de Implementacion

### 5.1 Libreria de Charts: Recharts (mantener)

El proyecto ya usa **Recharts 3.7.0** y tiene un componente funcional (`SalesChart`). Recomendacion: **mantener Recharts** por las siguientes razones:

| Criterio | Recharts (actual) | Nivo | Tremor |
|----------|-------------------|------|--------|
| Ya instalado | Si | No | No |
| Compatibilidad con stack | Excelente (React 19) | Buena | Buena |
| Curva de aprendizaje | Baja (ya hay codigo) | Media | Baja |
| Tipos de chart necesarios | Area, Bar, Pie, Line | Todos | Todos |
| Customizacion de tema oscuro | Manual pero factible | Built-in | Tailwind-based |
| Bundle size | ~30KB gzipped | ~50KB | ~35KB (meta de Recharts) |
| Comunidad / soporte | Madura, estable | Creciente | Creciente |

**Conclusion:** No hay justificacion para cambiar de libreria. Recharts cubre todos los tipos de chart necesarios (AreaChart para ventas, BarChart para horarios/dias, PieChart para metodos de pago, LineChart para tendencias). La customizacion al tema oscuro del admin ya esta resuelta en `SalesChart`.

**Si en el futuro se necesita el heatmap geografico (F3.1):** Usar `leaflet.heat` como plugin de Leaflet (ya integrado), no un chart library.

### 5.2 Arquitectura de Server Actions para Analytics

Crear un nuevo archivo dedicado para separar responsabilidades:

```
app/actions/
  analytics.ts          <-- NUEVO: todas las queries de analytics
  dashboard.ts          <-- existente: mantener para stats basicas del dashboard
  orders.ts             <-- existente: CRUD de ordenes
```

**Patron recomendado para cada action de analytics:**

```typescript
// app/actions/analytics.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'

// Tipo union para periodos reutilizable
type AnalyticsPeriod = '7d' | '14d' | '30d' | '90d'

// Helper para calcular fechas de inicio segun periodo
function getPeriodStartDate(period: AnalyticsPeriod): Date {
  const now = new Date()
  const days = { '7d': 7, '14d': 14, '30d': 30, '90d': 90 }
  const start = new Date(now)
  start.setDate(start.getDate() - days[period])
  start.setHours(0, 0, 0, 0)
  return start
}

// Helper para calcular el periodo anterior equivalente
function getPreviousPeriodDates(period: AnalyticsPeriod): { start: Date; end: Date } {
  const days = { '7d': 7, '14d': 14, '30d': 30, '90d': 90 }
  const end = getPeriodStartDate(period)
  const start = new Date(end)
  start.setDate(start.getDate() - days[period])
  return { start, end }
}

// Patron de cada action
export async function getAnalyticsReport(
  period: AnalyticsPeriod
): Promise<{ data: SomeType | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const startDate = getPeriodStartDate(period)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, created_at, status, ...')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelado')

    if (error || !orders) {
      devError('Error fetching analytics:', error)
      return { data: null, error: 'Error al cargar datos' }
    }

    // Procesamiento en JavaScript (adecuado para <1000 ordenes)
    // Para volumen mayor, migrar a funciones SQL o vistas materializadas

    return { data: processedData, error: null }
  } catch (error) {
    devError('Error in analytics:', error)
    return { data: null, error: 'Error inesperado' }
  }
}
```

### 5.3 Pagina de Analytics en el Admin

Crear una nueva ruta dedicada para analytics avanzados:

```
app/admin/analytics/
  page.tsx              <-- Server component que fetches datos
  analytics-dashboard.tsx  <-- Client component con tabs y charts
```

**Estructura de navegacion sugerida:**

```
Admin Sidebar:
  Dashboard (existente) -- resumen rapido con stats cards
  Pedidos (existente) -- gestion de ordenes
  Productos (existente) -- CRUD de productos
  Categorias (existente) -- CRUD de categorias
  Zonas de Delivery (existente) -- mapa de zonas
  Analytics (NUEVO) -- reportes detallados con tabs:
    - Ventas (horario, diario, semanal, configurable)
    - Productos (top productos, combos, food cost)
    - Clientes (recurrencia, segmentacion, crecimiento)
    - Delivery (zonas, heatmap, shipping)
    - Operaciones (tiempos, cancelaciones, cierre de caja)
  Configuracion (existente)
```

### 5.4 Estrategia de Cache y Performance

Para reportes que se calculan sobre datos historicos (no cambian frecuentemente):

```typescript
import { unstable_cache } from 'next/cache'

// Cache de 5 minutos para reportes del dia
const getCachedDailyStats = unstable_cache(
  async () => getDashboardStats(),
  ['daily-stats'],
  { revalidate: 300 }  // 5 minutos
)

// Cache de 1 hora para reportes de 30+ dias
const getCachedMonthlyReport = unstable_cache(
  async () => getMonthlyReport(),
  ['monthly-report'],
  { revalidate: 3600 }  // 1 hora
)
```

**Para volumen alto (>500 ordenes en un periodo):** Considerar funciones SQL en Supabase para hacer las agregaciones en la base de datos en lugar de traer todos los registros al servidor:

```sql
-- Ejemplo: vista materializada para ventas por hora
CREATE MATERIALIZED VIEW mv_hourly_sales AS
SELECT
  date_trunc('hour', created_at) AS hour,
  COUNT(*) AS order_count,
  SUM(total) AS revenue,
  AVG(total) AS avg_ticket
FROM orders
WHERE status != 'cancelado'
GROUP BY date_trunc('hour', created_at)
ORDER BY hour;

-- Refresh cada 15 minutos via cron job de Supabase
```

### 5.5 Componentes UI Reutilizables para el Dashboard de Analytics

```typescript
// Componentes sugeridos para crear:

// 1. PeriodSelector - selector de periodo reutilizable
interface PeriodSelectorProps {
  value: AnalyticsPeriod
  onChange: (period: AnalyticsPeriod) => void
  options?: AnalyticsPeriod[]
}

// 2. MetricCard - card de metrica con tendencia (extiende StatsCard)
interface MetricCardProps {
  title: string
  value: string | number
  previousValue?: number
  format?: 'currency' | 'percentage' | 'number'
  invertTrend?: boolean  // para metricas donde "menos es mejor" (cancelaciones)
}

// 3. ChartContainer - wrapper con titulo, periodo y export
interface ChartContainerProps {
  title: string
  subtitle?: string
  period: AnalyticsPeriod
  onPeriodChange: (period: AnalyticsPeriod) => void
  onExport?: () => void
  children: React.ReactNode
}

// 4. DataTable - tabla sortable con paginacion (para top productos, clientes)
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  sortable?: boolean
  exportable?: boolean
}
```

---

## 6. Comparativa Final: Que Copado Actual vs. Con Roadmap Implementado

| Funcionalidad | Fudo (Pro) | Toast | Square | QC (actual) | QC (Fase 1) | QC (Fase 2) | QC (Fase 3) |
|--------------|-----------|-------|--------|-------------|-------------|-------------|-------------|
| Ventas dia/semana/mes | Si | Si | Si | Basico | Mejorado | Mejorado | Mejorado |
| Periodo comparativo | Si | Si | Si | No | **Si** | Si | Si |
| Ventas por hora | Si | Si | Si | No | **Si** | Si | Si |
| Ventas por dia semana | Si | Si | Si | No | **Si** | Si | Si |
| Tasa cancelacion | No | Si | Si | No | **Si** | Si | Si |
| Metodo de pago | Si | Si | Si | No | **Si** | Si | Si |
| Top productos (avanzado) | Si | Si | Si | Basico | **Mejorado** | Mejorado | Mejorado |
| Chart configurable | Si | Si | Si | 7d fijo | **7-90d** | 7-90d | 7-90d |
| Ventas por zona geo | **No** | **No** | **No** | No | **Si** | Si | Si |
| Revenue de shipping | No | No | No | No | **Si** | Si | Si |
| Clientes recurrentes | No | Si | Si | No | No | **Si** | Si |
| Tiempos operacionales | No | Si | Si | No | No | **Si** | Si |
| Food cost / margen | Si (Pro) | Si | No | No | No | **Si** | Si |
| Cierre de caja | Si | Si | Si | No | No | **Si** | Si |
| Combos frecuentes | No | Si | No | No | No | **Si** | Si |
| Dashboard realtime | No | Si | Si | No | No | **Si** | Si |
| Metricas crecimiento | No | Si | Si | No | No | **Si** | Si |
| Export CSV | Si | Si | Si | No | No | **Si** | Si |
| Heatmap geografico | **No** | **No** | **No** | No | No | No | **Si** |
| Promociones | Si | Si | Si | No | No | No | **Si** |
| Historial precios | No | Si | No | No | No | No | **Si** |
| IA / Predictivo | No | Si (2026) | Si (2025) | No | No | No | Futuro |

**Ventajas competitivas unicas de Que Copado (post Fase 2):**
1. Analisis geoespacial (zonas + heatmap) -- ninguna plataforma POS lo ofrece a nivel individual
2. Checkout via WhatsApp con analytics integrados -- modelo unico en LATAM
3. Cierre de caja con resumen enviable por WhatsApp -- nativo del flujo
4. Shipping analytics detallado -- ninguna plataforma POS desglosa revenue de envio vs envio gratis

---

## Disclaimer

Este analisis es un **ejercicio de ingenieria inversa conceptual** basado en:

- Informacion publica de los sitios web de Fudo (fu.do), Toast (pos.toasttab.com), Square (squareup.com), PedidosYa (centrodesocios.pedidosya.com), iFood, Lightspeed y TouchBistro
- Documentacion de soporte, blogs y reportes de precios publicados por estas plataformas
- Busquedas web actualizadas a febrero 2026 sobre features y tendencias de la industria
- Conocimiento de la industria FoodTech y patrones estandar de sistemas POS
- Analisis directo del codigo fuente y base de datos del proyecto Que Copado (Supabase produccion)

**No se accedio** a codigo fuente propietario, documentacion confidencial, ni informacion privilegiada de ninguna de las plataformas analizadas. Las implementaciones reales pueden diferir significativamente de las inferencias realizadas.

Este documento es para **planificacion arquitectonica y toma de decisiones de producto** exclusivamente.

---

## Fuentes Consultadas

- [Fudo - Precios, funciones y opiniones (ComparaSoftware)](https://www.comparasoftware.com/fudo)
- [Fudo - Guia definitiva: que POS me conviene](https://blog.fu.do/guia-definitiva-que-sistema-pos-para-restaurantes-me-conviene-requisitos-y-sugerencias-para-elegir-software-gastronomico)
- [Fudo - Precios por plan](https://fu.do/es-mx/precios/)
- [Fudo - 2026 Features & Reviews (GetApp)](https://www.getapp.com/retail-consumer-services-software/a/fudo/)
- [Toast POS - Restaurant Reporting & Analytics](https://pos.toasttab.com/products/reporting)
- [Toast - AI-Driven Operations (Restaurant Technology News, Dec 2025)](https://restauranttechnologynews.com/2025/12/toast-signals-next-phase-of-restaurant-technology-competition-with-expanded-focus-on-ai-driven-operations/)
- [Toast - In-Depth Review 2026](https://theretailexec.com/tools/toast-review/)
- [Toast - Software for Restaurants 2026 (Slam Media Lab)](https://www.slammedialab.com/post/toast-software)
- [Square for Restaurants - Run Performance Reports](https://squareup.com/help/us/en/article/6433-reporting-with-square-for-restaurants)
- [Square - POS Analytics and Reporting](https://squareup.com/us/en/point-of-sale/features/dashboard/analytics)
- [Square - AI Voice Ordering, Cost Control (Restaurant Technology News, Oct 2025)](https://restauranttechnologynews.com/2025/10/square-goes-all-in-on-restaurants-with-new-ai-voice-ordering-smarter-cost-control-and-integrated-bitcoin-banking/)
- [Square - 2025 Product Releases Vol. 2 (Square Community)](https://community.squareup.com/t5/Product-Updates/Square-Releases-Vol-2-2025-New-tools-for-restaurants/ba-p/820230)
- [PedidosYa - Centro de Socios](https://centrodesocios.pedidosya.com/)
- [PedidosYa - Crecio 22% en ordenes en 2025 (Revista Mercado)](https://mercado.com.ar/tendencias/pedidosya-crecio-22-en-ordenes-en-2025-y-gano-peso-en-super-online/)
- [iFood - Retrospectiva 2025 para restaurantes (Giro News)](https://gironews.com/food-service/ifood-lanca-a-retrospectiva-2025-para-os-restaurantes-parceiros/)
- [iFood - 83% crecimiento en base de restaurantes 2025](https://www.ecommercebrasil.com.br/noticias/ifood-tem-alta-de-83-na-base-de-restaurantes-cadastrados-em-2025)
- [8 Best React Chart Libraries 2025 (Embeddable)](https://embeddable.com/blog/react-chart-libraries)
- [Nivo vs Recharts Comparison (Speakeasy)](https://www.speakeasy.com/blog/nivo-vs-recharts)
- [shadcn-ui Chart Libraries Discussion (GitHub)](https://github.com/shadcn-ui/ui/discussions/4133)
- [Best React Chart Libraries 2025 (LogRocket)](https://blog.logrocket.com/best-react-chart-libraries-2025/)
