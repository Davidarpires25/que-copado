# seguimiento-de-stock Specification

## Purpose
Vigilar cuánto queda de un ítem y avisar antes de que se acabe: qué ítems se
siguen, desde qué cantidad se considera poco, y cómo se cambia cada una de esas
dos cosas sin alterar el stock ni el historial.

## Requirements

### Requirement: El seguimiento se enciende y se apaga por ítem

Cada ingrediente y cada producto de reventa SHALL poder tener su seguimiento de
stock encendido o apagado, y el cambio SHALL aplicarse sin alterar la posición ni
el estado de la pantalla desde donde se hizo.

Es uno de los dos requisitos que este cambio corrige: hasta acá, encender el
seguimiento devolvía la pantalla al tope y quien estaba revisando una tabla larga
perdía el lugar.

#### Scenario: Se enciende el seguimiento desde la tabla

- **WHEN** quien opera enciende el seguimiento de un ítem desde la tabla de stock
- **THEN** el ítem pasa a mostrarse como vigilado
- **AND** la pantalla no se desplaza: sigue mostrando lo mismo que antes del clic
- **AND** no se pierde el filtro ni la búsqueda que estuvieran aplicados

#### Scenario: El cambio no se puede guardar

- **WHEN** el cambio de seguimiento falla en el servidor
- **THEN** el ítem vuelve a mostrarse como estaba
- **AND** se le avisa a quien opera

#### Scenario: Un ítem sin seguimiento no genera alertas

- **WHEN** un ítem tiene el seguimiento apagado
- **THEN** no aparece entre las alertas de stock, cualquiera sea su cantidad

### Requirement: El mínimo se cambia sin mover stock

El umbral que dispara la alerta SHALL poder cambiarse por sí solo, sin registrar
ningún movimiento de stock y sin alterar la cantidad existente.

Es el otro requisito que este cambio corrige. Hasta acá el mínimo solo se editaba
dentro de un ajuste de stock, y el ajuste se negaba a guardarse si la cantidad no
cambiaba: subir un mínimo obligaba a inventar un movimiento. El historial de
movimientos es con lo que después se explica el consumo, y no puede llenarse de
ajustes que no ocurrieron.

#### Scenario: Se cambia solo el mínimo

- **WHEN** quien opera cambia el mínimo de un ítem desde su fila
- **THEN** el nuevo umbral queda guardado
- **AND** la cantidad en stock queda igual
- **AND** no se registra ningún movimiento

#### Scenario: El ítem pasa a estar en alerta al subir el mínimo

- **WHEN** el mínimo nuevo queda por encima de la cantidad actual
- **THEN** el ítem aparece como stock bajo sin necesidad de recargar la pantalla

#### Scenario: Se quita el mínimo

- **WHEN** quien opera deja el mínimo vacío
- **THEN** el ítem queda sin umbral y deja de generar alertas por cantidad

#### Scenario: Un mínimo inválido se rechaza

- **WHEN** se intenta guardar un mínimo negativo o que no es un número
- **THEN** no se guarda
- **AND** se le indica a quien opera qué se espera

#### Scenario: Cambiar el mínimo mientras se corrige stock sigue siendo posible

- **WHEN** quien opera corrige la cantidad de un ítem y de paso cambia su mínimo
- **THEN** las dos cosas se guardan juntas, como hasta ahora

### Requirement: Un ítem vigilado avisa cuando queda poco

Un ítem con seguimiento encendido y con umbral definido SHALL contarse como
alerta de stock bajo cuando su cantidad sea menor o igual al umbral.

#### Scenario: La cantidad cae hasta el umbral

- **WHEN** la cantidad de un ítem vigilado llega a su mínimo o queda por debajo
- **THEN** el ítem figura entre las alertas de stock

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

### Requirement: Un ítem en rojo es siempre una alerta

Un ítem con stock negativo SHALL contarse como alerta de stock **aunque no tenga
mínimo definido**, y SHALL NOT quedar reducido al registro del servidor.

Las alertas se filtraban por "tiene mínimo", así que vender de más algo sin
mínimo dejaba el stock en rojo en silencio total: ni contador, ni cartel, ni
pantalla. El único rastro era un `console.error` del servidor.

La venta no se bloquea: un local vende igual cuando lo que está mal es el conteo
y no la mercadería. Lo que no puede pasar es que nadie se entere.

#### Scenario: Se cobra un pedido que deja stock en negativo

- **WHEN** al descontar el stock de un pedido algún ítem queda por debajo de cero
- **THEN** la venta se completa
- **AND** ese ítem pasa a figurar entre las alertas de stock, con su contador y
  su cartel, sin que nadie tenga que buscarlo

#### Scenario: Un ítem en rojo sin mínimo definido

- **WHEN** un ítem queda en negativo y nunca tuvo un mínimo configurado
- **THEN** aparece igual entre las alertas

### Requirement: El tope de producción frena el pedido

Cuando un producto se arma con insumos vigilados —un elaborado con sus recetas,
un combo con sus recetas y sus componentes—, el sistema SHALL calcular cuántas
unidades se pueden armar con el stock que hay.

Ese tope SHALL aplicarse **cuando el local lo tenga encendido**, y cuando lo
esté SHALL aplicarse en todos los caminos por los que entra un pedido: el
carrito de la web, la confirmación del pedido y el menú que consume el agente de
WhatsApp. El interruptor SHALL arrancar apagado.

Arranca apagado porque el tope vale lo que valen los números de stock: medido
contra los datos reales, encenderlo dejaba 13 de 38 productos con techo de 8 o
menos y cinco con techo de 1, por insumos cargados viejos. Rechazar un pedido
por un dato desactualizado es perder plata.

Hoy el tope se calcula y se descarta. La cuenta corre con un cliente que no
puede leer `ingredients`, así que devuelve "sin tope" siempre, y con stock para
tres hamburguesas la web acepta un pedido de cincuenta. Lo único que frena algo
es la marca de agotado, que es binaria: dice "no hay", nunca "quedan tres".

El tope SHALL calcularse sin exponer el stock de insumos a quien no está
autenticado: lo que sale hacia afuera es cuántas unidades salen, no cuánto queda
de cada ingrediente.

#### Scenario: Se piden más unidades de las que se pueden armar

- **GIVEN** el local tiene el tope encendido
- **WHEN** alguien pide 50 unidades de un producto del que solo se pueden armar 3
- **THEN** el pedido no se confirma
- **AND** se le avisa cuántas quedan disponibles

#### Scenario: Con el tope apagado no se limita la cantidad

- **GIVEN** el local tiene el tope apagado, que es como arranca
- **WHEN** alguien pide 50 unidades de un producto del que solo se pueden armar 3
- **THEN** el pedido se confirma
- **AND** el producto se ofrece sin cantidad máxima
- **AND** un producto agotado del todo se sigue sin ofrecer

#### Scenario: El agente recibe el techo junto con el producto

- **GIVEN** el local tiene el tope encendido
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

### Requirement: El sistema dice qué dejó de ofrecer y por qué

Cuando el sistema deja de ofrecer un producto por falta de stock, SHALL avisarlo
junto a las alertas de stock, nombrando el producto y lo que falta para poder
hacerlo.

Esconder un producto es una decisión comercial y se tomaba en silencio: tres
pizzas desaparecieron del catálogo y el único rastro era un "Salsa de tomate: 0"
en otra lista, sin nada que conectara una cosa con la otra. Quien atiende se
enteró por la calle.

El aviso SHALL aclarar que el mostrador sigue pudiendo vender, porque esconder
solo afecta a la web y a WhatsApp.

Un producto que apagó una persona NO SHALL aparecer en este aviso: quien lo
apagó ya sabe por qué.

#### Scenario: Se esconde un producto por falta de un insumo

- **WHEN** un insumo llega a cero y el sistema deja de ofrecer los productos que
  lo usan
- **THEN** cada producto escondido aparece avisado
- **AND** el aviso nombra el insumo que falta

#### Scenario: Se esconde un combo por un componente

- **GIVEN** un combo que incluye un producto agotado
- **WHEN** el sistema deja de ofrecer el combo
- **THEN** el aviso nombra el componente que falta

#### Scenario: Deja de avisar cuando se resuelve

- **GIVEN** un producto escondido por el sistema
- **WHEN** una persona lo marca disponible
- **THEN** el aviso desaparece

#### Scenario: Lo que apagó una persona no se avisa

- **GIVEN** un producto que una persona marcó agotado
- **THEN** no aparece entre los que el sistema dejó de ofrecer

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
