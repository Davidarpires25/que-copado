# registro-de-compras Specification

## Purpose
Registrar el ingreso de mercadería al inventario: qué entró, cuánto y a qué
costo, dejando el stock actualizado y el movimiento asentado para que el consumo
posterior se pueda explicar contra algo.

## Requirements

### Requirement: La carga de una compra ocupa una pantalla propia

Registrar una compra SHALL ocurrir en una pantalla dedicada, con su propia
dirección, y no superpuesta a la vista de stock.

Es el único requisito que este cambio altera: hasta acá la carga vivía en un
diálogo sobre la tabla de stock, y a partir de la tercera línea dejaba de verse
entera. Una compra de proveedor tiene ocho o diez líneas y hay que poder releerla
antes de confirmarla.

#### Scenario: Se abre la carga de una compra

- **WHEN** quien opera pide registrar una compra desde la vista de stock
- **THEN** el sistema lo lleva a una pantalla dedicada a esa carga, con una
  dirección propia que puede compartirse o volver a abrirse
- **AND** el formulario dispone del ancho completo, sin quedar contenido dentro
  de otra vista ni con un desplazamiento propio anidado

#### Scenario: Se confirma la compra

- **WHEN** la compra se registra correctamente
- **THEN** el sistema devuelve a quien opera a la vista de stock
- **AND** la vista refleja las cantidades ya actualizadas
- **AND** se le confirma cuántos ítems se actualizaron

#### Scenario: Se abandona la carga

- **WHEN** quien opera cancela o sale sin confirmar
- **THEN** vuelve a la vista de stock
- **AND** no se registra ningún movimiento ni se altera ninguna cantidad

#### Scenario: Todavía no hay ingredientes cargados

- **WHEN** se abre la carga de una compra y el negocio no tiene ningún
  ingrediente dado de alta
- **THEN** la pantalla lo dice y ofrece ir a crear uno
- **AND** no se presenta un selector de ingredientes vacío

### Requirement: Los ingredientes se agregan buscándolos por nombre

La pantalla SHALL ofrecer una búsqueda por nombre sobre los ingredientes
disponibles, y agregar uno a la compra SHALL ser elegirlo desde ahí. La compra en
curso SHALL mostrarse al mismo tiempo que la búsqueda, con lo ya agregado a la
vista.

Un desplegable por línea obliga a recorrer la lista entera tantas veces como
ingredientes tenga la compra, y con un catálogo que crece eso empeora solo. Una
búsqueda se escribe una vez por ingrediente.

#### Scenario: Se busca y se agrega

- **WHEN** quien opera escribe parte del nombre de un ingrediente
- **THEN** la lista se reduce a los que coinciden
- **AND** elegir uno lo agrega a la compra en curso, con su unidad a la vista
- **AND** la búsqueda queda lista para el siguiente sin borrar lo agregado

#### Scenario: Se agrega uno que ya estaba

- **WHEN** se elige un ingrediente que ya forma parte de la compra
- **THEN** no se agrega una segunda línea para el mismo ingrediente
- **AND** el sistema señala cuál es la línea que ya existe

#### Scenario: La búsqueda no encuentra nada

- **WHEN** ningún ingrediente coincide con lo escrito
- **THEN** la pantalla lo dice, en vez de mostrar una lista vacía sin explicación

#### Scenario: Se quita un ingrediente de la compra

- **WHEN** quien opera quita una línea
- **THEN** esa línea desaparece de la compra
- **AND** el ingrediente vuelve a poder agregarse desde la búsqueda

### Requirement: Una compra registra varias líneas en un solo acto

Una compra SHALL registrarse como un único acto: todas sus líneas —cada una con
su ingrediente, su cantidad y opcionalmente su costo por unidad— con un motivo
común.

#### Scenario: Cada línea lleva su cantidad

- **WHEN** hay ingredientes agregados a la compra
- **THEN** cada uno acepta una cantidad y un costo por unidad
- **AND** la unidad de medida mostrada es la del ingrediente

#### Scenario: Todavía no se agregó ningún ingrediente

- **WHEN** la compra no tiene ninguna línea
- **THEN** no puede confirmarse
- **AND** la pantalla indica que hay que buscar y agregar ingredientes

#### Scenario: El motivo es opcional

- **WHEN** se confirma una compra sin escribir un motivo
- **THEN** el movimiento queda asentado con un motivo genérico de compra de
  mercadería
- **AND** el campo del motivo forma parte del mismo panel que las líneas, no de
  una pieza aparte

### Requirement: Una compra incompleta no se registra

El sistema SHALL rechazar una compra en la que alguna línea no tenga ingrediente
o cuya cantidad no sea mayor a cero, y SHALL rechazar un costo por unidad
negativo. La validación SHALL aplicarse también cuando la solicitud no proviene
del formulario.

#### Scenario: Falta el ingrediente o la cantidad

- **WHEN** se intenta confirmar con alguna línea sin ingrediente, o con cantidad
  vacía o menor o igual a cero
- **THEN** la compra no se registra
- **AND** se le indica a quien opera qué falta completar

#### Scenario: La compra no trae ninguna línea

- **WHEN** llega una solicitud de compra sin líneas
- **THEN** se rechaza indicando que debe incluir al menos un ítem

#### Scenario: El costo por unidad es negativo

- **WHEN** alguna línea trae un costo por unidad menor a cero
- **THEN** la compra se rechaza

### Requirement: Una compra confirmada suma stock y deja rastro

Al confirmarse, cada línea SHALL sumar su cantidad al stock del ingrediente y
SHALL quedar asentada como un movimiento de tipo compra, con la cantidad y el
stock anterior y posterior.

#### Scenario: El stock queda actualizado

- **WHEN** se confirma una compra
- **THEN** el stock de cada ingrediente aumenta en la cantidad de su línea
- **AND** queda un movimiento de compra por línea, con el stock anterior, el
  posterior y quién lo registró

#### Scenario: La compra informa un costo nuevo

- **WHEN** una línea trae costo por unidad
- **THEN** ese pasa a ser el costo del ingrediente
- **AND** los productos cuya receta lo usa quedan recosteados

#### Scenario: La compra repone un elaborado agotado

- **WHEN** la compra repone ingredientes de un producto elaborado que estaba
  marcado como sin stock automáticamente
- **THEN** el producto vuelve a quedar disponible sin intervención manual

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
