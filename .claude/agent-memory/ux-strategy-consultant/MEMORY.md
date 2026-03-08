# Memoria UX — Que Copado Admin Panel

## Tipografía
- **Fuente pública:** Rubik (400-900) — correcta para store-facing, tono amigable
- **Fuente admin:** Inter (400-700) — aplicada via clase `.admin-layout` en el wrapper
- **Fuente mono:** Geist Mono — para valores de código
- **Estrategia:** Inter se carga en `app/layout.tsx` con variable `--font-inter`, se aplica solo en `.admin-layout` (no contamina el store público)
- **Números tabulares:** Clase utilitaria `.num-tabular` en globals.css para alinear columnas de precios en POS y tablas

## Sistema de Design Admin — Tokens (Rev 2 — APLICADOS en sesion 3)
- Variables en bloque `.admin-layout` y `.admin-layout.dark` — archivo: `app/globals.css` lineas 382-431
- **Light:** bg `#F1F5F9`, surface `#FFFFFF`, surface-2 `#F3F6FA`, hover `#EDF1F7`, border `#CBD5E1`, text `#0F172A`, muted `#475569`, faint `#94A3B8`
- **Dark:** bg `#0F1117`, surface `#1C2333`, surface-2 `#252B3B`, hover `#252B3B`, border `#2D3448`, text `#F1F3F8`, muted `#8B9BB4`, faint `#5A677D`
- accent: `#FEC501` (sin cambio), accent-text light: `#B45309`, dark: `#FEC501`
- **Sombras light:** `--shadow-card / --shadow-card-md / --shadow-card-lg` (opacidades 0.04-0.10)
- **Sombras dark:** mismo esquema con opacidades 0.20-0.55 + `--shadow-inset-highlight: inset 0 1px 0 rgba(255,255,255,0.05)`
- **Ratios verificados:** Light surface/bg 1.10:1 + shadow compensa. Dark surface/bg 1.18:1, border 1.52:1

## Auditoria de Contraste — RESUELTOS (sesion 3)
- dark surface/bg CORREGIDO: `#1C2333` es mas claro que `#0F1117` (antes estaba invertido)
- StatsCard CORREGIDO: `bg-[var(--admin-surface)]` + `shadow-[var(--shadow-card)]` en `stats-card.tsx` linea 39
- text-muted light CORREGIDO: `#475569` = 7.58:1 sobre surface (WCAG AAA)

## POS / Caja — Arquitectura de tabs
- Tres modos: `'mostrador' | 'mesas' | 'historial'` (type `PosMode` en pos-interface.tsx)
- **Historial** es una pestaña inline (no modal) — componente `PosHistorialTab`
- `PosOrderHistory` (modal legacy) ya NO se usa en pos-interface — puede quedar para backward compat pero no se renderiza
- El botón "Ventas" en SessionStatusBar ahora llama `handleSwitchToHistorial` (cambia pestaña + carga datos)
- El historial se carga lazy: solo cuando el usuario navega a esa pestaña
- Background refresh: después de cada venta, si sessionOrders.length > 0 se refresca en background

## Archivos clave modificados (sesión 1)
- `app/layout.tsx` — Se agrega Inter con variable `--font-inter`
- `app/globals.css` — Se agrega `.admin-layout`, `.num-tabular`, `--font-admin`
- `components/admin/layout/admin-layout.tsx` — Se agrega clase `admin-layout` al wrapper root
- `app/admin/caja/caja-dashboard.tsx` — Se agrega clase `admin-layout` al wrapper full-screen
- `components/admin/dashboard/stats-card.tsx` — TrendingUp/Down en lugar de arrows Unicode
- `app/admin/dashboard/dashboard-overview.tsx` — Receipt en lugar de Clock para Ticket Promedio
- `components/admin/caja/pos-interface.tsx` — Tercera tab Historial integrada
- `components/admin/caja/pos-historial-tab.tsx` — NUEVO componente (creado desde cero)

## Bug Critico — Dark Mode Roto en Caja (PENDIENTE FIX)
- `AdminLayout` es el UNICO que agrega `html.admin-dark` via useEffect
- `CajaDashboard` no usa `AdminLayout`, por lo tanto dark mode NUNCA se activa en /caja
- Resultado: usuario con dark mode activo ve Caja en light (`#F1F5F9`) — flash blanco severo
- Fix requerido: `CajaDashboard` debe leer `useThemeStore` y gestionar la clase `admin-dark` independientemente
- Archivo: `app/admin/caja/caja-dashboard.tsx` + agregar clase `dark` condicional al wrapper root

## Issues UX — Auditoria Dashboard vs Caja (sesion 4)
- **CRITICO:** Dark mode no se activa en Caja (ver sección arriba)
- **ALTO:** Sidebar usa colores legacy hardcodeados `#1a1d24`/`#2a2f3a` en lugar de `var(--admin-surface)`/`var(--admin-border)` — archivo: `components/admin/layout/admin-sidebar.tsx` lineas 144, 100-101
- **ALTO:** Top bar "← Admin" es vago — deberia decir "← Dashboard". Badge "Abierta" tiene peso visual insuficiente para informacion critica de seguridad operativa
- **ALTO:** H1 de Caja es `text-sm` (14px) — incongruente con `text-2xl/3xl` del Dashboard. Subir a `text-base`
- **MEDIO:** Badge mesas usa `orange-400` hardcodeado, badge historial usa `var(--admin-accent-text)` — paletas incompatibles en la misma barra de tabs
- **MEDIO:** `ArrowUpCircle` en boton "Ventas" de SessionStatusBar tiene affordance erronea (parece upload/export) — cambiar a icono `History`
- **MEDIO:** Contador de mesas duplicado en tabs (badge) y en SessionStatusBar — eliminar de la status bar
- **BAJO:** Emoji 🍔 en sidebar/mobile header — reemplazar por SVG de Lucide (UtensilsCrossed)

## Tokens legacy vs tokens actuales — diferencia de paletas
- Legacy (sidebar hardcodeado): bg `#1a1d24`, hover `#252a35`, border `#2a2f3a`
- Actual dark mode: bg `#0F1117`, surface `#1C2333`, surface-2 `#252B3B`, border `#2D3448`
- Son visualmente similares pero distintos — la diferencia es perceptible al comparar elementos adyacentes

## Patrones de código confirmados
- Server Actions retornan `{ data: T | null; error: string | null }`
- POS usa layout full-screen sin AdminLayout (no sidebar, no header)
- AdminLayout wrappea todo el admin excepto /caja
- `useCallback` para handlers de items del carrito (previene re-renders del grid de productos)

## POS — Flujos de Pago (análisis sesion 5)
- **PaymentMethod tipo:** `'cash' | 'card' | 'transfer' | 'mercadopago'` — sin tipo `'hybrid'`
- **Mostrador flow:** Confirmar (status='abierto') → strip pendientes → PaymentPanel → completeMostadorPayment()
- **Mesa flow:** Abrir mesa → addItemsToOrder() con `sale_tag` → payTableOrder() cobra TODO de una vez
- **Limitacion crítica mostrador:** Strip de tarjetas tiene `min-w-[140px]` — demasiado pequeño para touch (viola Fitts)
- **Limitacion crítica mesas:** `payTableOrder` cobra la orden completa con UN solo método, no hay split por comensal
- **sale_tag:** existe en `order_items` como campo de texto libre, los chips de comensales filtran visualmente pero NO crean sub-ordenes
- **Emojis como íconos:** PaymentPanel usa '💵', '💳', '🏦' como iconos — no es Lucide, viola restriccion del proyecto
- **Pago híbrido:** No existe en ninguno de los dos flujos
- **BD implicacion pago por comensal:** Requiere crear N ordenes separadas por comensal O una tabla `payment_splits` que registre pagos parciales con método propio
- **payTableOrder action:** linea 465 en tables.ts — toma orderId, tableId, paymentMethod, sessionId — monolítico, sin splits
- **completeMostadorPayment action:** linea 269 en pos-orders.ts — igual, un método de pago por orden completa
