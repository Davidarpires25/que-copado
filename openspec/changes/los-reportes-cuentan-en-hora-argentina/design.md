# Design

## Decisions

### 1. Un módulo de calendario del local, sin zona del proceso

Todo se calcula con `Intl.DateTimeFormat` con `timeZone` explícito o con
aritmética UTC sobre fechas `YYYY-MM-DD`. Ninguna función usa `getHours`,
`getDay`, `setHours` ni `toISOString().split('T')` sobre un instante: esas
dependen de la zona del proceso, que en Vercel es UTC.

- `diaDelLocal(momento)` → `YYYY-MM-DD` en Argentina.
- `sumarDias(dia, n)`, `lunesDe(dia)`, `primeroDelMes(dia, mesesAtras)` →
  `YYYY-MM-DD`.
- `inicioDelDia(dia)` → el instante de las 0:00 de ese día en Argentina
  (`dia + 'T00:00:00-03:00'`), para filtrar `created_at >=`.
- `horaDelLocal(momento)`, `diaDeLaSemana(dia)`.
- `etiquetaDelDia(dia, opciones)` → formatea el día suelto en UTC, para que no
  se corra a la víspera.

### 2. Mismo rango que antes

Cada función conserva el rango que tenía (por ejemplo, "30d" sigue siendo
desde las 0:00 de hace 30 días); solo cambia en qué zona se mide.
