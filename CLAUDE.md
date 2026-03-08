# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Que Copado is a Next.js SaaS application for a burger restaurant (hamburguesería). It provides:
- Public product catalog with persistent shopping cart
- WhatsApp-based checkout with delivery address selection (map + autocomplete)
- Admin dashboard for product/category management

## Orquestación del Flujo de Trabajo

### 1. Modo Planificación por Defecto
- Entra en modo planificación para CUALQUIER tarea no trivial (más de 3 pasos o decisiones arquitectónicas)
- Si algo sale mal, PARA y vuelve a planificar de inmediato; no sigas forzando
- Usa el modo planificación para los pasos de verificación, no solo para la construcción
- Escribe especificaciones detalladas por adelantado para reducir la ambigüedad

### 2. Estrategia de Subagentes
- Usa subagentes con frecuencia para mantener limpia la ventana de contexto principal
- Delega la investigación, exploración y análisis paralelo a subagentes
- Para problemas complejos, dedica más capacidad de cómputo mediante subagentes
- Una tarea por subagente para una ejecución focalizada

### 3. Bucle de Automejora
- Tras CUALQUIER corrección del usuario: actualiza `tasks/lessons.md` con el patrón
- Escribe reglas para ti mismo que eviten el mismo error
- Itera implacablemente sobre estas lecciones hasta que la tasa de errores disminuya
- Revisa las lecciones al inicio de la sesión para el proyecto correspondiente

### 4. Verificación antes de Finalizar
- Nunca marques una tarea como completada sin demostrar que funciona
- Compara la diferencia (diff) de comportamiento entre la rama principal y tus cambios cuando sea relevante
- Pregúntate: "¿Aprobaría esto un ingeniero senior (Staff Engineer)?"
- Ejecuta tests, comprueba los logs y demuestra la corrección del código

### 5. Exige Elegancia (Equilibrado)
- Para cambios no triviales: haz una pausa y pregunta "¿hay una forma más elegante?"
- Si un arreglo parece un parche (hacky): "Sabiendo todo lo que sé ahora, implementa la solución elegante"
- Omite esto para arreglos simples y obvios; no hagas sobreingeniería
- Cuestiona tu propio trabajo antes de presentarlo

### 6. Corrección de Errores Autónoma
- Cuando recibas un informe de error: simplemente arréglalo. No pidas que te lleven de la mano
- Identifica logs, errores o tests que fallan y luego resuélvelos
- Cero necesidad de cambio de contexto por parte del usuario
- Ve a arreglar los tests de CI que fallan sin que te digan cómo

## Gestión de Tareas

1. **Planificar Primero**: Escribe el plan en `tasks/todo.md` con elementos verificables
2. **Verificar Plan**: Confirma antes de comenzar la implementación
3. **Seguir el Progreso**: Marca los elementos como completados a medida que avances
4. **Explicar Cambios**: Resumen de alto nivel en cada paso
5. **Documentar Resultados**: Añade una sección de revisión a `tasks/todo.md`
6. **Capturar Lecciones**: Actualiza `tasks/lessons.md` después de las correcciones

## Principios Fundamentales

- **Simplicidad Primero**: Haz que cada cambio sea lo más simple posible. Afecta al mínimo código necesario.
- **Sin Pereza**: Encuentra las causas raíz. Nada de arreglos temporales. Estándares de desarrollador senior.
- **Impacto Mínimo**: Los cambios solo deben tocar lo necesario. Evita introducir errores.



## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # Run ESLint
```

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router) + React 19.2.3 + TypeScript
- **Database:** Supabase (PostgreSQL with RLS)
- **State:** Zustand with localStorage persistence (cart)
- **UI:** Tailwind CSS 4 + Shadcn/UI + Radix UI + Framer Motion
- **Maps:** Leaflet + react-leaflet + Geoman (address picker, zone drawing)
- **Geospatial:** Turf.js (point-in-polygon calculations)

## Architecture

### Server/Client Split

- **Server Components:** Data fetching pages (`app/page.tsx`, `app/admin/dashboard/page.tsx`)
- **Server Actions:** Database mutations in `app/actions/` (auth, products, categories)
- **Client Components:** Interactive features marked with `'use client'`

### Key Directories

- `app/actions/` - Server Actions for Supabase mutations (auth, products, categories, delivery-zones, shipping)
- `lib/supabase/` - Supabase clients (browser, server, admin)
- `lib/store/cart-store.ts` - Zustand cart store with persistence
- `lib/services/` - Business logic services (shipping, geocoding)
- `components/ui/` - Shadcn/UI components
- `components/checkout/` - Delivery form, address autocomplete, map picker
- `docs/` - Technical documentation (shipping system, testing guides)

### Database Schema

Tables: `categories`, `products`, `orders`, `delivery_zones`
- RLS enabled: public read for active products/zones, authenticated write for admin
- Products have `is_active` (visibility) and `is_out_of_stock` (availability) toggles
- Delivery zones use GeoJSON polygons for geographic boundaries

### Route Protection

- Public: `/`, `/cart`, `/checkout`
- Protected: `/admin/*` (middleware.ts checks auth)

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_WHATSAPP_NUMBER=<whatsapp-business-number>
```

## Business Logic

### Shipping System (Dynamic Zones)

- **Zone-based shipping:** Costs calculated based on customer location within configured delivery zones
- **Fallback shipping:** $1,500 ARS (when zones not configured)
- **Free shipping threshold:** Configurable per zone (default: $15,000 ARS)
- **Coverage validation:** Orders blocked if address is outside all delivery zones
- **Calculation:** Uses Turf.js for point-in-polygon detection with GeoJSON polygons

**Implementation details:** See `/docs/SHIPPING_ZONES.md`

### Checkout Flow

- **Checkout:** Generates WhatsApp message with order details + Google Maps link + detected zone
- **Currency:** Argentine Peso (ARS), formatted with `formatPrice()` from `lib/utils.ts`
- **Server-side validation:** Shipping recalculated on server before WhatsApp message generation

## Styling Conventions

- Theme: Orange/amber gradients for public, dark slate for admin
- Custom classes: `input-large`, `shadow-warm`, `shadow-warm-lg` (defined in `globals.css`)
- Path alias: `@/*` maps to project root
