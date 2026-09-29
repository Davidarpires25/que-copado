# Tasks

Todo contra el stack local. Las hojas solo leen: no escriben en la base. El
test que necesite un producto con una preparación previa lo crea con ids de
prefijo propio y lo borra al final. Las capturas se toman en una ventana de
900×1270 con `window.print` anulado, y antes de cada tanda se verifica que el
servidor sirva el CSS y el código actuales (lección 39).

## 1. Capturas y tests primero

- [x] 1.1 Capturas "antes" de las tres hojas (ficha de la Hamburguesa simple
      para 10, planilla con todas las categorías, reporte de costos).
      Verifica: los archivos guardados.
- [x] 1.2 `e2e/hojas-impresas.spec.ts`:
      - las tres hojas tienen el mismo encabezado (local a la izquierda, título
        y "Impresa el" a la derecha) y ningún `th` con fondo;
      - ningún monto con coma decimal;
      - la ficha de un producto sin preparaciones previas tiene una sola
        tabla; la de uno con preparación previa, desglose y lista;
      - la ficha tiene "Preparó", "Fecha" y "Observaciones", y no tiene
        "Receta base", "Factor de escala", "Versión" ni "LOGO";
      - la barra de pantalla no se ve con `emulateMedia({ media: 'print' })`.
      Verifica: falla hoy en todo lo de la ficha; pasa en planilla y reporte.

## 2. Armazón (Decisión 1)

- [x] 2.1 `components/admin/hojas/hoja-impresa.tsx` con `HojaImpresa` y
      `FilaParaEscribir`. Verifica: lint y tipos.
- [x] 2.2 La planilla de conteo pasa a `HojaImpresa`. Verifica: captura igual
      a la de `main` (comparación de píxeles), tests de la planilla en verde.
- [x] 2.3 El reporte de costos pasa a `HojaImpresa`. Verifica: captura igual a
      la de `main` salvo el `letter-spacing` del nombre, anotado;
      `reporte-costos.spec.ts` en verde ("se imprime exactamente lo que se ve").
      Hecho: la única diferencia de píxeles es el recuadro de "Que Copado"
      (el espaciado, ahora el de la planilla); 9/9 tests del reporte. La
      planilla sale idéntica a `main`.

## 3. La ficha (Decisiones 2 a 4)

- [x] 3.1 `ficha-print-layout.tsx` reescrito sobre `HojaImpresa`: encabezado,
      fila para escribir, línea de totales, una tabla o desglose + lista,
      columnas de la Decisión 3, montos sin centavos. Verifica: pasa 1.2.
- [x] 3.2 Captura de la ficha con una preparación previa (producto de prueba).
      Verifica: el archivo, revisado.

- [x] 3.3 Las cantidades en castellano. La ficha formateaba con `toFixed(3)`:
      20 g salían "20.000 g" (se leyó como un dato mal cargado de orégano) y
      "0.450 kg" en pantalla. `cantidadLegible` en `lib/utils/cantidad.ts`,
      usada por la hoja y por `ficha-tecnica-view.tsx`; borrado
      `ficha-tecnica-dialog.tsx`, otra copia que nadie importaba. Verifica: el
      test "las cantidades se escriben en castellano" (falla en pantalla con el
      código anterior: "0.500 kg", "0.450 kg").

## 4. Cierre

- [x] 4.1 Capturas "después" lado a lado con las de 1.1, mostradas a David.
      Verifica: su respuesta (2026-09-28, "si me cierran").
- [x] 4.2 `npm run lint`, `npm run build` y los tests de hojas, planilla y
      costos. Verifica: la salida.
- [ ] 4.3 Una ficha impresa en el local, en papel. Verifica: la respuesta de
      David.
