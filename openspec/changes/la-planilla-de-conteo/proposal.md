# Proposal

## Why

Vale, del local: *"¿Podés imprimir unas plantillas del stock que hay en el
sistema? Para tener en papel físico y controlar en el freezer una vez por
semana."*

Hoy no existe. El sistema tiene los números y la pantalla de Stock los muestra,
pero para contar el freezer hay que ir con el celular o copiarlos a mano.

Y hay un motivo más fuerte que la comodidad. Todo lo que se arregló hoy en el
stock —el descuento en gramos que restaba mil veces menos, los costos cargados
como total, los mínimos de mil kilos— apareció porque alguien cruzó lo que decía
el sistema contra la realidad. **Un conteo semanal es esa comparación hecha a
propósito y con periodicidad**, en vez de por casualidad cuando algo se rompe.

## What Changes

- **Una planilla imprimible**, en A4, para llevar al freezer y anotar a mano.
- **Tres columnas**: lo que dice el sistema, un espacio en blanco para lo
  contado, y otro para la diferencia.
- **Se elige qué entra antes de imprimir**, por categoría de insumo: marcando
  CARNES y PANIFICACION sale la hoja del freezer y no las 120 filas de todo.
- **Vive en Stock**, no en una sección nueva.

## Dónde vive, y por qué no en Reportes

Imprimir la planilla es el paso 1 de un bucle que termina en la misma pantalla:
se cuenta, y después alguien carga las diferencias con el ajuste de stock. Si el
papel sale de "Reportes" y la corrección se hace en "Stock", se parte una sola
operación en dos lugares.

Además ya hay precedente —la ficha técnica se imprime desde
`/admin/stock/ficha/[id]/print`— y el menú lateral ya tiene doce ítems.
`REPORTES → Analytics` es sobre ventas, otro trabajo.

## Lo que se decidió con David

**Las tres columnas, y no el conteo ciego.** Se planteó imprimir solo el nombre y
una línea vacía: quien cuenta sin ver el número esperado cuenta de verdad, en vez
de confirmar lo que ya dice el papel. David eligió mostrar el número igual, que
es lo que pidió Vale. Queda dicho el sesgo; la hoja lo compensa en parte al pedir
la diferencia escrita, que obliga a mirar las dos cifras.

**Elegir por categoría.** Los insumos ya las tienen cargadas: UTENSILIO (37),
DESCARTABLE (20), BEBIDAS (12), PANIFICACION (8), CARNES (6), y 32 sin
categoría. Sobre 120 insumos activos, 45 tienen seguimiento.

**Ojo con una diferencia:** la categoría dice *qué es*, no *dónde está
guardado*. CARNES está en el freezer, UTENSILIO no. Se acerca bastante, pero si
el local quiere exactamente "freezer / heladera / seco" eso es un campo nuevo y
otro cambio.

## Capabilities

### Modified Capabilities

`seguimiento-de-stock` — la spec cubre cómo se vigila un ítem y cuándo avisa.
Falta el conteo físico: comparar contra la realidad es lo que sostiene todo lo
demás.

## Impact

**Repos:** solo `que-copado`. Sin migración: se usa lo que ya existe.

**Sigue el patrón de la ficha técnica**: página de impresión propia, A4, barra
en pantalla con el botón de imprimir que no sale en el papel.

## Fuera de alcance

- **Cargar el conteo desde la planilla.** Las diferencias se corrigen con el
  ajuste de stock que ya existe. Una pantalla para cargar la hoja entera de una
  es otro trabajo, y conviene ver primero cómo usan el papel.
- **Un campo de dónde se guarda cada insumo** (freezer, heladera, seco).
