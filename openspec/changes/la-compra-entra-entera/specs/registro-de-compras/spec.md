# registro-de-compras — delta

## ADDED Requirements

### Requirement: La compra entra entera o no entra

Registrar una compra SHALL ser una sola operación: o se aplican todas sus líneas
con sus movimientos de historial, o no se aplica ninguna.

El movimiento de cada línea NO SHALL poder perderse: si no se puede escribir el
historial, la compra no se registra.

Existe porque no se cumplía. La compra recorría sus líneas de a una, y si la
quinta fallaba las cuatro anteriores ya estaban aplicadas. Peor: si fallaba el
registro del movimiento, el stock cambiaba igual y el aviso moría en la consola
de desarrollo — el stock quedaba alto y el historial no lo explicaba.

Ese historial es de donde sale todo lo que después se puede reconstruir: cuánto
se usó de verdad de un insumo, si un descuento estaba mal. Un movimiento que
falta es un número que nadie recupera.

#### Scenario: Una línea de la compra no se puede aplicar

- **GIVEN** una compra de varias líneas
- **WHEN** una de ellas no se puede aplicar
- **THEN** ninguna línea queda aplicada
- **AND** no queda ningún movimiento de esa compra en el historial

#### Scenario: La compra se aplica completa

- **WHEN** todas las líneas se pueden aplicar
- **THEN** el stock de cada insumo sube lo que dice su línea
- **AND** queda un movimiento por línea, con el stock anterior y el nuevo
- **AND** el costo de los productos que usan un insumo cuyo costo cambió se
  recalcula
