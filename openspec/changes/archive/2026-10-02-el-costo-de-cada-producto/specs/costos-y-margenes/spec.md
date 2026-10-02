# costos-y-margenes — delta

## ADDED Requirements

### Requirement: Los costos de todos los productos se pueden llevar al papel

El sistema SHALL poder imprimir una hoja con cada producto activo, su costo, su
precio de venta y el margen que deja, agrupados por categoría.

El margen SHALL calcularse como `(precio − costo) / precio`, expresado en
porcentaje, y SHALL calcularse al imprimir: no se guarda.

Existe porque el costo de un producto solo se veía de a uno —abriendo su ficha—
y para revisar precios hace falta verlos todos juntos.

#### Scenario: Un producto con costo

- **WHEN** se imprime el reporte
- **THEN** cada producto con costo muestra su costo, su precio y su margen

#### Scenario: Un producto sin costo

- **WHEN** un producto activo no tiene costo cargado
- **THEN** aparece igual en el reporte
- **AND** marcado como `sin costo`, no con la celda en blanco
- **AND** sin margen, porque no se puede calcular

#### Scenario: El resumen

- **WHEN** se imprime el reporte
- **THEN** al pie figura cuántos productos entraron, cuántos no tienen costo, y
  el margen promedio de los que sí

### Requirement: Solo los productos que se venden

El reporte SHALL incluir únicamente los productos activos.

Existe porque el margen de un producto que no se vende no decide nada, y
mezclarlos esconde los que importan.

#### Scenario: Un producto dado de baja

- **WHEN** un producto está inactivo
- **THEN** no aparece en el reporte

### Requirement: Se ve en pantalla y se imprime lo que se ve

Los costos SHALL mostrarse en pantalla en dos pestañas, productos e insumos,
cada una filtrable por una categoría, con buscador y ordenable por columna.

Imprimir SHALL sacar exactamente lo que la pantalla muestra en ese momento:
la misma pestaña, la misma categoría, la misma búsqueda y el mismo orden.

Existe porque elegir a ciegas y recién ver los números en el papel obligaba a
imprimir para mirar; muchas veces alcanza con mirar.

#### Scenario: Una categoría de insumos

- **WHEN** se abre la pestaña de insumos y se elige Carnes
- **THEN** la tabla muestra solo los insumos de esa categoría
- **AND** al imprimir, la hoja trae esos mismos insumos y ninguno más

#### Scenario: Ordenado por margen

- **WHEN** se ordena la tabla de productos por margen
- **THEN** los que menos dejan quedan arriba
- **AND** los que no tienen costo quedan al final, en cualquier sentido
- **AND** la hoja impresa respeta ese orden

### Requirement: Los insumos muestran su costo por unidad

Un insumo SHALL mostrarse con su unidad y su costo por esa unidad, agrupado por
categoría. NO SHALL mostrar precio ni margen: no se vende.

Si la unidad es gramo o mililitro, SHALL mostrar además el equivalente por kilo
o por litro.

Existe porque el error que más costó en este sistema fue un precio de paquete
cargado como precio por gramo: `Morrón` a $200 el gramo son $200.000 el kilo, y
leído como "$200 / g" no llama la atención. Leído como "$200.000 / kg", sí.

#### Scenario: Un insumo en gramos

- **WHEN** un insumo está cargado en gramos a $22 el gramo
- **THEN** la hoja muestra $22 / g
- **AND** al lado, $22.000 / kg

#### Scenario: Un insumo sin costo

- **WHEN** un insumo activo no tiene costo cargado
- **THEN** aparece marcado como `sin costo`

