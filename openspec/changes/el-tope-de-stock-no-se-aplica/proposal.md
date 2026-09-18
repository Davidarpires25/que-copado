# Proposal

## Why

El sistema sabe cuántas hamburguesas puede hacer. No lo usa para frenar un
pedido.

`createAdminClient()` **usa la clave anon** —lo dice su propio comentario en
`lib/supabase/admin.ts`— y la tabla `ingredients` solo tiene policy de lectura
para `authenticated`. Entonces, cuando `getMaxElaboradoQuantity()` recorre las
recetas con ese cliente, PostgREST le devuelve la fila del ingrediente en
`null`, la función saltea cada ingrediente y termina devolviendo `null`, que en
este código significa **"sin tope"**.

Verificado contra la base local:

```
GET /api/agent/menu        -> Hamburguesa simple: available=true, sin max_quantity
anon GET /rest/v1/ingredients -> []
anon GET product_recipes(...ingredients(...)) -> "ingredients": null
```

Alcanza a tres caminos, los tres de cara al cliente:

| dónde | qué deja pasar |
|---|---|
| `app/api/agent/menu/route.ts` | el agente de WhatsApp nunca recibe `max_quantity` de un elaborado |
| `app/actions/orders.ts` — `validateCartStock` | el carrito no avisa "solo quedan N" |
| `app/actions/orders.ts` — guard de `createOrder` | el pedido entra igual |

**Lo que sí funciona** es `is_out_of_stock`: el barrido lo mantiene al día desde
los caminos autenticados —caja, mesas, pantallas de stock—, así que un producto
agotado del todo no se ofrece. Lo que no se aplica es el **techo de cantidad**:
con stock para 3 hamburguesas, la web y el agente aceptan un pedido de 50.

Es anterior a los combos. Apareció al revisar por qué un combo salía sin tope.

## What Changes

- **Que la cuenta del tope pueda leer el stock de ingredientes** en los tres
  caminos, sin abrir `ingredients` a `anon`.
- **Sin cambiar la cuenta**: `getMaxElaboradoQuantity` y `getMaxComboQuantity`
  quedan como están. Lo que cambia es con qué permisos corren.

## Capabilities

### Modified Capabilities

`seguimiento-de-stock` — hoy la spec dice que el sistema calcula cuántas
unidades se pueden producir. Falta el requisito de que ese tope se **aplique**
al vender, y por qué caminos.

## Impact

**Repos:** `que-copado`. `AgentePOS` no cambia: ya lee `max_quantity` del
contrato, solo que hoy nunca viene para un elaborado.

**A decidir en el diseño** —son dos caminos y no da lo mismo—:

1. **Una función `security definer`** que devuelva el tope. El stock de
   insumos no se expone; `anon` pregunta "cuántas salen" y recibe un número.
2. **Usar `createServiceRoleClient()`** en esos tres caminos. Más corto de
   escribir, pero le da service role a un endpoint público, que es justo lo que
   `createAdminClient` evitó a propósito.

La primera es la que respeta la decisión que ya está tomada en el código. La
segunda hay que mirarla con cuidado.

**Riesgo de aplicarlo:** pedidos que hoy entran van a empezar a rebotar. Es el
objetivo, pero conviene avisarle al local antes.

## Fuera de alcance

- **Renombrar `createAdminClient`**, que usa la clave anon y se llama "admin".
  Confunde y ya costó este bug, pero tocarlo son 30 archivos y es otra cosa.
- **Revisar el resto de las policies.** Acá solo se resuelve el tope de stock.
