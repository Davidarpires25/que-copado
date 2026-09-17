# Design

## Context

Ver `proposal.md` — Why. Lo que condiciona el diseño es lo que ya existe:

- **`product_types` es una tabla**, no un enum: `type_key`, `label`,
  `sends_to_kitchen`, `uses_recipes`. Agregar un tipo es una fila y manejarlo en
  el código.
- **El descuento ya ramifica por tipo** en `lib/server/stock-deduction.ts`:
  `reventa` descuenta la unidad del producto, `elaborado` camina
  `product_recipes → recipes → recipe_ingredients → ingredients` con sus
  sub-recetas y mermas.
- **Ya hay un producto compuesto**: el tipo `mitad` con `product_half_configs`,
  que resuelve una pizza armada con dos mitades elegidas de una categoría, y
  guarda lo elegido en `order_items.metadata`.
- Los movimientos de stock se aplican en una transacción
  (`aplicar_movimientos_de_stock`, migración 033) a partir de una lista de
  `{product_id, quantity}`.

## Goals / Non-Goals

**Goals**

- Que un combo descuente del mismo stock que sus partes vendidas sueltas.
- Que el costo del combo sea real.
- No tocar el camino de venta: un combo se vende como cualquier producto.

**Non-Goals**

- Combos con opciones al vender (ver proposal — Fuera de alcance).
- Cambiar cómo se descuentan reventa y elaborado. Se reusan tal cual.

## Decisions

### Una tabla de componentes producto→producto

`product_components`: producto padre, producto hijo, cantidad. Es la relación que
falta —hoy un producto se liga a recetas, no a otros productos—, y es lo que
permite que la coca del combo sea **la misma fila** que la coca suelta.

**Alternativa considerada:** seguir usando recetas, agregando a `recipes` la
posibilidad de incluir productos además de ingredientes. Se descarta porque
mezcla dos cosas distintas: una receta dice cómo se prepara algo, un combo dice
qué se entrega junto. Y porque arrastraría el problema actual: la receta es de
ingredientes, y meter productos ahí es lo que llevó a cargar bebidas como
insumos.

**Alternativa considerada:** una columna JSON con los componentes en `products`.
Más rápido de escribir y peor de consultar: no hay forma de preguntar "qué combos
usan esta bebida" cuando cambia su costo, que es justo lo que hace falta para
recalcular.

### El combo se expande al descontar, no al vender

La venta guarda el combo como lo que es: un `order_item` con el producto combo y
su precio. La expansión a componentes ocurre en el descuento de stock y en la
generación de comandas, que es donde importa.

**Por qué no expandir al vender** —guardar varias líneas y repartir el precio—:
el pedido dejaría de decir que se vendió una promo, el ticket habría que volver a
juntarlo, y anular se complicaría. Además el reporte de ventas por producto
mostraría hamburguesas que nadie pidió sueltas.

**Consecuencia:** el descuento de stock necesita resolver el combo antes de armar
la lista de movimientos. Como la lista ya es `{product_id, quantity}`, alcanza con
expandir el combo a sus componentes antes de esa lista, y el resto del camino
—incluida la transacción— no se entera.

### La comanda se arma sobre componentes que van a cocina

`sendToKitchen` hoy agrupa `order_items` por la estación de su producto y omite
los que no llevan estación o son reventa. Un combo no tiene estación propia: sus
componentes sí.

Al generar comandas, un `order_item` de tipo combo se reemplaza por sus
componentes, y cada uno sigue la regla que ya existe. La comanda indica a qué
combo pertenece el ítem, para que se despachen juntos.

**Riesgo:** si la comanda solo dijera "Hamburguesa simple" sin mencionar el
combo, cocina prepara bien pero despacho no sabe que va con una bebida. Por eso
la pertenencia al combo viaja en el ítem de la comanda.

### El costo se recalcula como ya se recalcula

Existe `recalculateProductsForIngredient`, que corre cuando una compra cambia el
costo de un ingrediente. El combo suma el costo de sus componentes, así que hay
que extender ese camino para que además alcance a los combos que contengan un
producto afectado.

### Los combos actuales se migran, los ingredientes falsos se jubilan

Los tres combos pasan a tipo `combo` con sus componentes. Las bebidas cargadas
como ingrediente —`coca-coca 375`, `coca cola descartable 1.5lts`, y los
duplicados `fanta 500ml` y `sprite 500ml`— se desactivan, no se borran: tienen
movimientos de stock detrás y ese historial es el que explica el consumo pasado.

**Lo que hay que resolver al migrar y no se puede decidir de antemano:** a qué
producto de reventa corresponde cada bebida-ingrediente. `coca-coca 375` tiene que
apuntar a la Coca de 375 del catálogo, y eso lo confirma quien conoce el negocio.
La migración deja el mapeo escrito y se revisa antes de aplicar.

## Risks / Trade-offs

**El stock de las bebidas va a moverse distinto desde el día uno** → Es el punto:
hasta ahora el combo no tocaba el stock real de la bebida. Al migrar, ese stock
empieza a bajar de verdad, y probablemente muestre menos botellas de las que el
sistema decía. Conviene hacer un conteo físico al aplicar el cambio, no después.

**Un combo puede quedar sin poder venderse si un componente se agota** → Es
correcto que así sea, pero hay que decidir qué ve el cajero. Se resuelve con la
regla que ya existe para elaborados: el producto se marca sin stock. Anotado como
pregunta abierta.

**El agente de WhatsApp ve un producto nuevo** → Va a listarlo como cualquier otro
con su precio, que es lo correcto. Conviene avisar a ese repo por si ramifica por
`product_type` en algún lado.

## Open Questions

- **Qué pasa cuando un componente se agota**: ¿el combo se marca sin stock
  automáticamente, como ya ocurre con los elaborados, o se deja vender? Se puede
  responder al implementar sin cambiar el modelo ni las tareas: es una regla sobre
  la disponibilidad, no sobre la estructura.
