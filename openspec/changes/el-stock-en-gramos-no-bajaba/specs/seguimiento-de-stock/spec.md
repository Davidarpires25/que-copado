# seguimiento-de-stock — delta

## ADDED Requirements

### Requirement: Se descuenta lo que la receta dice, en cualquier unidad

Al vender, el sistema SHALL descontar de cada insumo la cantidad que indica la
receta, expresada en la unidad en que ese insumo tiene cargado su stock.

El cálculo de cuántas unidades se pueden armar SHALL comparar las dos cantidades
—lo que hace falta y lo que hay— llevadas a la misma unidad.

Existe porque no se cumplía: la receta se convertía a unidad base para poder
comparar entre recetas, y ese número se restaba tal cual a un stock guardado en
gramos. Una receta de 30 g descontaba 0,03, y el insumo alcanzaba para 6.662
unidades en vez de 6. Los insumos cargados en gramos o mililitros no bajaban
nunca y nunca avisaban que se estaban acabando.

#### Scenario: Un insumo en gramos con una receta en gramos

- **GIVEN** un insumo con 30 g de stock
- **AND** una receta que pide 1 g por unidad
- **WHEN** se vende una unidad
- **THEN** el insumo queda en 29 g

#### Scenario: Un insumo en kilos con una receta en gramos

- **GIVEN** un insumo con 5 kg de stock
- **AND** una receta que pide 250 g por unidad
- **WHEN** se vende una unidad
- **THEN** el insumo queda en 4,75 kg

#### Scenario: El techo se calcula con las dos cantidades en la misma unidad

- **GIVEN** un insumo con 200 g de stock
- **AND** una receta que pide 30 g por unidad
- **THEN** alcanza para 6 unidades
