# Spec Delta

## ADDED Requirements

### Requirement: Estar en cero o por debajo cuenta como agotado

Un producto cuyo stock disponible sea cero **o menor** SHALL marcarse como
agotado. La regla SHALL aplicar tanto al stock propio de un producto de reventa
como al stock teórico de un elaborado y a la disponibilidad de un combo.

Hasta acá la condición preguntaba por cero exacto, así que un producto en
negativo se seguía ofreciendo: el caso que se vio en pruebas fue un ingrediente
en -39 con su producto todavía a la venta.

#### Scenario: El stock queda en negativo

- **WHEN** el stock disponible de un producto queda por debajo de cero
- **THEN** el producto figura como agotado
- **AND** vuelve a estar disponible recién cuando el stock supera el cero

#### Scenario: Un elaborado cuyos ingredientes están en rojo

- **WHEN** algún ingrediente de la receta de un elaborado queda en negativo
- **THEN** el elaborado figura como agotado

#### Scenario: Lo apagado a mano sigue apagado

- **WHEN** el stock se recupera sobre un producto que una persona marcó agotado
  manualmente
- **THEN** el producto sigue agotado hasta que esa persona lo reactive

### Requirement: El stock en rojo se distingue del stock bajo

La pantalla de stock SHALL mostrar de forma diferenciada los ítems cuyo stock sea
negativo, sin confundirlos con los que están por debajo de su mínimo.

Un ingrediente con 2 unidades y mínimo 5 es una compra pendiente. Uno con -39 es
un error de carga o una venta sin respaldo, y necesita otra acción.

#### Scenario: Un ingrediente en negativo

- **WHEN** un ingrediente o producto tiene stock menor a cero
- **THEN** la pantalla de stock lo señala como en rojo, distinto de "bajo"
- **AND** la cantidad negativa se lee tal cual, sin redondear a cero

### Requirement: Una venta que deja stock en rojo se avisa

Cuando una venta deje algún ítem con stock negativo, el sistema SHALL dejar
constancia visible para quien opera, y SHALL NOT limitarse al registro del
servidor.

La venta no se bloquea: un local vende igual cuando lo que está mal es el conteo
y no la mercadería. Lo que no puede pasar es que nadie se entere.

#### Scenario: Se cobra un pedido que deja stock en negativo

- **WHEN** al descontar el stock de un pedido algún ítem queda por debajo de cero
- **THEN** la venta se completa
- **AND** quien la cobró recibe un aviso de qué quedó en rojo
