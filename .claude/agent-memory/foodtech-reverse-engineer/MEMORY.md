# FoodTech Reverse Engineer - Agent Memory

## Project: Que Copado
- **Stack:** Next.js 16.1.6 + React 19 + Supabase + Recharts 3.7 + Leaflet + Zustand
- **DB Tables:** categories(8), products(19), orders(7), delivery_zones(5), business_settings(1)
- **Key file:** `app/actions/dashboard.ts` - existing analytics (stats, top products, sales chart 7d)
- **Key file:** `app/actions/orders.ts` - order CRUD with status management
- **Chart lib:** Recharts 3.7.0 already installed and themed for dark admin dashboard
- **Geo stack:** Leaflet + react-leaflet 5.0 + Turf.js already integrated

## FoodTech Analytics Patterns (confirmed via research)
- See `analytics-patterns.md` for detailed platform comparisons
- Geospatial analytics (zone heatmaps) = gap in ALL POS platforms (Fudo, Toast, Square)
- Food cost/margin = premium feature (Fudo Pro, Toast advanced)
- IA-driven analytics = 2025-2026 trend (Toast ML, Square AI, iFood assistants)
- PedidosYa/iFood offer limited partner analytics vs full POS solutions

## Analytics Roadmap
- Full document: `/docs/ANALYTICS_ROADMAP.md` (updated 2026-02-16)
- Phase 1 (no migrations): 9 features, 33-43h, all using existing data
- Phase 2 (moderate changes): 8 features, 60-76h, 2 migrations needed
- Phase 3 (premium): 3 features, 38-47h, 2 new tables

## Key Technical Decisions
- StatsCard component already supports `trend` prop (unused) - quick win for comparatives
- orders.items is JSONB - adequate for <500 orders, normalize to order_items table at scale
- customer_phone serves as virtual customer ID (no separate customers table needed yet)
- Recommended new file: `app/actions/analytics.ts` for all analytics server actions
