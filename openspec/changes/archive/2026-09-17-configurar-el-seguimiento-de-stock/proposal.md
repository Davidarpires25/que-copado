# Proposal

## Why

Dos molestias reportadas mientras se usaba el sistema, las dos en `/admin/stock`
y las dos sobre lo mismo: configurar cómo se vigila un ítem.

**La página salta al tope al activar el seguimiento.** Quien revisa las alertas
baja por la tabla, encuentra un producto de reventa sin seguimiento, lo activa y
pierde el lugar donde estaba. Con una tabla larga, cada activación cuesta volver
a buscar dónde iba.

**El mínimo no se puede cambiar solo.** El umbral que dispara la alerta se edita
únicamente dentro del diálogo de ajuste, en modo "corregir", y ese diálogo se
niega a guardar si el stock no cambia: *"El stock ya es ese valor"*. Para subir
un mínimo de 5 a 10 hay que además mover stock que no se movió. Eso deja un
movimiento falso en el historial, que es el mismo historial con el que después se
explica el consumo.

## What Changes

- **Activar o desactivar el seguimiento deja de mover la página.** La tabla ya
  refleja el cambio por su cuenta; lo que hace saltar el scroll es revalidar la
  página donde el usuario está parado.
- **El mínimo se edita por su cuenta**, desde la fila del ítem, sin pasar por un
  ajuste de stock y sin dejar movimientos.
- **Vale para ingredientes y para productos de reventa** por igual: las dos
  pestañas tienen el mismo problema.
- El diálogo de ajuste sigue pudiendo cambiar el mínimo cuando ya se está
  corrigiendo stock. No se le saca nada a quien ya lo usa así.

## Capabilities

### New Capabilities

- `seguimiento-de-stock`: qué significa que un ítem esté vigilado, cómo se
  enciende y se apaga esa vigilancia, cuál es el umbral que dispara una alerta y
  cómo se cambia.

La capability se escribe completa —no solo los dos arreglos— porque `specs/`
todavía está vacío y el comportamiento actual no está documentado en ningún lado.
Queda marcado cuáles requisitos cambia este cambio.

### Modified Capabilities

Ninguna. `registro-de-compras` toca stock pero por otro lado —el ingreso de
mercadería—, y no se modifica acá.

## Impact

**Repos:** solo `que-copado`.

**Modificado:**

- `app/actions/stock.ts` — `toggleStockTracking()` y `updateMinStock()`: qué
  revalidan
- `components/admin/stock/products-stock-tab.tsx` y `ingredients-stock-tab.tsx` —
  editar el mínimo desde la fila

**Sin cambios:** el esquema de la base. `min_stock` y `stock_tracking_enabled` ya
existen y `updateMinStock()` ya está escrita: lo que falta es un camino hasta
ella que no obligue a mover stock.

**Verificación:** contra la base local (`npm run db:start`), que permite tocar
stock y movimientos sin consecuencias.

## Fuera de alcance

- **Las otras cinco llamadas a `revalidateStock()`** en `app/actions/stock.ts`.
  Varias sí tienen sentido —después de una compra o un ajuste, la tabla tiene que
  releerse— y revisarlas una por una es otro trabajo. Acá se toca solo la del
  camino que reportó el problema.
- **Alertas por correo o notificación.** Hoy la alerta es un cartel en la pantalla
  de stock y sigue siéndolo.
- **Un mínimo por defecto al crear un ítem.** Puede tener sentido, no es esto.
