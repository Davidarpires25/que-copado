# Tasks

## 1. Los datos

- [x] 1.1 `getReporteDeCostos(grupos)` devuelve, para los grupos elegidos, los
      productos activos con costo, precio y margen, y los insumos activos con
      unidad y costo por unidad, todo agrupado por categoría. Se verifica
      contra una consulta SQL a la base local con los mismos números.

## 2. El papel

- [x] 2.1 `/admin/products/costos/print`, mismo patrón que la planilla de
      conteo: A4, barra en pantalla que no sale impresa.
- [x] 2.2 Producto · Costo · Precio · Margen. Los que no tienen costo dicen
      `sin costo`.
- [x] 2.3 Resumen al pie: cuántos, cuántos sin costo, margen promedio.

## 3. Cómo se llega

- [x] 3.1 Botón "Reporte de costos" en la pantalla de Productos, que abre un
      diálogo para elegir los grupos: elaborados, combos, reventa, insumos. Con
      cuántos renglones va a salir, para no llevarse cuatro páginas sin querer.
- [x] 3.2 Los insumos en gramos o mililitros muestran además el equivalente por
      kilo o litro.

## 4. Verificación

- [x] 4.1 Test de navegador con productos e insumos sembrados: uno con costo,
      uno sin costo, uno inactivo, un insumo en gramos. El inactivo no aparece,
      el sin costo sale marcado, el margen coincide con la cuenta hecha a mano,
      el insumo en gramos muestra su equivalente por kilo, y elegir un solo
      grupo trae solo ese grupo.
- [ ] 4.2 Captura de la hoja a tamaño A4 para que David la mire antes de
      archivar. **Enviada; falta su veredicto.**
- [x] 4.3 `npm run lint`, `npm run build` y la suite en verde.

## 5. Lo que se aprendió haciéndolo

- [x] 5.1 **La columna Unidad de los insumos repetía el costo.** `u` al lado de
      `$ 1.200 / u`. Se sacó: el costo ya dice la unidad.
- [x] 5.2 **Test por mutación**, porque en una pantalla nueva "falla contra el
      código viejo" es trivial —da 404—. Se rompieron a propósito dos reglas:
      el margen calculado sobre el costo en vez del precio (daba 300% en vez de
      75%) y el filtro de activos. Los dos tests correspondientes fallaron.
