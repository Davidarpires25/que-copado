# Spec Delta

## Purpose

Vigilar cuánto queda de un ítem y avisar antes de que se acabe: qué ítems se
siguen, desde qué cantidad se considera poco, y cómo se cambia cada una de esas
dos cosas sin alterar el stock ni el historial.

## ADDED Requirements

### Requirement: El seguimiento se enciende y se apaga por ítem

Cada ingrediente y cada producto de reventa SHALL poder tener su seguimiento de
stock encendido o apagado, y el cambio SHALL aplicarse sin alterar la posición ni
el estado de la pantalla desde donde se hizo.

Es uno de los dos requisitos que este cambio corrige: hasta acá, encender el
seguimiento devolvía la pantalla al tope y quien estaba revisando una tabla larga
perdía el lugar.

#### Scenario: Se enciende el seguimiento desde la tabla

- **WHEN** quien opera enciende el seguimiento de un ítem desde la tabla de stock
- **THEN** el ítem pasa a mostrarse como vigilado
- **AND** la pantalla no se desplaza: sigue mostrando lo mismo que antes del clic
- **AND** no se pierde el filtro ni la búsqueda que estuvieran aplicados

#### Scenario: El cambio no se puede guardar

- **WHEN** el cambio de seguimiento falla en el servidor
- **THEN** el ítem vuelve a mostrarse como estaba
- **AND** se le avisa a quien opera

#### Scenario: Un ítem sin seguimiento no genera alertas

- **WHEN** un ítem tiene el seguimiento apagado
- **THEN** no aparece entre las alertas de stock, cualquiera sea su cantidad

### Requirement: El mínimo se cambia sin mover stock

El umbral que dispara la alerta SHALL poder cambiarse por sí solo, sin registrar
ningún movimiento de stock y sin alterar la cantidad existente.

Es el otro requisito que este cambio corrige. Hasta acá el mínimo solo se editaba
dentro de un ajuste de stock, y el ajuste se negaba a guardarse si la cantidad no
cambiaba: subir un mínimo obligaba a inventar un movimiento. El historial de
movimientos es con lo que después se explica el consumo, y no puede llenarse de
ajustes que no ocurrieron.

#### Scenario: Se cambia solo el mínimo

- **WHEN** quien opera cambia el mínimo de un ítem desde su fila
- **THEN** el nuevo umbral queda guardado
- **AND** la cantidad en stock queda igual
- **AND** no se registra ningún movimiento

#### Scenario: El ítem pasa a estar en alerta al subir el mínimo

- **WHEN** el mínimo nuevo queda por encima de la cantidad actual
- **THEN** el ítem aparece como stock bajo sin necesidad de recargar la pantalla

#### Scenario: Se quita el mínimo

- **WHEN** quien opera deja el mínimo vacío
- **THEN** el ítem queda sin umbral y deja de generar alertas por cantidad

#### Scenario: Un mínimo inválido se rechaza

- **WHEN** se intenta guardar un mínimo negativo o que no es un número
- **THEN** no se guarda
- **AND** se le indica a quien opera qué se espera

#### Scenario: Cambiar el mínimo mientras se corrige stock sigue siendo posible

- **WHEN** quien opera corrige la cantidad de un ítem y de paso cambia su mínimo
- **THEN** las dos cosas se guardan juntas, como hasta ahora

### Requirement: Un ítem vigilado avisa cuando queda poco

Un ítem con seguimiento encendido y con umbral definido SHALL contarse como
alerta de stock bajo cuando su cantidad sea menor o igual al umbral.

#### Scenario: La cantidad cae hasta el umbral

- **WHEN** la cantidad de un ítem vigilado llega a su mínimo o queda por debajo
- **THEN** el ítem figura entre las alertas de stock
