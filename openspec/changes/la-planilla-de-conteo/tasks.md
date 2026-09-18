# Tasks

## 1. Los datos

- [x] 1.1 `getPlanillaDeConteo()` devuelve los insumos agrupados por categoría,
      con nombre, unidad y stock del sistema. Filtra por las elegidas. Los que
      no tienen categoría van juntos, visibles y al final: son 32 de 120, así
      que dejarlos afuera en silencio sería perder un cuarto del depósito.
- [x] 1.2 `getCategoriasParaPlanilla()` para elegir antes de imprimir, con
      cuántos insumos tiene cada una.

## 2. El papel

- [x] 2.1 `/admin/stock/planilla/print`, mismo patrón que la ficha técnica: A4,
      barra en pantalla que no sale impresa.
- [x] 2.2 Insumo · Un. · Sistema · Contado · Diferencia. Las dos últimas en
      blanco y anchas: se escriben a mano, parado frente al freezer.
- [x] 2.3 Encabezado con la fecha de impresión y tres líneas para llenar: quién
      contó, la fecha del conteo y observaciones.
- [x] 2.4 Agrupada por categoría, con `page-break-inside: avoid` por grupo:
      contar una categoría mirando dos hojas es como se pierde la cuenta.

## 3. Cómo se llega

- [x] 3.1 Botón "Planilla de conteo" en la pantalla de Stock, al lado de
      Registrar Compra, en las dos barras.
- [x] 3.2 Diálogo para marcar categorías, con el total de filas a la vista
      mientras se marca. Sin marcar nada sale todo.
- [x] 3.3 Las categorías viajan por la URL, así la hoja del freezer se puede
      guardar como favorito y reimprimir cada semana sin volver a elegir.

## 4. Cerrar

- [x] 4.1 **Verificado en el navegador:** el botón está, el diálogo ofrece las
      categorías con su cuenta, marcar una cambia el total, el papel sale con
      las tres columnas, la fecha, el lugar para quién contó y agrupado por
      categoría. La URL con `?categorias=` filtra.
- [x] 4.2 `npm run lint` y `npm run build` sin errores nuevos.

## Lo que salió distinto

**`'use server'` no deja exportar una constante.** La clave de "sin categoría"
se había exportado desde `app/actions/stock.ts` y el build de Next lo rechaza:
todo lo que exporta un archivo `'use server'` queda expuesto como server action,
así que solo pueden ser funciones async. `npx tsc` no lo marca —es una regla del
build, no de TypeScript—, así que pasó las dos primeras verificaciones y apareció
recién al compilar.
