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

### Requirement: Se elige qué entra antes de imprimir

SHALL poder elegirse cualquier combinación de estos grupos: elaborados, combos,
reventa e insumos. Sin elegir ninguno, SHALL imprimirse todo.

Existe porque cada grupo se revisa por una razón distinta: la reventa contra la
factura del proveedor, los elaborados contra su receta, los insumos contra lo
que se pagó. Imprimir los 155 renglones para mirar las bebidas es tirar papel.

#### Scenario: Solo la reventa

- **WHEN** se elige únicamente reventa
- **THEN** la hoja trae solo productos de reventa

#### Scenario: Sin elegir nada

- **WHEN** no se marca ningún grupo
- **THEN** la hoja trae todos

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

