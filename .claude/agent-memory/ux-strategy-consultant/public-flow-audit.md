---
name: Auditoría UX — Flujo Público (sesión 8)
description: Análisis completo de las pantallas públicas D1-DD4 (catálogo, detalle, carrito, checkout, confirmación WSP) con heurísticas, gaps de implementación y decisiones técnicas
type: project
---

# Auditoría UX Flujo Público — Que Copado

**Fecha:** 2026-03-24
**Scope:** Pantallas públicas: catálogo, detalle de producto, carrito, checkout, confirmación WhatsApp

## Gaps críticos (NO IMPLEMENTADOS)

1. **Detalle de producto** (`D7` mobile / `DD2` desktop modal) — no existe `/productos/[id]`
   - Falta: descripción completa, textarea observaciones, stepper cantidad, sticky CTA precio
   - Decisión técnica recomendada: **Parallel Routes + Route Interception** de Next.js App Router
   - Ruta canónica: `app/productos/[id]/page.tsx`
   - Interceptor: `app/@modal/(.)productos/[id]/page.tsx`
   - Componente compartido: `components/product-detail.tsx`

2. **Confirmación WhatsApp** (`D4` mobile / `DD4` desktop) — no existe `/confirmation/[orderId]`
   - El checkout actual abre WhatsApp directamente sin persistir pedido en BD
   - Flujo correcto: Server Action → crea pedido en `orders` → retorna `orderId` → redirect a `/confirmation/[orderId]`
   - La confirmación lee el pedido de BD y genera el deep link WhatsApp
   - **Decisión pendiente con cliente:** ¿el pedido existe en DB antes de WhatsApp, o después?

## Observaciones en CartItem — pendiente de implementar

- Agregar `observations?: string` a la interfaz `CartItem` en `lib/store/cart-store.ts`
- El `addItem` del store debe aceptar `observations` opcional
- `getCartItemKey` NO cambia (observaciones no crean instancias separadas del mismo producto)
- Verificar que Server Action de checkout incluya observaciones en `order_items`

## Problemas identificados (implementados pero con fricción)

### Catálogo (D1/DD1)
- Badge `best-seller` se asigna por posición de array (primeros 4 del primer cat) — no es dato real
  - Fix: agregar `badge` como campo en tabla `products` (null | 'new' | 'promo' | 'best-seller')
- Descripción oculta en mobile (`hidden md:block`) — en gastronomía el detalle de ingredientes es crítico
- Precio del carrito no visible en header mobile (el diseño D1 lo muestra)

### Carrito (D2)
- `OrderSummary` muestra "Total" pero sin envío calculado — label engañoso
  - Fix: llamar "Subtotal" hasta que el envío esté calculado en checkout
- Sin precio unitario visible en `CartItem` (solo precio total × cantidad)
- El envío "Se calcula al ingresar tu dirección" está en texto gris pequeño — insuficiente peso visual

### Checkout (D3/DD3)
- **Sticky CTA mobile FALTANTE:** el botón "Confirmar pedido · $precio" debe ser sticky bottom bar en mobile
  - Actualmente el botón está en `CheckoutSummary` que queda al final del scroll
- Mensaje de error "fuera de cobertura" aparece al top de página, lejos del input de dirección
  - Fix: mover feedback de error de cobertura inline, cerca del input de dirección + mapa

## Decisiones de animación (Framer Motion)

- Detalle producto (página mobile): `y: 20, opacity: 0 → y: 0, opacity: 1` (300ms ease-out)
- Detalle producto (modal desktop): `scale: 0.95, opacity: 0 → scale: 1, opacity: 1` (250ms)
- Checkmark en confirmación: spring `scale: 0 → 1.1 → 1` (efecto rebote = satisfacción)
- Sticky CTA checkout: `y: 100 → 0` cuando precio está calculado

## Half-pizza selector

- Completamente implementado en `product-grid.tsx` como Radix Sheet
- Git status: `half-pizza-card.tsx` fue ELIMINADO (D) — verificar que no haya imports residuales
- Recomendación: extraer el sheet a `components/half-pizza-selector/index.tsx` para facilitar testing
- Problema menor: pizzas agotadas se filtran completamente en lugar de mostrarse deshabilitadas con badge "Sin stock"

## Archivos clave del flujo público

- `app/page.tsx` — página home, server component, calcula stockMap
- `app/cart/page.tsx` — carrito, client component
- `app/checkout/page.tsx` — checkout, usa `useCheckout` hook
- `components/product-card.tsx` — card del catálogo, maneja mitad click
- `components/product-grid.tsx` — grid + filtro + sheet mitad-y-mitad
- `components/cart-item.tsx` — item del carrito con imagen split para mitades
- `components/order-summary.tsx` — resumen con CTA checkout
- `components/header.tsx` — header negro con logo + CartDrawer
- `lib/store/cart-store.ts` — Zustand store con CartItem interface

## Contexto de usuario target

- Mobile-first (70%+ tráfico estimado)
- Argentina — contexto cultural: WhatsApp es canal de pedidos normalizado
- Alta urgencia (tiene hambre) — cada fricción tiene costo de conversión alto
- Comparación con PedidosYa/Rappi — el flujo debe cumplir convenciones de esas apps
