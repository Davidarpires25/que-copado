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

### El tope se enciende desde Configuración, y arranca apagado

`business_settings.aplicar_tope_de_stock`, en false por defecto.

No es prudencia abstracta: medido contra los datos reales, 13 de 38 productos
quedaban con techo de 8 o menos y cinco con techo de 1 —tres pizzas limitadas
por "Salsa de tomate", que decía tener una unidad—. Desplegarlo encendido era
rechazar ventas buenas por datos viejos.

El interruptor se lee **adentro de `getMaxQuantities()`**, que ya era el único
lugar donde se arma el Map de topes. Apagado devuelve un Map vacío, que para
quien llama es idéntico a "sin tope". Los tres caminos lo respetan sin saber que
existe, y el próximo que se agregue también.

Se consulta en paralelo con los topes, no antes: encendido no cuesta un viaje
extra, y apagado se descartan unos números que ya estaban en vuelo. Si la
consulta falla se responde que no: que una lectura fallida corte la venta sería
peor que el problema que el tope resuelve.

**El control fino ya existía.** `stock_tracking_enabled` es por ingrediente: si a
un insumo nadie lo cuenta de verdad, apagarle el seguimiento lo saca del cálculo
sin tocar el interruptor global.

## Risks

**Encenderlo rechaza pedidos.** Es el objetivo, pero es un cambio visible en la
web y en WhatsApp. Por eso arranca apagado y la decisión de encenderlo es del
local, con el aviso escrito en la misma pantalla.

**El tope depende de que el stock esté bien cargado.** Un ingrediente vigilado
con stock viejo limita el producto por un número que no es cierto. Ya pasa hoy
con `is_out_of_stock`, pero el techo de cantidad es mucho más filoso que el corte
en cero: `is_out_of_stock` solo actúa cuando llega a cero.
