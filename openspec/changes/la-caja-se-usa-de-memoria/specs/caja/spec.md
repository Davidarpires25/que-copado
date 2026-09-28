# Spec Delta

## ADDED Requirements

### Requirement: Cada producto está siempre en el mismo lugar

La grilla de productos SHALL ordenarse por categoría, en el orden configurado
de las categorías, y dentro de cada categoría por nombre. Agregar un producto
a una categoría NO SHALL mover productos de otras categorías.

Todas las categorías SHALL verse a la vez donde el ancho alcanza. Donde no
alcanza, la pantalla SHALL indicar que hay más categorías fuera de la vista.

Existe porque la grilla se ordenaba por nombre, mezclando bebidas con combos.
Cada producto nuevo corría a todos los siguientes, y el cajero no podía
aprender dónde estaba cada cosa.

#### Scenario: "Todos" agrupa por categoría

- **GIVEN** categorías Combos (orden 0), Hamburguesas (1) y Bebidas (3)
- **WHEN** se mira la grilla en "Todos"
- **THEN** aparecen primero todos los combos, después las hamburguesas y
  después las bebidas

#### Scenario: Un producto nuevo no desordena otras categorías

- **GIVEN** la grilla con Combos y Bebidas
- **WHEN** se agrega un producto a Bebidas
- **THEN** ningún combo cambia de posición

#### Scenario: Las categorías en la netbook

- **GIVEN** 11 categorías y una pantalla de 1366px
- **WHEN** se abre la caja
- **THEN** se ven todas las categorías sin deslizar

#### Scenario: Las categorías en el celular

- **GIVEN** más categorías de las que entran a 390px
- **WHEN** se abre la caja
- **THEN** el borde de la fila indica que hay más para deslizar

### Requirement: Agregar un producto no tapa nada

Agregar un producto al pedido NO SHALL mostrar un aviso flotante. La
confirmación SHALL ser la tarjeta del producto, que queda marcada con la
cantidad.

Existe porque cada toque abría un aviso que tapaba la barra de turno, las
pestañas y, en el celular, "Cerrar caja".

#### Scenario: Se agrega un producto

- **WHEN** se toca un producto
- **THEN** la tarjeta muestra la cantidad
- **AND** no aparece ningún aviso flotante

### Requirement: En los pendientes se distingue el elegido y el pedido nuevo

La fila de pedidos pendientes de cobro se mantiene debajo de la grilla de
productos. El pedido que se está cobrando SHALL ser el de mayor énfasis
visual de la fila. La acción de empezar un pedido nuevo SHALL distinguirse a
simple vista de un pedido pendiente.

Existe porque el pedido elegido era el más pálido de la fila, y "+ Nuevo
pedido" tenía el mismo aspecto que un pedido.

#### Scenario: Se elige un pendiente

- **GIVEN** dos pedidos pendientes
- **WHEN** se toca uno para cobrarlo
- **THEN** ese chip queda más marcado que el otro

#### Scenario: Llega un pedido de WhatsApp

- **WHEN** entra un pedido de WhatsApp mientras se arma otro
- **THEN** aparece en la fila de pendientes, marcado como remoto

### Requirement: El carrito se lee entero

Cada renglón del carrito SHALL mostrar el nombre del producto hasta en dos
renglones antes de cortarlo, y su monto NO SHALL superponerse con ningún otro
elemento, con montos de hasta ocho dígitos. Las opciones que no se están
usando (el envío apagado) SHALL ocupar un solo renglón.

Por debajo de 1024px de ancho, el pedido SHALL abrirse como hoja desde un
botón flotante, y la grilla SHALL usar todo el ancho.

Existe porque en la netbook el monto se montaba sobre el tacho, los nombres
se cortaban a la mitad y el envío ocupaba lugar en cada venta. En tablet
vertical, el carrito vacío ocupaba media pantalla.

#### Scenario: Un combo con nombre largo, dos unidades

- **GIVEN** 2 "Combo Clásico (burger + papas + gaseosa)" en el carrito a 1366px
- **WHEN** se mira el renglón
- **THEN** el nombre se lee completo
- **AND** "$ 29.000" no se superpone con el botón de quitar

#### Scenario: Tablet vertical

- **GIVEN** una pantalla de 820px de ancho
- **WHEN** se abre la caja
- **THEN** la grilla ocupa todo el ancho
- **AND** el pedido se abre desde el botón flotante

### Requirement: La media pizza dice cuánto sale

Un producto mitad y mitad SHALL mostrarse en la grilla con el precio desde el
que arranca, nunca como "$ 0". El selector SHALL mostrar el precio de cada
mitad y el precio que resulta de la combinación elegida.

#### Scenario: La tarjeta en la grilla

- **GIVEN** una mitad y mitad entre pizzas de $11.500 a $15.500
- **WHEN** se mira la grilla
- **THEN** la tarjeta dice "desde $ 11.500"

#### Scenario: Se eligen las dos mitades

- **WHEN** se eligen Fugazzeta ($15.500) y Napolitana ($13.500)
- **THEN** cada opción muestra su precio
- **AND** se ve el precio que va al pedido antes de agregarlo

### Requirement: En el cierre, lo primero es contar, y todo se ve de un vistazo

La pantalla de cierre SHALL ser un solo panel, sin bloques separados. En
1366×768 SHALL verse entera sin desplazarse: la conciliación del efectivo
(esperado, contado y diferencia), lo que impide cerrar, la acción de cerrar y
el resumen del turno (ventas, medios y horario). La conciliación SHALL ser lo
primero en el orden de lectura.

Existe porque la conciliación estaba al final, debajo del resumen, y en la
netbook había que bajar para ver el resultado y el botón. La maqueta del
2026-09-27 la puso primero pero partió la pantalla en dos bloques, y el
resumen quedó abajo, fuera de la vista; David prefiere verlo todo junto.

Las horas SHALL mostrarse en formato de 24 horas. El contado SHALL mostrarse
con separador de miles. Los montos SHALL mostrarse sin centavos, como en el
resto de la caja. Un faltante NO SHALL representarse con un ícono de
confirmación.

#### Scenario: Se cuenta en la netbook

- **GIVEN** la pantalla de cierre en 1366×768
- **WHEN** se escribe 40000 en el contado
- **THEN** se ve "$ 40.000", la diferencia, el botón de cerrar y el resumen
  del turno, sin desplazarse

#### Scenario: Un solo panel

- **WHEN** se abre el cierre
- **THEN** la conciliación y el resumen del turno están dentro del mismo panel

#### Scenario: La hora

- **GIVEN** un turno abierto a las 23:13
- **WHEN** se abre el cierre
- **THEN** la apertura dice "23:13"

#### Scenario: Ticket promedio

- **GIVEN** $41.500 en 3 pedidos
- **WHEN** se mira el resumen
- **THEN** el ticket promedio dice "$ 13.833"

## MODIFIED Requirements

### Requirement: Lo que no se cobró no se muestra como cobrado

La caja SHALL mostrar como cobrado solo un pedido que se cobró. Un pedido
abierto, recibido o con la cuenta pedida SHALL mostrarse "Sin cobrar", sin
medio de pago, y NO SHALL sumar en ningún total de ventas ni de medios de
pago del turno.

Lo vendido en el turno SHALL decirse una sola vez, en la barra de turno
("Vendido"). El Historial NO SHALL repetir ese total ni desglosarlo por medio
de pago: el desglose por medio es del cierre, que es donde se cuenta la plata.
El Historial SHALL filtrar solo por estado (todas, pagadas, sin cobrar,
anuladas), con el conteo de cada una como texto.

El estado de cada pedido del Historial SHALL mostrarse como texto, sin
encerrar: durante el servicio "Sin cobrar" y "Pagado" son el flujo normal, no
la excepción.

Existe porque no se cumplía. El pedido nace con efectivo como medio de
arranque, y el Historial trataba como pagado todo lo que no estaba cancelado.
Con cuatro pedidos sin cobrar mostraba "Total sesión $152.900" y la barra
decía "Vendido $0". Una vez corregido, el total del Historial quedó igual al
"Vendido": el mismo número dos veces, y David lo marcó como ruido, junto con
el filtro por medio de pago, la línea "N ventas" (que contaba también lo sin
cobrar) y las píldoras de estado.

#### Scenario: Un pedido de mostrador pendiente

- **GIVEN** un pedido de mostrador enviado a cocina y todavía no cobrado
- **WHEN** se mira el Historial
- **THEN** la fila dice "Sin cobrar", como texto
- **AND** no muestra ningún medio de pago
- **AND** su monto no suma en el "Vendido" ni en ningún total por medio

#### Scenario: Una mesa abierta

- **GIVEN** una mesa con pedido cargado y sin cobrar
- **WHEN** se mira el Historial
- **THEN** su pedido figura "Sin cobrar" y no suma

#### Scenario: El Historial y la barra dicen lo mismo

- **GIVEN** un turno con un pedido cobrado y dos sin cobrar
- **WHEN** se mira el Historial
- **THEN** el "Vendido" de la barra es la suma del cobrado
- **AND** el Historial no muestra otro total ni un desglose por medio de pago

#### Scenario: Se filtran los que faltan cobrar

- **WHEN** se elige el filtro "Sin cobrar" del Historial
- **THEN** aparecen solo los pedidos que todavía no se cobraron

