# seguimiento-de-stock — delta

## ADDED Requirements

### Requirement: El stock se puede llevar al papel para contarlo

El sistema SHALL poder imprimir una planilla con los insumos y lo que dice tener
de cada uno, para contarlos físicamente y anotar a mano.

La planilla SHALL mostrar, por cada insumo: el nombre, la unidad, la cantidad
que el sistema tiene registrada, y espacio en blanco para escribir lo contado y
la diferencia.

SHALL poder elegirse qué categorías de insumo entran, para llevar solo la hoja
del sector que se va a contar.

Existe porque el stock vale lo que valen sus números, y la única forma de saber
si son ciertos es contarlos. Todo lo que se corrigió en este sistema —un
descuento que restaba mil veces menos, costos cargados como total, mínimos de
mil kilos— apareció al cruzar lo que decía el sistema contra la realidad.

#### Scenario: Se imprime la hoja de un sector

- **WHEN** se eligen una o más categorías de insumo y se imprime
- **THEN** la planilla trae solo los insumos de esas categorías
- **AND** cada uno con su unidad y la cantidad registrada
- **AND** con espacio para anotar lo contado y la diferencia

#### Scenario: Los insumos sin categoría no se pierden

- **WHEN** se imprime una planilla que incluye los insumos sin categoría
- **THEN** aparecen agrupados y visibles, no mezclados ni omitidos

#### Scenario: La planilla dice cuándo se imprimió

- **WHEN** se imprime una planilla
- **THEN** lleva la fecha y un lugar para registrar quién contó
