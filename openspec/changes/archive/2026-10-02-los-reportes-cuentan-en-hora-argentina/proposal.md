# Proposal

## Why

Analytics y el Dashboard calculan "hoy", "esta semana", "este mes", los días
del gráfico, la hora pico y el día de la semana con el reloj del servidor.
Vercel corre en UTC, tres horas adelante de Argentina. Medido contra
producción el 2026-10-02, últimos 30 días:

| | |
|---|---|
| Pedidos | 76 |
| **Entre las 21:00 y la medianoche** (cuentan en el día siguiente) | **19 (25 %)**, $ 305.100 |
| Gráfico de horas | **todas** corridas 3 horas |
| "Hoy" del Dashboard | de 21:00 a 21:00, no de 0:00 a 0:00 |

Ya estaba anotado como "hallazgo relacionado, no tocado" en `tasks/todo.md`
(2026-09-11). En local no se nota: la máquina de David está en hora
argentina.

## What Changes

- `lib/utils/calendario-del-local.ts`: el día, la hora, el día de la semana,
  el lunes y el primero del mes **en hora argentina**, sin depender de la zona
  del servidor ni del navegador. Argentina no tiene horario de verano desde
  2009: el desfase es fijo (-03:00), como ya asume `order-date-range.ts`.
- `app/actions/analytics.ts` y `app/actions/dashboard.ts` lo usan en todos los
  cortes por día, semana, mes, hora y día de la semana.

## Capabilities

### New Capabilities

- `reportes-en-hora-argentina`: los reportes cuentan el día del local.

## Fuera de alcance

- La pantalla de Pedidos y la caja: ya usan `order-date-range.ts` /
  `diaDelLocal` y están bien.

## Toca AgentePOS

No.
