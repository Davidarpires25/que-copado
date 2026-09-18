# seguimiento-de-stock — delta

## ADDED Requirements

### Requirement: Quien atiende puede contradecir al stock

Cuando una persona marca un producto como disponible, el sistema SHALL
mantenerlo visible aunque el stock calculado diga que no se puede armar, hasta
que esa persona lo marque agotado o el stock se recupere.

Existe porque el stock puede estar mal y quien atiende ve la cocina. Una receta
de pizza descontaba un pote entero de salsa por pizza cuando un pote hace tres:
las pizzas desaparecían, en la cocina había salsa, y prenderlas a mano no servía
porque el barrido las apagaba al siguiente movimiento de stock.

Cuando el stock se recupera, la excepción SHALL soltarse sola: el producto vuelve
a seguir al stock sin que nadie tenga que acordarse de sacarla.

Marcar un producto disponible o agotado SHALL escribir lo mismo desde cualquier
pantalla que ofrezca hacerlo.

#### Scenario: Se prende a mano un producto sin insumo

- **GIVEN** un producto que el sistema escondió porque su insumo llegó a cero
- **WHEN** una persona lo marca como disponible
- **THEN** el producto se ofrece
- **AND** queda registrado que la decisión fue de una persona

#### Scenario: El barrido no revierte la decisión

- **GIVEN** un producto que una persona marcó disponible sin insumo
- **WHEN** ocurre cualquier otro movimiento de stock
- **THEN** el producto sigue ofreciéndose

#### Scenario: La excepción se suelta al recuperarse el stock

- **GIVEN** un producto que una persona marcó disponible sin insumo
- **WHEN** vuelve a haber stock de sus insumos
- **THEN** el producto sigue ofreciéndose
- **AND** deja de estar marcado como decisión de una persona
- **AND** la próxima vez que el insumo se acabe, el sistema lo esconde

#### Scenario: Un producto que nadie tocó sigue al stock

- **GIVEN** un producto que nadie marcó a mano
- **WHEN** su insumo llega a cero
- **THEN** el sistema lo esconde
