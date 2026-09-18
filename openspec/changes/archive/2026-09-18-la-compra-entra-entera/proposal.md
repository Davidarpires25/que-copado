# Proposal

## Why

`registerPurchase` recorría las líneas de la compra haciendo **tres viajes por
cada una** —leer el stock, actualizarlo, insertar el movimiento— y cada viaje
por separado. Una compra de diez insumos eran treinta idas y vueltas en serie.

Pero lo que más pesa no es la velocidad:

**No era atómica.** Si la línea 5 de 10 fallaba, las cuatro primeras ya estaban
aplicadas y la función devolvía error. Quedaba media compra cargada, sin forma
de saber cuál mitad.

**El movimiento se podía perder en silencio.** Si fallaba el insert del
movimiento, el stock ya había cambiado y el error solo se escribía en la consola
—y solo en desarrollo—. El stock quedaba alto y el historial no lo explicaba.

Ese segundo punto es el que más importa. Todo lo que se pudo diagnosticar hoy
—cuánto morrón se usó de verdad, que el descuento en gramos restaba mil veces
menos, que el stock decía 199,88 cuando eran 80— salió de leer el historial de
movimientos. **Un movimiento que falta es un número que después nadie
reconstruye.**

La venta ya se hacía bien: `aplicar_movimientos_de_stock` es una función de
plpgsql, o sea una transacción. La compra no.

## What Changes

- **`registrar_compra_de_stock()`**: la compra entera en una transacción. O
  entran todas las líneas con sus movimientos, o no entra ninguna.
- **Una sola llamada** en vez de tres por línea.
- **El recálculo de costos solo para los insumos cuyo costo cambió**, que es lo
  que la función devuelve.

## Capabilities

### Modified Capabilities

`registro-de-compras` — falta el requisito de que la compra sea una sola
operación y de que su historial no se pueda perder.

## Impact

**Repos:** solo `que-copado`. **Con migración**, así que hay que aplicarla antes
de desplegar.

**Permisos:** la función corre como quien la llama, así que las policies de
`ingredients` siguen decidiendo quién puede escribir. Se revoca de `anon` y se
otorga a `authenticated`.

## Y lo mismo en el descuento de la venta

Se hizo en el mismo cambio, porque es el mismo problema: `deductStockForOrder`
hacía una consulta por item para el producto, otra por sus recetas, y **dos por
cada insumo**. Un pedido de tres productos con las recetas reales —unos 9
insumos cada uno— son ~60 idas y vueltas en serie, esperadas antes de
contestarle a quien cobra.

Ahora son **6**, sea cual sea el tamaño del pedido: los productos, los
componentes de los combos, los productos de esos componentes, y las tres de la
carga de recetas que ya usaban el barrido y la pantalla de stock.

Al pasar a datos ya cargados quedaron sin uso `acumularProducto`,
`collectElaboradoStock` y `collectIngredientCascade`.

## Fuera de alcance

- **Que el cobro de mostrador no espere el descuento**, como ya hace el de mesa
  con `after()`. Es una decisión sobre cuándo se descuenta respecto de la
  respuesta, no un arreglo.
