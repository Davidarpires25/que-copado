# registro-de-compras — delta

## ADDED Requirements

### Requirement: La carga muestra lo que se está declarando

Al registrar una compra, el sistema SHALL mostrar el total de cada línea
—cantidad por costo unitario— y el total de la compra, a medida que se escriben.

Existe porque su ausencia costó plata: el formulario pedía "costo por unidad" y
no mostraba ningún total, así que cargar 200 g de morrón a $200 la unidad —una
compra de $40.000 en morrones— no tenía forma de verse. El costo quedó mil veces
inflado y nadie lo notó, porque el cálculo del costo de los productos lo dividía
por mil del otro lado y el resultado parecía razonable.

#### Scenario: Se carga una línea con cantidad y costo

- **WHEN** se escriben la cantidad y el costo por unidad de un ingrediente
- **THEN** la línea muestra cuánto suma

#### Scenario: Una línea sin costo no rompe el total

- **GIVEN** que el costo por unidad es opcional
- **WHEN** hay líneas sin costo cargado
- **THEN** el total de la compra suma solo las que tienen costo
- **AND** se indica cuántas líneas de cuántas están sumando
