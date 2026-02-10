# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Que Copado is a Next.js SaaS application for a burger restaurant (hamburguesería). It provides:
- Public product catalog with persistent shopping cart
- WhatsApp-based checkout with delivery address selection (map + autocomplete)
- Admin dashboard for product/category management

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
