# Documentación - Que Copado

Esta carpeta contiene toda la documentación técnica del proyecto.

## Índice de Documentos

### Sistema de Shipping Dinámico por Zonas

1. **[SHIPPING_IMPLEMENTATION_SUMMARY.md](./SHIPPING_IMPLEMENTATION_SUMMARY.md)** ⭐ **EMPEZAR AQUÍ**
   - Resumen ejecutivo de la implementación
   - Archivos creados y modificados
   - Casos de uso cubiertos
   - Checklist de producción
   - **Lectura: 5 minutos**

2. **[SHIPPING_ZONES.md](./SHIPPING_ZONES.md)**
   - Documentación técnica completa (10,000+ palabras)
   - Arquitectura del sistema
   - Flujo de funcionamiento detallado
   - Componentes y servicios
   - Manejo de errores y optimizaciones
   - Referencias y troubleshooting
   - **Lectura: 30-45 minutos**

3. **[TESTING_SHIPPING.md](./TESTING_SHIPPING.md)**
   - Guía de testing exhaustiva
   - 10 casos de prueba con pasos detallados
   - Validación de datos y formatos
   - Debugging y errores comunes
   - Checklist completo
   - **Lectura: 20 minutos**

## Orden de Lectura Recomendado

### Para Implementadores / Desarrolladores

1. **Primero:** [SHIPPING_IMPLEMENTATION_SUMMARY.md](./SHIPPING_IMPLEMENTATION_SUMMARY.md)
   - Entender qué se implementó y qué archivos se modificaron

2. **Segundo:** [TESTING_SHIPPING.md](./TESTING_SHIPPING.md)
   - Ejecutar tests manuales para verificar funcionamiento

3. **Tercero:** [SHIPPING_ZONES.md](./SHIPPING_ZONES.md)
   - Profundizar en detalles técnicos según necesidad

### Para Product Managers / QA

1. **Primero:** [SHIPPING_IMPLEMENTATION_SUMMARY.md](./SHIPPING_IMPLEMENTATION_SUMMARY.md)
   - Casos de uso y funcionalidad

2. **Segundo:** [TESTING_SHIPPING.md](./TESTING_SHIPPING.md)
   - Ejecutar tests de aceptación

### Para Mantenimiento / Debugging

1. **Primero:** [SHIPPING_ZONES.md](./SHIPPING_ZONES.md) - Sección "Troubleshooting"
   - Soluciones a problemas comunes

2. **Segundo:** [TESTING_SHIPPING.md](./TESTING_SHIPPING.md) - Sección "Debugging"
   - Herramientas y técnicas de debugging

## Quick Links

### Archivos de Implementación

**Server Actions:**
- `/app/actions/shipping.ts` - Cálculo server-side
- `/app/actions/delivery-zones.ts` - CRUD de zonas

**Servicios:**
- `/lib/services/shipping.ts` - Lógica de cálculo

**Componentes:**
- `/app/checkout/page.tsx` - Página de checkout
- `/components/checkout/delivery-form.tsx` - Formulario de entrega
- `/components/checkout/checkout-summary.tsx` - Resumen del pedido

**Tipos:**
- `/lib/types/database.ts` - TypeScript types

**Migraciones:**
- `/supabase/migrations/20240209_delivery_zones.sql` - Schema de DB

### Recursos Externos

- [Turf.js Documentation](https://turfjs.org/) - Librería de cálculos geoespaciales
- [GeoJSON Specification](https://geojson.org/) - Formato de polígonos
- [Leaflet Geoman](https://geoman.io/leaflet-geoman) - Dibujo de polígonos
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security) - Row Level Security

## Changelog

### 2026-02-09 - Implementación Inicial
- ✅ Sistema de zonas de delivery
- ✅ Cálculo dinámico de shipping
- ✅ Validación server-side
- ✅ UI/UX con loading states
- ✅ Documentación completa

## Contacto

Para preguntas o reportar bugs relacionados con este sistema:
1. Revisar sección de Troubleshooting en [SHIPPING_ZONES.md](./SHIPPING_ZONES.md)
2. Ejecutar tests de [TESTING_SHIPPING.md](./TESTING_SHIPPING.md)
3. Consultar con el equipo de desarrollo

---

**Última actualización:** 2026-02-09
