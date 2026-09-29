# Spec Delta

## ADDED Requirements

### Requirement: La ficha técnica se imprime para usarse en la cocina

La ficha técnica de un producto SHALL imprimirse para una cantidad elegida, y
SHALL mostrar para esa cantidad cada ingrediente con lo que hay que usar, el
stock disponible y su costo, más el costo del lote y el costo por unidad.

Cuando ningún ingrediente viene de una preparación previa, la ficha SHALL
mostrar los ingredientes en una sola tabla. Cuando alguno sí, SHALL mostrar el
desglose por receta y después la lista de lo que hay que juntar.

Cada ingrediente de la lista SHALL tener un casillero para tildarlo. La hoja
SHALL tener arriba un espacio para escribir quién preparó, la fecha y
observaciones, como la planilla de conteo.

La hoja NO SHALL mostrar datos que repiten otro o que no significan nada: la
receta base, el factor de escala o una versión que es la fecha.

Existe porque la ficha imprimía el desglose y la lista de compras con las
mismas filas cuando la receta no tenía preparaciones previas, y repetía la
cantidad como "receta base" y "factor de escala".

#### Scenario: Una hamburguesa sin preparaciones previas

- **GIVEN** la Hamburguesa simple, con cuatro ingredientes que se usan tal
  cual
- **WHEN** se imprime su ficha para 10 unidades
- **THEN** sale una sola tabla con los cuatro ingredientes
- **AND** cada uno con su casillero, la cantidad para 10, el stock y el costo

#### Scenario: Un producto con una preparación previa

- **GIVEN** un producto que lleva una salsa que se prepara con otros insumos
- **WHEN** se imprime su ficha
- **THEN** sale el desglose, con la salsa y sus insumos
- **AND** después la lista de insumos a juntar

#### Scenario: Falta stock para el lote

- **GIVEN** un insumo con seguimiento y menos stock que lo que pide el lote
- **WHEN** se imprime la ficha
- **THEN** ese insumo se marca como faltante

#### Scenario: Quién preparó

- **WHEN** se imprime una ficha
- **THEN** arriba hay espacio para escribir quién preparó, la fecha y
  observaciones
- **AND** no hay líneas de firma al pie
