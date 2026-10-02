# Tasks

- [x] 1.1 `lib/utils/calendario-del-local.ts`. Verifica: test con el proceso
      en UTC, un pedido de las 22:30 de Argentina cae en su día, su hora es 22
      y su día de la semana el de Argentina.
- [x] 1.2 `analytics.ts` y `dashboard.ts` lo usan. Verifica: un test que falla
      si esos archivos vuelven a usar `getHours`, `getDay`, `setHours` o
      `toISOString().split('T')`; lint, tipos, build.
      Hecho: `e2e/calendario-del-local.spec.ts` (3 tests, con el proceso en
      UTC); el de los archivos falla con el código viejo. Hidratación y
      tablas con el servidor en `TZ=UTC`: 10/10. Lint, tipos y build en verde.
- [x] 1.3 Después del despliegue, el gráfico de horas de producción muestra la
      noche en las 21–23 (y no en 0–2). Verifica: la pantalla.
      Hecho: desplegado en `393bfd4`; David lo revisó en producción
      (2026-10-02, "todo bien con el dashboard").
