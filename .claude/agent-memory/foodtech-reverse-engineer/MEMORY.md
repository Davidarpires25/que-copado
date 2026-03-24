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

## Thermal Printer Integration (researched 2026-03-13)
See `printer-architecture.md` for full analysis. Key findings:
- **Industry standard**: ESC/POS command set (Epson proprietary, widely adopted by Star, Bixolon, etc)
- **Toast POS**: Epson TM-T88V (receipt) + TM-U220B (kitchen), configured via local POS device
- **Square for Restaurants**: Star Micronics TSP143III, configured in Settings > Printers
- **Lightspeed Restaurant**: LAN/WiFi Epson printers, Kitchen Display System (KDS) as digital alternative
- **Enterprise options**: QZ Tray (web POS), CloudPRNT (Star polling model), Node.js agent (network only)
- **Que Copado path**: Local Node.js agent with ESC/POS TCP:9100 = best fit for Next.js SaaS

## Fudo POS Variantes & "Mitad y Mitad" (researched 2026-03-23)
See `fudo-variants-model.md` for detailed analysis. Key findings:
- **Core mechanism**: Grupos Modificadores (not native variants) - flexible option groups per product
- **Price logic**: Suma (additive) or Máximo (takes highest) - for sizes/options
- **Recipes**: Product-bound (1 recipe per product), cost calculated auto from ingredients + merma%
- **Half-pizza approach**: Two separate Grupos Modificadores (Primera Mitad, Segunda Mitad) with same options
- **Cost model**: Fudo uses fixed price (admin-configured), NOT dynamic recalculation based on modifier selections
- **Que Copado opportunity**: More sophisticated = recetas componibles + costo dinámico (50%+50% ingredient breakdown)
