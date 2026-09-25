# Tasks

## 1. La base

- [x] 1.1 Migración: `registrar_compra_de_stock` acepta líneas con
      `tipo: 'producto'`, que actualizan `products` y registran el movimiento
      con `product_id`. Probada dentro de una transacción con `rollback` antes
      de darla por buena.
- [x] 1.2 Devuelve también los productos cuyo costo cambió, para recalcular los
      combos que los usan.

## 2. La acción

- [x] 2.1 `registerPurchase` acepta líneas de producto y recalcula los combos
      afectados.

## 3. La pantalla

- [x] 3.1 El buscador de la compra encuentra insumos y reventa, con una marca
      que dice cuál es cuál.

## 4. Verificación

- [x] 4.1 Test de navegador: una compra mixta, un insumo y una gaseosa sin
      costo. Suman stock los dos, quedan dos movimientos `purchase`, la
      gaseosa queda con costo, y un elaborado no aparece en el buscador.
- [x] 4.2 `npm run lint`, `npm run build` y la suite en verde.
- [ ] 4.3 `supabase db push` lo corre David.
