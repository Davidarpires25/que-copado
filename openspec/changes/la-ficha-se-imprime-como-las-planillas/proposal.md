# Proposal

## Why

David: *"¿puedes hacer un rediseño de la ficha técnica para que se parezca a las
otras planillas de conteo y costos?"*.

El panel imprime tres hojas A4 desde Stock y Reportes: la planilla de conteo,
el reporte de costos y la ficha técnica. Las dos primeras, hechas este mes,
comparten un lenguaje: el nombre del local a la izquierda, el título y la
fecha a la derecha, una sola línea gruesa, tablas claras con encabezados chicos
y grises, secciones con una banda gris y montos sin centavos. La ficha técnica
es de marzo y habla otro idioma: parece de otro sistema.

## Qué se rompe hoy en el local

No se cae nada, pero la ficha se lee peor y dice cosas que no sirven:

- **Dos tablas iguales.** Cuando la receta no tiene preparaciones previas —el
  caso de casi todas—, el "Desglose" y la "Lista de compras" traen las mismas
  filas. La Hamburguesa simple para 10 unidades imprime cuatro ingredientes, y
  después los mismos cuatro de nuevo.
- **Datos que se repiten o no significan nada:** "Receta base: 1 unidad" y
  "Factor de escala: ×10" repiten las "10 unidades"; "Versión: 20260928" es la
  fecha de impresión otra vez; hay un recuadro que dice "LOGO", vacío.
- **Costos con centavos:** "$ 20.729,47" y "$ 2.072,95", en dorado. El resto
  del panel no muestra centavos.
- **Encabezados de tabla negros**, un recuadro de parámetros y un pie de firmas
  que ninguna otra hoja tiene.

Además, la planilla y el reporte repiten su armazón copiado a mano (el mismo
bloque de estilos, con una diferencia de `letter-spacing`). Una tercera copia
para la ficha sería la que se desincroniza primero.

## What Changes

- **Un armazón común para las hojas A4** (`HojaImpresa`): la barra de
  pantalla con "Imprimir", la página, el encabezado (local, título, fecha) y
  los estilos base de tabla. La planilla, el reporte de costos y la ficha lo
  usan; cada una conserva lo propio. La planilla y el reporte no cambian en
  papel.
- **La ficha técnica, con ese armazón:**
  - Encabezado: "Que Copado / Hamburguesería" y "Ficha técnica · Hamburguesa
    simple" con la fecha. Fuera el recuadro "LOGO" y la "Versión".
  - Arriba, la fila para escribir a mano, como en la planilla: **Preparó ·
    Fecha · Observaciones**. Fuera las líneas de notas y las firmas del pie.
  - Los parámetros en una línea: cantidad, costo del lote y costo por unidad.
    Fuera "Receta base" y "Factor de escala".
  - **Una sola tabla cuando no hay preparaciones previas**: ingrediente,
    cantidad (y bruta con merma si la hay), stock y costo. Con preparaciones
    previas, el desglose por receta y después la lista de compras, como hoy.
  - Se quedan los casilleros para tildar cada ingrediente (se usan al juntar
    y pesar).
  - Montos sin centavos, en negro. El faltante de stock, marcado como hoy
    pero en el estilo de la planilla.

## Lo que se decidió con David (2026-09-28)

- Una sola tabla cuando el desglose y la lista de compras son iguales.
- Los casilleros se quedan.
- La fila "Preparó · Fecha · Observaciones" arriba, como la planilla, y sin
  firmas abajo.

## Capabilities

### New Capabilities

- `hojas-impresas`: las hojas A4 que imprime el panel comparten formato.

### Modified Capabilities

- `seguimiento-de-stock`: se agrega cómo sale impresa la ficha técnica de
  producción.

## Fuera de alcance

- **La ficha técnica en pantalla** (`/admin/stock/ficha/[id]`). Este cambio es
  el papel. Si la pantalla también tiene que parecerse, es otro paso.
- **El ticket de caja y la comanda de cocina**: no son A4, salen por la
  impresora térmica y tienen su propio formato.
- ~~El dato del orégano~~: no era un dato. La ficha formateaba con
  `toFixed(3)` y 20 g salían "20.000 g", que se lee veinte mil. Se arregla acá
  (tarea 3.3), en papel y en pantalla.

## Toca AgentePOS

No.

## Impact

- Nuevo `components/admin/hojas/hoja-impresa.tsx` (armazón y estilos base).
- `components/admin/stock/ficha-print-layout.tsx`: se reescribe sobre el
  armazón.
- `components/admin/stock/planilla-conteo-print-layout.tsx` y
  `components/admin/reportes/reporte-costos-print-layout.tsx`: pasan a usar el
  armazón, sin cambio visible.
- Tests: `e2e/` con capturas de las tres hojas y una comparación de la
  planilla y el reporte contra `main`.
