# Proposal

## Why

David: *"me gustaría añadir la opción de registro de compra de productos en
reventa, hoy solo se registran insumos"*.

La pantalla de compras solo busca insumos. Pero lo que entra por la puerta del
local también son gaseosas, cervezas y aguas, que se venden tal cual: productos
de reventa. Hoy su stock se carga con el ajuste manual —que deja un movimiento
de tipo `adjustment` y no `purchase`— o no se carga.

## Qué se rompe hoy en el local

Medido contra producción:

| | |
|---|---|
| Productos de reventa activos | 23 |
| Con seguimiento de stock | 18 |
| **Sin costo cargado** | **16** |
| Usados como componente de un combo | 2 |

- **El costo de la reventa no tiene por dónde entrar.** 16 de 23 no tienen
  costo, y son justo los renglones en blanco del reporte de costos. Un insumo
  recibe su costo al registrar la compra; una bebida no tiene cómo.
- **El historial miente sobre lo que pasó.** Una compra de 24 Coca-Colas cargada
  como ajuste se lee, meses después, como una corrección de inventario. Lo que
  permitió reconstruir faltantes en este sistema fue que cada movimiento dijera
  qué fue.

## What Changes

- **El buscador de la compra encuentra también productos de reventa**, marcados
  como tales para no confundirlos con un insumo del mismo nombre.
- **Una compra puede mezclar insumos y reventa.** Una compra es una factura, y
  el mismo distribuidor trae las gaseosas y los vasos.
- **Comprar reventa suma su stock, actualiza su costo si vino, y deja un
  movimiento `purchase`**, en la misma transacción que el resto: la compra
  sigue entrando entera o no entrando.
- **Si cambia el costo de una reventa, se recalculan los combos que la usan.**
  Es lo mismo que ya pasa con un insumo y las recetas.
- **Los elaborados y los combos no se compran**: se producen. No aparecen.

## Lo que se decidió con David

**Comprar reventa sin seguimiento lo activa.** De los 23, 5 no tienen
seguimiento. Si se compran 24 unidades es porque se quiere saber cuántas
quedan; es lo mismo que ya pasa con un insumo cuando entra a una receta. La
contrapartida queda dicha: desde ahí, al llegar a cero, el producto se oculta
solo del menú.

**Una compra puede mezclar insumos y reventa.** Una compra es una factura.

## Capabilities

### Modified Capabilities

`registro-de-compras` — hoy dice "los ingredientes se agregan buscándolos por
nombre" y que una compra suma stock de insumos. Pasa a incluir reventa.

## Impact

**Repos:** solo `que-copado`. No toca AgentePOS.

**Migración:** `registrar_compra_de_stock` pasa a aceptar líneas de producto
(`tipo: 'producto'`) además de insumo. Sigue siendo una sola transacción.
`stock_movements` ya admite `product_id` —el CHECK exige insumo **o**
producto—, así que no hay cambio de esquema.

**Se prueba sin ensuciar datos reales**: stack local, con productos sembrados
que el test se lleva al terminar.

## Fuera de alcance

- **Comprar por bulto.** Un pack de 6 cargado como 1 es el mismo error de
  "costo del paquete como costo por unidad" que ya costó caro. Por ahora la
  compra es por unidad, y el total de la línea en pantalla es lo que lo delata.
  Bultos con su equivalencia es otro cambio.
- **Proveedores.** Quién vendió qué no se registra hoy tampoco para insumos.
