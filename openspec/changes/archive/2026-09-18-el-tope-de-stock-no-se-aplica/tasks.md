# Tasks

> Todo en `que-copado`. Se verifica contra la base local, que tiene una
> hamburguesa con recetas y un combo híbrido cargados para esto.

## 1. Que la cuenta pueda leer el stock

- [x] 1.1 En `lib/server/elaborado-stock.ts`, que la lectura de recetas e
      ingredientes use un cliente de service role propio, con el cliente
      recibido como respaldo. **Verificado:** el menú del agente pasa a traer
      `Hamburguesa simple: 40` y `Papas fritas: 68`, donde antes no traía
      `max_quantity` en absoluto.
- [x] 1.2 Sin `SUPABASE_SERVICE_ROLE_KEY` no explota: usa el cliente recibido y
      avisa. **Verificado** levantando el servidor con la variable vacía: el
      menú responde 200 y vuelve a "sin tope", que es el comportamiento de hoy.
      El aviso sale por `devError`, así que en producción va a Sentry y no a la
      consola.

## 2. Los tres caminos

- [x] 2.1 El menú del agente emite `max_quantity` para elaborados y combos.
      **Verificado:** hamburguesa 40, papas 68, combo híbrido 5.
- [x] 2.2 El carrito avisa cuántas quedan. **Verificado** por
      `POST /api/agent/orders`, que es quien llama a `validateCartStock`: pedir
      50 hamburguesas con stock para 40 devuelve `insufficient_stock` con
      `requested: 50, available: 40`. Un combo de 6 con stock para 5 devuelve
      `available: 5` —el tope lo pone la caja del combo, no la bebida—.
- [x] 2.3 La confirmación del pedido no deja pasar de más. **Verificado:** los
      dos pedidos de arriba no se crean, y el de 5 combos —justo lo que hay— sí
      se crea, con su número de pedido.

## 3. Que el insumo no se exponga

- [x] 3.1 La policy de `ingredients` no se toca y `anon` sigue sin poder leerla.
      **Verificado:** `curl` con la clave anon a `/rest/v1/ingredients` sigue
      devolviendo `[]`.
- [x] 3.2 Ninguna respuesta lleva stock de ingredientes. **Verificado** mirando
      los dos payloads: el menú lleva `available` y `max_quantity`, y el error
      de stock lleva `requested` y `available`. Cuántas unidades salen, nunca
      cuánto queda de cada insumo.

## 4. Cerrar

- [x] 4.1 `npm run lint` y `npm run build` sin errores nuevos.
- [ ] 4.2 **Avisar al local antes de desplegar:** desde este cambio, un pedido
      que pide más de lo que hay se rechaza. Es el objetivo, pero es un cambio
      de comportamiento visible en la web y en WhatsApp. Queda para David.

## Lo que salió distinto

**El diseño no tomó ninguna de las dos opciones de la propuesta.** La propuesta
planteaba una función `security definer` o el cliente de service role en los
tres caminos. Se hizo una tercera: el cliente elevado se pide **adentro del
helper** y no sale de ahí.

Contra la `security definer`: obligaba a escribir la cuenta por segunda vez en
SQL —conversión de unidades, mermas, sub-recetas—, y este proyecto ya pagó dos
veces el precio de tener la misma cuenta escrita dos veces.

Contra pasar el cliente desde cada camino: los tres tendrían que acordarse, y el
próximo camino que se agregue se olvida. Ese olvido es justo lo que originó este
cambio.

**El tope de un combo ya no depende de qué cliente lo pregunte.** Antes, con
anon, un combo daba 12 —solo lo limitaba la bebida, porque los productos sí se
leen— y su mitad de recetas quedaba ciega. Ahora da 5, que es la caja.

## 5. El interruptor

Agregado después de medir: David preguntó si conviene rechazar el pedido, y los
datos le dieron la razón. Ver la tabla en `proposal.md` — Impact.

- [x] 5.1 Migración: `business_settings.aplicar_tope_de_stock`, en false por
      defecto. **Verificado:** aplicada en local, la columna nace apagada.
- [x] 5.2 `getMaxQuantities()` lo respeta, y es el único lugar que lo conoce.
      **Verificado** contra la base local, con el mismo pedido de 50
      hamburguesas sobre stock para 40:
      - apagado: el menú no trae `max_quantity` y el pedido **se crea**
      - prendido: el menú trae 40 y el pedido devuelve `insufficient_stock`
- [x] 5.3 Solapa Stock en Configuración para prenderlo y apagarlo, con el aviso
      de cuándo conviene. **Verificado en navegador:** arranca apagado, el texto
      cambia al prenderlo, y vuelve a apagarse.
