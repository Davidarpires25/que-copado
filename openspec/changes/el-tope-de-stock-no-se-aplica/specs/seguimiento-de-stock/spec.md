# seguimiento-de-stock — delta

## ADDED Requirements

### Requirement: El tope de producción frena el pedido

Cuando un producto se arma con insumos vigilados —un elaborado con sus recetas,
un combo con sus recetas y sus componentes—, el sistema SHALL calcular cuántas
unidades se pueden armar con el stock que hay, y ese tope SHALL aplicarse en
todos los caminos por los que entra un pedido: el carrito de la web, la
confirmación del pedido y el menú que consume el agente de WhatsApp.

Hoy el tope se calcula y se descarta. La cuenta corre con un cliente que no
puede leer `ingredients`, así que devuelve "sin tope" siempre, y con stock para
tres hamburguesas la web acepta un pedido de cincuenta. Lo único que frena algo
es la marca de agotado, que es binaria: dice "no hay", nunca "quedan tres".

El tope SHALL calcularse sin exponer el stock de insumos a quien no está
autenticado: lo que sale hacia afuera es cuántas unidades salen, no cuánto queda
de cada ingrediente.

#### Scenario: Se piden más unidades de las que se pueden armar

- **WHEN** alguien pide 50 unidades de un producto del que solo se pueden armar 3
- **THEN** el pedido no se confirma
- **AND** se le avisa cuántas quedan disponibles

#### Scenario: El agente recibe el techo junto con el producto

- **WHEN** el agente de WhatsApp pide el menú
- **AND** un producto se arma con insumos vigilados
- **THEN** el producto viene con su cantidad máxima
- **AND** esa cantidad es la misma que aplicaría el checkout

#### Scenario: Un producto sin insumos vigilados no tiene techo

- **WHEN** ninguno de los insumos de un producto tiene el seguimiento encendido
- **THEN** el producto se ofrece sin cantidad máxima

#### Scenario: El techo de un combo sale de sus dos partes

- **WHEN** un combo lleva recetas propias y componentes
- **THEN** su techo es el menor entre lo que permiten sus recetas y lo que
  permite cada componente
- **AND** la cantidad de cada componente divide: un combo con 2 gaseosas y 5 en
  la heladera se puede armar 2 veces

#### Scenario: El stock de insumos no se expone

- **WHEN** alguien sin autenticar consulta el catálogo
- **THEN** obtiene la cantidad máxima de cada producto
- **AND** no obtiene el stock de los ingredientes con que se arma
