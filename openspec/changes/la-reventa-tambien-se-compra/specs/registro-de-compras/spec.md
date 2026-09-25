# registro-de-compras — delta

## ADDED Requirements

### Requirement: La reventa también se compra

La carga de una compra SHALL permitir agregar productos de reventa, además de
insumos, en la misma compra. NO SHALL ofrecer elaborados ni combos: se
producen, no se compran.

Cada línea SHALL mostrar si es un insumo o un producto de reventa.

Al confirmarse, una línea de reventa SHALL sumar la cantidad al stock del
producto, actualizar su costo si se cargó uno, y registrar un movimiento de
tipo `purchase` asociado al producto, en la misma transacción que el resto de
la compra.

Existe porque lo que entra por la puerta también son bebidas que se venden tal
cual, y hasta ahora su stock entraba como ajuste —que en el historial se lee
como una corrección— y su costo no tenía por dónde entrar.

#### Scenario: Una compra mixta

- **WHEN** se carga una compra con un insumo y una gaseosa
- **THEN** los dos suman su stock
- **AND** quedan dos movimientos `purchase`, uno con el insumo y otro con el
  producto

#### Scenario: El costo de una bebida entra con la compra

- **WHEN** se compra una gaseosa que no tenía costo, cargando $1.900 por unidad
- **THEN** el producto queda con costo $1.900
- **AND** el reporte de costos deja de mostrarla como `sin costo`

#### Scenario: Un combo que la usa

- **WHEN** cambia el costo de una reventa que es componente de un combo
- **THEN** el costo del combo se recalcula

#### Scenario: Un elaborado no aparece

- **WHEN** se busca un producto elaborado en la carga de la compra
- **THEN** no aparece entre los resultados

#### Scenario: Una reventa sin seguimiento

- **WHEN** se compra un producto de reventa que no tenía seguimiento de stock
- **THEN** queda con el seguimiento activado y con el stock comprado

