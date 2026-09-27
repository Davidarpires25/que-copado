# Spec Delta

## ADDED Requirements

### Requirement: Lo que no se cobró no se muestra como cobrado

La caja SHALL mostrar como cobrado solo un pedido que se cobró. Un pedido
abierto, recibido o con la cuenta pedida SHALL mostrarse "Sin cobrar", sin
medio de pago, y NO SHALL sumar en ningún total de ventas ni de medios de
pago del turno.

El total de ventas que muestra el Historial SHALL ser la suma de los pedidos
cobrados del turno, que es lo mismo que la barra de turno llama "Vendido".

Existe porque no se cumplía. El pedido nace con efectivo como medio de
arranque, y el Historial trataba como pagado todo lo que no estaba cancelado.
Con cuatro pedidos sin cobrar mostraba "Total sesión $152.900" y la barra
decía "Vendido $0".

#### Scenario: Un pedido de mostrador pendiente

- **GIVEN** un pedido de mostrador enviado a cocina y todavía no cobrado
- **WHEN** se mira el Historial
- **THEN** la fila dice "Sin cobrar"
- **AND** no muestra ningún medio de pago
- **AND** su monto no suma en el total de la sesión ni en el de ningún medio

#### Scenario: Una mesa abierta

- **GIVEN** una mesa con pedido cargado y sin cobrar
- **WHEN** se mira el Historial
- **THEN** su pedido figura "Sin cobrar" y no suma

#### Scenario: El Historial y la barra dicen lo mismo

- **GIVEN** un turno con dos pedidos cobrados y dos sin cobrar
- **WHEN** se mira el Historial
- **THEN** su total es la suma de los dos cobrados
- **AND** coincide con el "Vendido" de la barra de turno

#### Scenario: Se filtran los que faltan cobrar

- **WHEN** se elige el filtro "Sin cobrar" del Historial
- **THEN** aparecen solo los pedidos que todavía no se cobraron

### Requirement: El vuelto se ve mientras se tipea

En el cobro, el resto, lo recibido y el vuelto SHALL reflejar el monto que se
está escribiendo, sin esperar a que el campo pierda el foco. Lo que se muestra
mientras se escribe SHALL ser lo mismo que queda al confirmar ese monto.

Existe porque el vuelto aparecía recién al tocar afuera del campo. Justo en el
momento de contar el cambio, la pantalla no lo mostraba.

#### Scenario: Se tipea lo que entrega el cliente

- **GIVEN** un cobro de $65.900 con Efectivo elegido
- **WHEN** se escribe 100000 en el monto de Efectivo, sin salir del campo
- **THEN** se ve "Recibís $100.000" y "Vuelto $34.100"

#### Scenario: Lo que se vio es lo que se cobra

- **GIVEN** un monto a medio escribir que muestra un vuelto
- **WHEN** se confirma el cobro
- **THEN** el pago registrado y el vuelto son los que se estaban viendo

### Requirement: El turno no se cierra con cosas sin cobrar

El turno NO SHALL poder cerrarse mientras haya mesas abiertas o pedidos de
mostrador de ese turno sin cobrar. La regla SHALL aplicarse en el servidor,
sea cual sea el camino por el que se pide el cierre.

La pantalla de cierre SHALL decir qué impide cerrar, junto a la acción de
cerrar, y SHALL listar cada mesa o pedido pendiente con su monto.

Los pedidos web o de WhatsApp que todavía no se cobraron NO SHALL impedir el
cierre, porque no pertenecen a ningún turno hasta que se cobran. La pantalla
SHALL avisar que existen.

Existe porque no se cumplía. El botón se deshabilitaba con mesas abiertas,
pero Enter en el campo del efectivo contado cerraba igual y el servidor no
validaba nada. Los pedidos de mostrador sin cobrar no se tenían en cuenta.

#### Scenario: Enter con una mesa abierta

- **GIVEN** una mesa abierta
- **WHEN** en el cierre se escribe el efectivo contado y se aprieta Enter
- **THEN** el turno sigue abierto
- **AND** la pantalla dice que la mesa impide cerrar

#### Scenario: Un pedido de mostrador sin cobrar

- **GIVEN** un pedido de mostrador del turno enviado a cocina y sin cobrar
- **WHEN** se intenta cerrar el turno
- **THEN** el turno sigue abierto
- **AND** junto a la acción de cerrar figura ese pedido con su monto

#### Scenario: El servidor rechaza el cierre aunque la pantalla no lo impida

- **GIVEN** una mesa abierta
- **WHEN** se pide el cierre del turno directamente al servidor
- **THEN** el cierre se rechaza con un error que nombra lo que falta cobrar
- **AND** el turno sigue abierto

#### Scenario: Un pedido web sin cobrar no bloquea

- **GIVEN** un pedido de WhatsApp recibido y sin cobrar, y nada más pendiente
- **WHEN** se cierra el turno
- **THEN** el turno se cierra
- **AND** antes de cerrar, la pantalla avisa que ese pedido existe

#### Scenario: Sin nada pendiente

- **GIVEN** ninguna mesa abierta y ningún pedido de mostrador sin cobrar
- **WHEN** se escribe el efectivo contado y se confirma
- **THEN** el turno se cierra

### Requirement: El efectivo esperado muestra de dónde sale

El cierre SHALL mostrar el efectivo esperado junto con lo que lo compone:
apertura, ventas en efectivo, ingresos y retiros. Las partes SHALL sumar el
esperado.

Existe porque el esperado aparecía como un número solo. Ante un faltante no
había forma de ver de dónde salía sin hacer la cuenta aparte.

#### Scenario: Un turno con apertura, ventas y un retiro

- **GIVEN** un turno abierto con $20.000, $26.000 vendidos en efectivo y un
  retiro de $5.000
- **WHEN** se abre el cierre
- **THEN** se ve Apertura $20.000, Ventas en efectivo $26.000 y Retiros
  −$5.000
- **AND** el esperado es $41.000

#### Scenario: Lo que no hubo no ocupa lugar

- **GIVEN** un turno sin ingresos ni retiros
- **WHEN** se abre el cierre
- **THEN** el desglose muestra solo apertura y ventas en efectivo
