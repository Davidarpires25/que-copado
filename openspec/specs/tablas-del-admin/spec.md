# tablas-del-admin Specification

## Purpose

Cómo se lee una tabla del panel: qué se resalta, qué no, y por qué.

El panel es donde alguien busca, en una lista de cien filas, las tres que
necesitan algo. Esa búsqueda la hace el color, y el color solo funciona si es
escaso: cuando todas las filas tienen algo resaltado, el resalte deja de
señalar.

Existe porque no había ninguna spec que lo dijera, y sin una regla escrita cada
tabla lo resolvió distinto. Se llegó a tener, en la fila de un insumo agotado,
el badge rojo del estado más el de la categoría más el círculo de la unidad, y
solo uno de los tres importaba.

## Requirements

### Requirement: El color se reserva para lo que cambia

En las tablas del panel, un dato SHALL mostrarse resaltado —con color de fondo,
borde y forma propia— solamente cuando represente un **estado**: algo que puede
cambiar según lo que pase en el negocio y que alguien necesita detectar sin
leer la fila entera.

Un dato que describe qué es una cosa y no cambia solo —su categoría, su unidad
de medida, un conteo, un total calculado— SHALL mostrarse como texto.

"Resaltado" SHALL entenderse como **encerrado**: con fondo propio y, además,
borde o esquinas redondas. La forma del encierro no importa —píldora o caja
cuadrada—, importa que el dato esté encerrado.

Los **controles** quedan fuera de esta regla: un `<select>` o un interruptor se
tocan, y su color es parte de cómo se ve que están.

**Un estado normal tampoco se resalta.** SHALL resaltarse solamente el estado
que es la **excepción** —el que pide que alguien haga algo—. `Bajo`, `Agotado`,
`No disponible` sí; `OK`, `A la venta`, `Sin seguimiento` no, porque aparecen en
casi todas las filas y ahí el resalte deja de señalar: pasa a ser el fondo.

Un estado normal SHALL mostrarse como texto, o como un guion cuando no hay nada
que decir.

Existe porque el resalte es un recurso que se gasta. Si todas las filas tienen
algo resaltado, el resalte deja de señalar: en la tabla de insumos la fila de un
agotado traía el badge rojo del estado, el de la categoría y el círculo de la
unidad, y solo uno de los tres importaba.

#### Scenario: Un insumo agotado en la tabla de stock

- **WHEN** se mira la tabla de insumos con 106 filas
- **THEN** las únicas marcas de color son las de los insumos con problema de
  stock
- **AND** la categoría y la unidad de cada fila se leen como texto

#### Scenario: Una unidad de medida

- **WHEN** se muestra la unidad de un insumo o de una línea de receta
- **THEN** va como texto, en gris y pegada a la cantidad que acompaña
- **AND** no lleva forma ni color propios

#### Scenario: Una tabla donde casi todo está bien

- **WHEN** se mira una lista de cien insumos donde tres tienen problema de stock
- **THEN** solo esas tres filas llevan color
- **AND** las otras noventa y siete muestran su estado como texto o un guion

#### Scenario: Un conteo

- **WHEN** una fila muestra cuántos ingredientes tiene una receta, o cuántos
  productos tiene una categoría
- **THEN** va como texto
- **AND** no se encierra, ni en píldora ni en caja cuadrada

#### Scenario: Un total calculado

- **WHEN** se muestra el costo total de una receta o de un combo
- **THEN** se muestra como número
- **AND** no se encierra en una píldora

### Requirement: Los estados conservan su significado

Los estados que hoy se muestran resaltados —OK, Bajo, Agotado, Negativo, Sin
seguimiento, Crítico, A la venta, Auto-deshabilitado, Inactiva— SHALL conservar
su texto y su color.

Existe para dejar dicho que sacar ruido no es rediseñar: el objetivo es que el
estado se vea más, no que se vea distinto.

#### Scenario: Un estado ya conocido

- **WHEN** un insumo está por debajo de su mínimo
- **THEN** sigue mostrando "Bajo" en rojo, igual que antes

### Requirement: La acción de una fila se ve sin deslizar la tabla

Cuando una tabla del panel no entra a lo ancho y se desliza, la columna de
acciones de cada fila —editar, borrar— SHALL quedar a la vista. Lo que se
desliza SHALL ser las columnas de datos.

Los encabezados de dos columnas vecinas SHALL no pisarse.

En escritorio, donde la tabla entra entera, SHALL verse como hoy.

Existe porque las tablas de productos, recetas, stock, insumos y equipo
desbordaban en el celular y lo que quedaba afuera era justo el lápiz para
editar. Nada indicaba que hubiera que deslizar: la fila parecía no tener
acciones.

#### Scenario: Editar un insumo desde el celular

- **WHEN** se abre la tabla de stock en una ventana de 390px
- **THEN** el botón para editar cada fila se ve entero sin deslizar la tabla
- **AND** los encabezados "Stock Actual" y "Estado" se leen sin pisarse

#### Scenario: Deslizar una tabla ancha

- **WHEN** se desliza a la izquierda la tabla de productos en el celular
- **THEN** las columnas de datos se corren
- **AND** la columna de acciones sigue en su lugar, sin quedar tapada ni
  transparente sobre los datos que pasan por debajo

#### Scenario: Una tabla sin acciones por fila

- **WHEN** una tabla no tiene columna de acciones, como el reporte de costos
- **THEN** se desliza entera dentro de su contenedor
- **AND** la página no se desliza
