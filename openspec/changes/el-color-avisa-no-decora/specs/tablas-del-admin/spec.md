# tablas-del-admin — delta

## ADDED Requirements

### Requirement: El color se reserva para lo que cambia

En las tablas del panel, un dato SHALL mostrarse resaltado —con color de fondo,
borde y forma propia— solamente cuando represente un **estado**: algo que puede
cambiar según lo que pase en el negocio y que alguien necesita detectar sin
leer la fila entera.

Un dato que describe qué es una cosa y no cambia solo —su categoría, su unidad
de medida, un total calculado— SHALL mostrarse como texto.

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
