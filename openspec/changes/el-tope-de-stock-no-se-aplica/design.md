# Design

## Context

Ver `proposal.md` — Why. Lo que condiciona el diseño:

- **La cuenta ya existe y es una sola.** `getMaxElaboradoQuantity()` recorre
  `product_recipes → recipes → recipe_ingredients → ingredients`, convierte
  unidades y aplica mermas. `getMaxComboQuantity()` la reusa y le suma los
  componentes. Costó trabajo que fuera una sola copia: este proyecto ya pagó dos
  veces el precio de tener la misma cuenta escrita dos veces —los dos barridos
  de disponibilidad y los dos cálculos de stock teórico—.
- **El problema no es la cuenta, son los permisos con que corre.**
  `createAdminClient()` devuelve un cliente con la clave `anon`, e `ingredients`
  solo tiene policy de lectura para `authenticated`.
- **Los tres caminos afectados son de servidor.** Server Actions y una API
  route. Nada de esto corre en el navegador.

## Goals / Non-Goals

**Goals**

- Que el tope se aplique en los tres caminos.
- Que la cuenta siga siendo una sola.
- Que el stock de insumos no se exponga a quien no está autenticado.

**Non-Goals**

- Cambiar la cuenta. Queda igual.
- Renombrar `createAdminClient`, que usa la clave anon y se llama "admin"
  (ver proposal — Fuera de alcance).
- Revisar el resto de las policies.

## Decisions

### El cliente elevado vive adentro del helper, y no sale de ahí

`getMaxElaboradoQuantity` y `getMaxComboQuantity` consiguen su propio cliente de
service role para leer recetas e ingredientes. El cliente que les pasa quien
llama se usa solo como respaldo.

Queda encerrado en un helper de **lectura** que toca tres tablas —`products`,
`product_recipes`/`recipes`/`recipe_ingredients`/`ingredients`,
`product_components`— y devuelve un número. No escribe nada y no le presta el
cliente a nadie.

**Alternativa considerada: una función `security definer` en SQL** que devuelva
el tope. Es la que insinuaba la propuesta y es la más prolija en cuanto a
permisos: `anon` pregunta "cuántas salen" y recibe un número, sin ver el stock.
Se descarta porque obliga a **escribir la cuenta por segunda vez**, en SQL:
conversión de unidades, mermas y sub-recetas. Es exactamente el error que este
proyecto ya cometió dos veces, y las dos veces el bug fue el mismo —se extendió
una copia y no la otra—. Un permiso mal puesto se arregla; dos cuentas que
divergen se descubren cuando ya vendiste de menos.

**Alternativa considerada: pasar el cliente de service role desde cada camino.**
Los tres tendrían que acordarse de hacerlo, y el próximo camino que se agregue
se va a olvidar. Es el mismo olvido que originó este cambio.

### Sin la clave configurada, se comporta como hoy

`createServiceRoleClient()` explota si falta `SUPABASE_SERVICE_ROLE_KEY`. Acá no
puede explotar: dejaría la web sin poder confirmar un pedido por una variable de
entorno.

Si falta la clave, el helper usa el cliente que le pasaron —que es lo que hace
hoy— y avisa por log. El tope vuelve a no aplicarse, que es el estado actual: se
degrada a lo de antes, no a algo peor.

**Por qué no fallar cerrado:** un pedido rechazado por una variable mal puesta es
peor que un pedido que entra sin techo. El techo es una mejora sobre lo que hay;
que su ausencia corte la venta sería una regresión.

### El stock de insumos sigue sin salir hacia afuera

Lo que cruza al cliente es `max_quantity`: cuántas unidades salen. El stock de
cada ingrediente no aparece en ninguna respuesta —ni en el menú del agente, ni
en la validación del carrito, ni en el error de confirmación—, y la policy de
`ingredients` no se toca: `anon` sigue sin poder leer esa tabla.

## Risks

**Pedidos que hoy entran van a empezar a rebotar.** Es el objetivo del cambio,
pero es un cambio de comportamiento visible para el local y para quien compra.
Conviene avisar antes de desplegarlo.

**El tope depende de que el stock esté bien cargado.** Un ingrediente vigilado
con stock en cero por olvido —no por falta real— apaga el producto. Ya pasa hoy
con `is_out_of_stock`, así que no es nuevo, pero ahora también limita cantidades.
