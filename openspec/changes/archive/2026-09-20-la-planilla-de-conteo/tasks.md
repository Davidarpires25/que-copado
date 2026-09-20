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

## 5. Lo que faltaba, visto por David al usarla

- [x] 5.1 **El panel se colaba en el papel.** Las páginas de impresión
      renderizaban dentro del shell del admin, así que la hoja salía con el
      botón de menú y "Que Copado" arriba. Estaban contempladas las de caja por
      su prefijo; la ficha técnica, la comanda de cocina y la planilla no.
      Se arregló por regla —toda ruta que termina en `/print` saltea el shell—
      y no agregando cuatro rutas a mano: la próxima página de impresión ya
      sale limpia. **Verificado en las cuatro.**
- [x] 5.2 **Las bebidas no salían.** David: *"ninguna bebida sale con
      seguimiento"*. Era cierto y peor de lo que parecía: las bebidas reales
      son **productos de reventa**, no insumos. La planilla listaba los 12
      insumos-bebida —las filas muertas de cuando las gaseosas se cargaban como
      ingredientes de un combo, ninguna con seguimiento— y dejaba afuera las 16
      bebidas de verdad. Ahora entran los productos de reventa con seguimiento.
- [x] 5.3 **Solo lo que tiene seguimiento.** Si el sistema no lleva la cuenta de
      algo no hay número contra el cual comparar, y la fila es ruido. Era
      exactamente lo que se veía: una hoja entera diciendo "sin seguimiento".
- [x] 5.4 **Insumos y reventa, separados.** David: *"entonces debería haber una
      opción para productos de reventa"*. En la primera versión se agrupaban por
      nombre de categoría, así que las dos BEBIDAS caían juntas. Tiene razón:
      son dos cosas distintas, se cuentan en lugares distintos, y ahora el
      selector los ofrece por separado y el papel lo aclara en cada grupo.
      **Verificado:** el diálogo muestra INSUMOS y PRODUCTOS DE REVENTA, y la
      URL `?categorias=reventa:<id>` trae solo la hoja de la heladera.

## Lo que salió distinto

**`'use server'` no deja exportar una constante.** La clave de "sin categoría"
se había exportado desde `app/actions/stock.ts` y el build de Next lo rechaza:
todo lo que exporta un archivo `'use server'` queda expuesto como server action,
así que solo pueden ser funciones async. `npx tsc` no lo marca —es una regla del
build, no de TypeScript—, así que pasó las dos primeras verificaciones y apareció
recién al compilar.
