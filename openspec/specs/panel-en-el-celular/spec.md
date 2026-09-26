# panel-en-el-celular Specification

## Purpose
Qué tiene que cumplir el panel de administración cuando se abre desde un
celular: que cada pantalla entre a lo ancho, que un formulario se pueda
completar y guardar, y que los controles se puedan tocar con el dedo.

El panel se diseñó para la computadora del local, y sin una regla escrita
cada pantalla nueva se probaba solo ahí. El formulario de producto llegó a
tener el campo "Nombre" de 26px de ancho sin que nadie lo notara.

"Celular" SHALL entenderse como una ventana de 360 a 390px de ancho: 390 es
un iPhone común y 360 el Android más común, que es el que más aprieta.
"Escritorio" SHALL entenderse como 1024px o más.

## Requirements

### Requirement: Ninguna pantalla del panel desborda a lo ancho

En celular, ninguna pantalla del panel SHALL tener desplazamiento horizontal
de página. Lo que no entra a lo ancho SHALL apilarse, partirse en renglones o
deslizarse dentro de su propio contenedor —una tabla, una fila de pestañas—,
nunca empujar la página entera.

Quedan fuera las páginas de impresión, que se imprimen desde la computadora.

Existe porque un desborde de página no avisa: el contenido cortado a la
derecha no parece cortado, parece que no está. Se midieron desbordes de 8 a
131px en cuatro pantallas y en ninguna se notaba a simple vista.

#### Scenario: Recorrer el panel en un celular

- **WHEN** se abre cada pantalla del panel que no es de impresión en una ventana
  de 390px
- **THEN** el ancho de la página es igual al de la ventana
- **AND** ningún texto, campo o botón queda cortado en el borde derecho

#### Scenario: Una fila de pestañas que no entra

- **WHEN** las pestañas de una pantalla suman más ancho que la ventana
- **THEN** se deslizan dentro de su fila
- **AND** la página no se desliza

### Requirement: Un formulario se completa y se guarda desde el celular

En celular, un formulario del panel SHALL mostrar sus secciones una debajo de
otra, con cada campo al ancho disponible. El título y los botones para
cancelar y guardar SHALL verse enteros, sin cortarse en el borde.

En escritorio los formularios SHALL verse como hoy.

Existe porque cargar o corregir un producto fuera del local es lo que se hace
desde el celular, y el formulario de producto mostraba dos columnas encimadas
con el botón de guardar cortado.

#### Scenario: Crear un producto desde el celular

- **WHEN** se abre "Nuevo producto" en una ventana de 390px
- **THEN** las secciones se ven una debajo de otra, sin superponerse
- **AND** los campos de nombre, descripción, precio y categoría ocupan el ancho
  del formulario
- **AND** las opciones de "Tipo de producto" se leen enteras
- **AND** el botón "Guardar Producto" se ve entero y se puede tocar

#### Scenario: Un título largo con dos botones

- **WHEN** se abre un formulario cuyo título y botones no entran en una fila
- **THEN** los botones pasan a un renglón propio debajo del título
- **AND** el título no se parte palabra por palabra

#### Scenario: El mismo formulario en la computadora

- **WHEN** se abre "Nuevo producto" a 1280px
- **THEN** se ve en dos columnas, con el título y los botones en la misma fila,
  igual que antes del cambio

### Requirement: Los controles se tocan con el dedo

En una pantalla táctil, todo control del panel —botón, link de navegación,
campo, selector, casilla, interruptor— SHALL tener un área que responde al
toque de al menos 44×44px, según WCAG 2.2, criterio 2.5.5 (Target Size,
Enhanced). Rige también en los diálogos y menús que abre el panel.

Cuando el control se dibuja más chico —un ícono de ayuda, una casilla, un
interruptor—, el área de toque SHALL agrandarse sin cambiar cómo se ve. Las
áreas de dos controles vecinos SHALL no pisarse: tocar uno no activa el otro.

Quedan fuera, como permite el mismo criterio, los links dentro de un texto
corrido. Quedan fuera también los controles del mapa de zonas de envío.

Con mouse, el panel SHALL verse como hoy. La tienda pública SHALL no cambiar,
aunque comparta componentes con el panel.

Existe porque en modo táctil había 298 controles por debajo de 44px en 29
pantallas, y los peores —las flechas para reordenar categorías, de 18×18px—
hacían tocar la flecha de al lado, o nada.

#### Scenario: Recorrer el panel con el dedo

- **WHEN** se abre cada pantalla del panel que no es de impresión en una
  pantalla táctil de 390px
- **THEN** todo control visible responde al toque en un área de al menos
  44×44px

#### Scenario: Reordenar una categoría desde el celular

- **WHEN** se toca la flecha para subir una categoría en una pantalla táctil
- **THEN** el área que responde al toque mide al menos 44×44px
- **AND** tocarla no activa la flecha de bajar

#### Scenario: La ayuda de un campo

- **WHEN** se toca el ícono de ayuda de un campo en una pantalla táctil
- **THEN** el área que responde mide al menos 44×44px
- **AND** el ícono se ve del mismo tamaño que antes

#### Scenario: El mismo panel con mouse

- **WHEN** se abre "Nuevo producto" a 1280px con mouse
- **THEN** los botones y campos miden lo mismo que antes del cambio

#### Scenario: La tienda en un celular

- **WHEN** se abre el checkout de la tienda en una pantalla táctil
- **THEN** sus botones y campos miden lo mismo que antes del cambio

### Requirement: Tocar un campo no agranda la pantalla en iPhone

En una pantalla táctil, todo campo de texto, número o selector nativo del
panel SHALL mostrar su letra de al menos 16px. Los que ya tienen letra más
grande SHALL conservarla.

SHALL lograrse sin impedir el zoom con dos dedos: fijar `maximum-scale` en el
viewport lo evita en iPhone pero lo bloquea en Android, y eso es una barrera
para quien necesita agrandar la pantalla.

Con mouse, los campos SHALL verse como hoy.

Existe porque Safari de iPhone hace zoom sobre un campo con letra de menos de
16px al tocarlo y no lo deshace al salir. El panel usaba 14px en casi todos
sus campos: 42 en las pantallas del panel.

#### Scenario: Buscar un producto en la caja desde un iPhone

- **WHEN** se toca el buscador de productos de la caja en una pantalla táctil
- **THEN** su letra mide al menos 16px

#### Scenario: El monto de apertura de caja

- **WHEN** se abre la caja sin turno en una pantalla táctil
- **THEN** el campo del monto conserva su letra grande

### Requirement: La barra superior dice dónde se está

En celular, el panel SHALL mostrar arriba una sola barra con, de izquierda a
derecha: el botón para abrir el menú, el nombre de la sección donde se está y,
si hay alertas de stock y el rol puede ver stock, una campana con la cantidad.

El nombre de la sección SHALL ser el mismo que marca el menú como activo,
también en las subpantallas: en "Nuevo producto" la barra dice "Productos". La
campana SHALL mostrar la misma cantidad que el menú muestra junto a "Stock" y
SHALL llevar a la pantalla de stock.

La barra SHALL no mostrar un ícono en lugar del logo del local. El logo real
queda en el menú lateral.

En escritorio, donde el menú está siempre a la vista, la barra SHALL no
aparecer, como hoy.

Existe porque la barra mostraba un cuadrado amarillo con el ícono de "Cocina"
haciendo de logo, no decía en qué sección se estaba, y las alertas de stock
solo se veían abriendo el menú.

#### Scenario: Entrar a una subpantalla

- **WHEN** se abre "Nuevo producto" en una ventana de 390px
- **THEN** la barra superior dice "Productos"
- **AND** el botón del menú tiene un nombre accesible ("Abrir menú")

#### Scenario: Hay insumos por debajo del mínimo

- **WHEN** hay tres alertas de stock y el rol puede ver stock
- **THEN** la barra muestra la campana con un 3
- **AND** tocarla lleva a la pantalla de stock

#### Scenario: No hay alertas

- **WHEN** no hay alertas de stock
- **THEN** la barra no muestra la campana

#### Scenario: Un rol que no ve stock

- **WHEN** entra un rol sin permiso para ver stock, con alertas pendientes
- **THEN** la barra no muestra la campana

### Requirement: La caja muestra una sola barra en el celular

En celular, la caja SHALL mostrar una sola barra superior con el botón del
menú. Durante un turno, esa barra SHALL mostrar a la vista, sin deslizar ni
ocultar nada, las acciones del turno —registrar un movimiento y cerrar la
caja— y los montos de lo vendido y de lo que hay en caja.

En escritorio la barra del turno SHALL verse como hoy.

Existe porque la caja mostraba dos barras con botón de menú, una encima de la
otra, y la del turno se deslizaba de costado dejando "Cerrar caja" fuera de la
vista.

#### Scenario: Abrir la caja con un turno abierto en el celular

- **WHEN** se abre la caja con un turno abierto en una ventana de 390px
- **THEN** hay un solo botón para abrir el menú
- **AND** el botón para cerrar la caja se ve sin deslizar nada
- **AND** "Vendido" y "En caja" se ven con sus montos

#### Scenario: Abrir la caja sin turno en el celular

- **WHEN** se abre la caja sin un turno abierto en una ventana de 390px
- **THEN** hay un solo botón para abrir el menú

#### Scenario: Enviar un pedido a cocina desde el celular

- **WHEN** se arma un pedido de mostrador en el celular y se toca "Enviar a
  cocina"
- **THEN** la hoja pasa a "Cobrar #N" sin cerrarse, como el panel de la
  computadora
- **AND** si se cierra sin cobrar, el pedido queda en Pendientes y un solo
  toque en su chip vuelve a abrir el cobro

#### Scenario: Cargar productos a una mesa desde el celular

- **WHEN** se abre una mesa en el celular y se toca "Agregar Items"
- **THEN** la hoja de la mesa se cierra y se ve el menú de productos
- **AND** el menú y los productos elegidos se ven a la vez, uno debajo del otro
- **AND** al confirmar, vuelve la hoja de la mesa con lo agregado

#### Scenario: La caja en la computadora del local

- **WHEN** se abre la caja con un turno abierto a 1280px
- **THEN** la barra del turno es un solo renglón con los mismos textos que
  antes del cambio
