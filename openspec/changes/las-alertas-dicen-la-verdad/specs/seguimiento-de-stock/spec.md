# seguimiento-de-stock — delta

## ADDED Requirements

### Requirement: Un mínimo fuera de escala se avisa al cargarlo

Cuando se carga un stock mínimo muy por encima de lo que se compra habitualmente
de ese insumo, el sistema SHALL advertirlo antes de guardar.

Existe porque un mínimo mal cargado no produce una alerta: produce ruido
permanente que apaga todas las demás. `Queso muzzarela` quedó con un mínimo de
1000 kg contra un stock de 5,40, y `Queso Tybo` con 1000 unidades contra 141.
Los dos aparecían como "stock bajo" todos los días, sin posibilidad de dejar de
aparecer, y el cartel que los contaba dejó de querer decir algo.

#### Scenario: Se carga un mínimo muy por encima de lo habitual

- **WHEN** alguien pone como mínimo una cantidad mucho mayor que las compras
  habituales de ese insumo
- **THEN** se le advierte antes de guardar
- **AND** puede guardarlo igual si es lo que quiere

#### Scenario: Un mínimo razonable no molesta

- **WHEN** el mínimo está en el orden de lo que se compra
- **THEN** se guarda sin advertencia
