# panel-accesible Specification

## Purpose
Qué tiene que cumplir el panel de administración para que lo pueda usar quien
no ve la pantalla —con un lector de pantalla—, quien no usa el mouse —solo
con teclado— y quien lo mira con poca luz o la vista cansada, según WCAG 2.2
nivel AA, en el tema claro y en el oscuro.

El panel se probaba mirando, con mouse y en un solo tema. Sin una regla
escrita, un botón de un solo ícono se leía como "botón" y nada más, había
controles a los que no se llegaba con Tab, y el gris del texto secundario no
llegaba al contraste mínimo en ninguno de los dos temas.

## Requirements

### Requirement: Todo control dice qué hace

Todo control del panel —botón, link, interruptor, casilla, selector,
campo— SHALL tener un nombre accesible que diga qué hace o qué valor pide.

Un botón de un solo ícono SHALL llevar como nombre el mismo texto que muestra
su tooltip o, si no tiene tooltip, la acción que hace ("Editar mesa 2",
"Eliminar"). Un campo o selector SHALL tener su etiqueta visible asociada, y
si no tiene etiqueta visible, un nombre accesible propio.

Quedan fuera los controles del mapa de zonas de envío, que son de una
librería.

Existe porque la auditoría encontró 178 botones sin nombre en 29 pantallas:
con un lector de pantalla, la fila de una mesa tenía cuatro controles que se
anunciaban igual, "botón".

#### Scenario: El lápiz de una mesa

- **WHEN** un lector de pantalla llega al botón de editar de la mesa 2
- **THEN** lo anuncia como un botón con un nombre que dice editar, no solo
  "botón"

#### Scenario: Un interruptor

- **WHEN** un lector de pantalla llega al interruptor "Visible en el menú" de
  un producto
- **THEN** lo anuncia con ese nombre y su estado, encendido o apagado

#### Scenario: Un selector con etiqueta

- **WHEN** se enfoca el selector de categoría del formulario de producto
- **THEN** su nombre accesible es "Categoría", el texto de su etiqueta

#### Scenario: Recorrer el panel con axe

- **WHEN** se corre axe-core con las reglas de WCAG 2.2 A y AA sobre cada
  pantalla del panel a 390 y a 1280px
- **THEN** no hay violaciones de `button-name`, `label`, `select-name` ni
  `link-name` fuera del mapa

### Requirement: Todo lo que se hace con click se hace con el teclado

Toda acción del panel que se hace con click SHALL poder hacerse con el
teclado: llegar con Tab, activar con Enter o Espacio, y ver dónde está el
foco.

Un elemento que se toca sin ser un control —una fila de tabla que abre un
detalle, una fila que elige un medio de pago— SHALL ser un control de verdad o
comportarse como uno: recibe el foco, se activa con el teclado y anuncia su
función y su estado.

Una región que se desliza SHALL poder deslizarse con el teclado.

Lo que está plegado u oculto SHALL no recibir el foco.

Existe porque las filas de medio de pago del cobro eran `<div>` con click:
con el teclado no se podía elegir cómo pagar. Y el margen de "Mitad y mitad"
estaba plegado con opacidad 0 pero Tab entraba igual, a un campo que no se
veía.

#### Scenario: Elegir un medio de pago con el teclado

- **WHEN** en el cobro de la caja se llega con Tab a "Tarjeta" y se aprieta
  Espacio
- **THEN** Tarjeta queda marcada, igual que con un click
- **AND** un lector de pantalla anuncia si está marcada

#### Scenario: Abrir un pedido con el teclado

- **WHEN** en Pedidos se llega con Tab a la fila de un pedido y se aprieta
  Enter
- **THEN** se abre el detalle del pedido, igual que con un click

#### Scenario: Un campo plegado

- **WHEN** en "Mitad y mitad" el método de precio no es "Costo + margen" y se
  recorre el formulario con Tab
- **THEN** el foco no pasa por el campo del margen

### Requirement: Los paneles laterales son diálogos

Abierto, un panel lateral del panel —el menú del celular, el detalle de un
pedido, el detalle de un arqueo— SHALL comportarse como un diálogo modal: se
anuncia como diálogo con nombre, el foco entra en él y no sale mientras está
abierto, Escape lo cierra, y al cerrarse el foco vuelve al control que lo
abrió.

Existe porque los tres paneles se abrían encima de la página con el foco en
la página de atrás: para llegar a su botón de cerrar había que recorrer con
Tab toda la pantalla, y Escape no hacía nada.

#### Scenario: Abrir y cerrar el menú con el teclado

- **WHEN** se enfoca "Abrir menú", se aprieta Enter y después Escape
- **THEN** al abrir, el foco queda dentro del menú
- **AND** Tab recorre solo los links del menú mientras está abierto
- **AND** Escape lo cierra y el foco vuelve a "Abrir menú"

#### Scenario: El detalle de un pedido

- **WHEN** se abre un pedido desde Pedidos con Enter
- **THEN** el detalle se anuncia como diálogo y el foco está dentro
- **AND** Escape lo cierra y el foco vuelve a "Ver pedido"

### Requirement: Con mouse, ningún control mide menos de 24×24

Con mouse, todo control del panel SHALL medir al menos 24×24px, o tener
espacio libre alrededor hasta completar un círculo de 24px sin pisar a su
vecino, según WCAG 2.2, criterio 2.5.8 (Target Size, Minimum).

Quedan fuera los links dentro de un texto corrido y los controles del mapa.

Existe porque las flechas para reordenar categorías miden 18px con mouse: en
el cambio anterior se llevaron a 44 solo con el dedo.

#### Scenario: Reordenar una categoría con mouse

- **WHEN** se abre Categorías a 1280px con mouse
- **THEN** las flechas de subir y bajar miden al menos 24×24px cada una

### Requirement: La estructura se lee en orden

Cada pantalla del panel SHALL tener sus títulos en orden —sin saltar
niveles—, sus regiones de navegación con nombres distintos, y los
encabezados de sus tablas con texto, aunque sea solo para lectores de
pantalla. Un link dentro de un texto SHALL distinguirse por algo más que el
color.

Existe porque la auditoría encontró títulos que saltaban de h1 a h3, dos
`<nav>` sin nombre que un lector anuncia igual, y la columna de acciones sin
encabezado.

#### Scenario: La columna de acciones

- **WHEN** un lector de pantalla recorre la tabla de Equipo
- **THEN** la última columna se anuncia como "Acciones"

#### Scenario: Recorrer el panel con axe, estructura

- **WHEN** se corre axe-core sobre cada pantalla del panel
- **THEN** no hay violaciones de `heading-order`, `landmark-unique`,
  `empty-table-header` ni `link-in-text-block`

### Requirement: El texto se lee en los dos temas

Todo texto del panel SHALL tener un contraste de al menos 4,5:1 con su fondo
—3:1 si es texto grande (18,66px en negrita o 24px)—, según WCAG 2.2,
criterio 1.4.3, **en el tema claro y en el oscuro**.

El contraste SHALL salir de los tokens de color del panel, no de opacidades:
un texto al 70% de un gris que cumple puede dejar de cumplir según el fondo.

Los niveles de texto —principal, secundario, terciario— SHALL conservarse:
cumplir no es volver todo del mismo gris.

Quedan fuera, como permite el criterio, el texto de controles deshabilitados,
los placeholders de campos vacíos, los logos y lo decorativo. Un texto que se
dibuja con el color de placeholder pero muestra un dato no es un placeholder.

Existe porque la auditoría encontró 161 textos por debajo de 4,5:1 entre los
dos temas: el gris terciario daba 2,33:1 en claro y 2,74:1 en oscuro, y
estaba en 120 lugares del panel.

#### Scenario: Recorrer el panel con axe en los dos temas

- **WHEN** se corre axe-core con la regla `color-contrast` sobre cada pantalla
  del panel, en tema claro y en tema oscuro
- **THEN** no hay violaciones fuera del mapa de zonas

#### Scenario: El texto terciario sigue siendo terciario

- **WHEN** se compara el gris terciario con el secundario en un mismo tema
- **THEN** el terciario tiene menos contraste que el secundario
- **AND** los dos cumplen 4,5:1 con los fondos del panel

#### Scenario: El período elegido en Analytics

- **WHEN** se elige "7 días" en una tarjeta de Analytics en tema claro
- **THEN** el texto del botón elegido, sobre el amarillo, cumple 4,5:1
