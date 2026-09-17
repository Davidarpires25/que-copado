# Spec Delta

## Purpose

Vender varios productos juntos a un precio propio, descontando del mismo
inventario del que descuentan esos productos cuando se venden sueltos, y sabiendo
cuánto cuesta realmente la promoción.

Un combo es una cosa sola para quien lo compra y varias para quien lo prepara y
para el inventario. Esa diferencia es la que ordena todo lo que sigue.

## ADDED Requirements

### Requirement: Un combo se arma con productos que ya existen

Un combo SHALL definirse como una lista de componentes, donde cada componente es
un producto del catálogo con una cantidad. Un combo SHALL NOT tener receta ni
stock propio.

Un componente puede ser un producto de reventa o uno elaborado, y SHALL ser el
mismo producto que se vende suelto: no una copia con otro nombre.

#### Scenario: Se arma un combo

- **WHEN** quien configura crea un combo y le agrega componentes
- **THEN** cada componente queda asociado con su cantidad
- **AND** el combo se vende a su propio precio, independiente de la suma de sus
  partes

#### Scenario: Un combo no lleva stock propio

- **WHEN** se mira un combo en la pantalla de stock
- **THEN** no se le puede seguir stock ni definir un mínimo
- **AND** su disponibilidad depende de la de sus componentes

#### Scenario: Un combo sin componentes no se puede vender

- **WHEN** un combo no tiene ningún componente
- **THEN** no puede confirmarse una venta que lo incluya
- **AND** quien configura ve que está incompleto

### Requirement: Vender un combo descuenta lo que descontarían sus partes

Al venderse un combo, el sistema SHALL descontar exactamente lo mismo que si se
hubieran vendido sus componentes por separado, multiplicado por la cantidad de
combos vendidos.

Es el motivo del cambio: hoy la bebida de un combo se carga como ingrediente y
descuenta de un inventario paralelo al de esa misma bebida vendida suelta, así
que ninguno de los dos dice cuántas botellas quedan.

#### Scenario: El combo incluye un producto de reventa

- **WHEN** se vende un combo que incluye una bebida
- **THEN** se descuenta esa bebida del mismo stock del que descuenta venderla
  suelta
- **AND** queda registrada como movimiento de venta

#### Scenario: El combo incluye un producto elaborado

- **WHEN** se vende un combo que incluye una hamburguesa
- **THEN** se descuentan los ingredientes de su receta, con sus mermas y
  sub-recetas, igual que si se vendiera la hamburguesa sola

#### Scenario: Se venden varios combos

- **WHEN** se venden tres combos de una vez
- **THEN** cada componente se descuenta tres veces su cantidad

#### Scenario: Se cancela una venta con combos

- **WHEN** se cancela un pedido que incluía combos
- **THEN** se devuelve lo descontado por cada componente

### Requirement: El costo del combo es la suma de sus componentes

El costo de un combo SHALL calcularse sumando el costo de cada componente por su
cantidad, y SHALL recalcularse cuando cambie el costo de cualquiera de ellos.

#### Scenario: Cambia el precio de compra de un componente

- **WHEN** una compra actualiza el costo de un ingrediente o de un producto de
  reventa que forma parte de un combo
- **THEN** el costo del combo queda actualizado

### Requirement: En el ticket, el combo es una sola línea

El ticket de venta SHALL mostrar el combo como una única línea con su nombre y su
precio, y SHALL NOT detallar sus componentes.

El ticket es del cliente: lo que compró es el combo, y desglosarlo lo vuelve más
largo y más confuso sin decirle nada que no sepa. La cocina es otra cosa y tiene
su propio documento, donde los componentes sí aparecen.

#### Scenario: Se imprime el ticket

- **WHEN** se imprime el ticket de un pedido con un combo
- **THEN** figura una línea con el nombre del combo y su precio
- **AND** no figuran sus componentes ni precios por parte

### Requirement: La cocina recibe los componentes, no el combo

Las comandas SHALL armarse a partir de los componentes del combo y SHALL
respetar la estación de cada uno. Un componente que no va a cocina SHALL NOT
generar comanda.

#### Scenario: Un combo con preparación y bebida

- **WHEN** se envía a cocina un combo con una hamburguesa y una bebida
- **THEN** la hamburguesa aparece en la comanda de su estación
- **AND** la bebida no genera comanda de cocina
- **AND** la comanda indica que ese ítem pertenece a un combo, para que se
  despache junto

#### Scenario: Un combo con componentes de dos estaciones

- **WHEN** los componentes van a estaciones distintas
- **THEN** cada uno aparece en la comanda de la suya
