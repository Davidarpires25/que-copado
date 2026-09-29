# Design

## Context

- **Tres hojas A4, tres copias del armazón.**
  - `planilla-conteo-print-layout.tsx` y `reporte-costos-print-layout.tsx`
    traen cada una un `<style>` con la barra de pantalla (`.screen-bar`), la
    página (`.a4-page`), el encabezado (`.hdr`, `.hdr-brand`, `.hdr-sub`,
    `.doc-title`, `.doc-meta`), tablas (`th`, `td`) y `@page`/`@media print`.
    Son iguales salvo un `letter-spacing` en `.hdr-brand`.
  - `ficha-print-layout.tsx` (de marzo) tiene otro armazón con estilos en
    línea: recuadro "LOGO", título en mayúsculas, encabezados de tabla negros,
    `sim-box` con cinco parámetros, notas y firmas.
- **Los datos de la ficha** (`getProductionSheet`): `recipes[]`, cada una con
  `ingredients[]` recursivos (`children` cuando el insumo es una preparación
  previa), y `shopping_list[]` con las hojas del árbol, sumadas. Cada ítem trae
  `net_qty_per_unit`, `gross_qty_per_unit`, `cost_per_unit`, `current_stock` y
  `stock_tracking_enabled`. La cantidad llega por `?qty=`.
- La ficha se abre desde `ficha-tecnica-view.tsx` con `window.open(…/print?qty=N)`.

## Goals / Non-Goals

**Goals:**

- Un solo armazón para las hojas A4, que definen una sola vez el encabezado,
  la barra y el estilo de tabla.
- La ficha, sobre ese armazón, con solo lo que se usa en la cocina.
- La planilla y el reporte, idénticos en papel después de pasar al armazón.

**Non-Goals:**

- La ficha técnica en pantalla.
- Ticket y comanda (térmicas).
- Cambiar los datos que calcula `getProductionSheet`.

## Decisions

### 1. `HojaImpresa`: armazón con slots, estilos base en un solo `<style>`

`components/admin/hojas/hoja-impresa.tsx`:

```tsx
<HojaImpresa
  barra={<>Vista previa — Ficha técnica: <b>{nombre}</b> ({qty} u.)</>}
  titulo="Ficha técnica"
  meta={`${nombre} · Impresa el ${fecha}`}
  estilos={`/* lo propio de esta hoja */`}
  imprimirAlAbrir
>
  {contenido}
</HojaImpresa>
```

- Pone la barra de pantalla con el botón "Imprimir", la página A4, el
  encabezado ("Que Copado / Hamburguesería" + título + meta) y un `<style>` con
  las reglas base: `.a4-page`, `.hdr*`, `.doc-*`, `table/th/td`,
  `.quien*` (la fila para escribir a mano), `.grupo*` (la banda gris de
  sección), `.nota-pie`, `@page` y `@media print`.
- Cada hoja agrega sus reglas propias por `estilos` (por ejemplo las columnas
  de la planilla).
- `imprimirAlAbrir` abre el diálogo de impresión al cargar, como hacen hoy
  las tres con un `useEffect`.
- La fila "quién" es un componente exportado (`<FilaParaEscribir campos={[…]}/>`),
  que usan la planilla ("Contó · Fecha del conteo · Observaciones") y la ficha
  ("Preparó · Fecha · Observaciones").

*Alternativa descartada:* una hoja de estilos global en `globals.css`. Las
hojas de impresión no pasan por el layout del panel (`admin-route-shell` las
deja fuera), y un `<style>` propio del componente las deja autocontenidas,
como hoy.

### 2. La ficha: qué sale y en qué orden

1. Encabezado del armazón: título "Ficha técnica", meta "Hamburguesa simple ·
   10 unidades · Impresa el 28/09/2026".
2. `FilaParaEscribir`: Preparó · Fecha · Observaciones.
3. Una línea de totales, como el pie de resumen del reporte de costos (cifra
   grande arriba, rótulo chico abajo): **10** unidades · **$ 20.729** costo
   del lote · **$ 2.073** por unidad.
4. Las tablas:
   - **Sin preparaciones previas** (ningún ingrediente de ninguna receta tiene
     `children`): una sola tabla desde `shopping_list`.
   - **Con alguna**: una sección por receta (banda gris `.grupo-nombre` con el
     nombre y el multiplicador si no es 1) con el árbol indentado, y después
     la sección "Para juntar" desde `shopping_list`.
5. `nota-pie` a la izquierda con lo que marca la hoja (ver 4), a la derecha
   "N ingredientes".

### 3. Columnas

Tabla de la lista (o única):

| | Ingrediente | Cantidad | Con merma | Stock | Costo |
|---|---|---|---|---|---|

- Casillero de 3,5 mm con borde fino, como hoy.
- "Con merma" solo aparece si algún ítem tiene `gross > net`. En esa fila
  muestra la bruta (el ítem de la lista no trae el porcentaje; el desglose sí
  lo muestra). Si ninguno tiene merma, la columna no está.
- "Stock": el disponible si el insumo tiene seguimiento; si no alcanza para el
  lote, en negrita con "falta" (sin el rojo ni el ⚠: en blanco y negro no se
  ve, y la negrita sí). Sin seguimiento: "—".
- "Costo": el del lote para ese ítem, sin centavos. Las cantidades se
  formatean con el `readableQty` de hoy ("250 g", "1,5 kg").

Tabla de desglose por receta: casillero solo en las hojas del árbol (como
hoy), ingrediente indentado con `↳` por nivel, cantidad y "con merma".

### 4. Montos y números

`formatPrice` redondeado (`Math.round`) para costo total, por unidad y por
ítem. Cantidades con `tabular-nums` y alineadas a la derecha.

### 5. La planilla y el reporte no cambian en papel

Pasan a `HojaImpresa` quitando su armazón copiado. Se verifica con capturas
píxel a píxel contra `main` (el `letter-spacing` distinto de `.hdr-brand` se
unifica al de la planilla; si la captura del reporte difiere solo en eso, se
acepta y se anota).

## Risks / Trade-offs

- **Tocar dos hojas que andan bien** para sacar el armazón común. Se acota con
  la comparación de capturas contra `main`.
- **La ficha pierde el recuadro de firmas.** Decisión de David: la fila de
  arriba cumple lo mismo, como en la planilla.
- **Una sola tabla** esconde el desglose cuando no aporta nada; si una receta
  tuviera una preparación previa, el desglose vuelve a aparecer solo.
