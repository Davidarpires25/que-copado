# Tasks

## 1. La marca

- [x] 1.1 Migración: `products.forzado_disponible`, en false por defecto.
      **Verificado:** aplicada en local, la columna nace apagada.

## 2. Las cuatro ramas

- [x] 2.1 `_aplicarDisponibilidad()` decide y escribe, y las ramas de reventa,
      combos y elaborados la llaman. La rama que apaga ahora respeta el forzado.
- [x] 2.2 Borrar la copia de `_syncReventaProduct` en `app/actions/stock.ts` y
      usar la de `stock-deduction.ts`. **Hecho:** era la misma función con el
      mismo nombre en dos archivos.

## 3. Las dos pantallas

- [x] 3.1 `toggleProductStock` (Productos) y `toggleElaboradoAvailability`
      (Stock) escriben las tres marcas juntas. Antes la de Productos escribía
      solo `is_out_of_stock`, y dejaba el producto en un estado que el barrido
      no produce.

## 4. Verificar reproduciendo el caso

- [x] 4.1 **Verificado en el navegador**, contra la base local, reproduciendo lo
      del 17/09 paso por paso:
      1. el medallón se ajusta a 0 → el barrido esconde la hamburguesa
         (`oculto=true auto=true`)
      2. se prende a mano desde **Productos** → queda visible y marcada como
         decisión de una persona (`oculto=false auto=false forzado=true`)
      3. pasa otro movimiento de stock → **sigue visible**. Acá era donde se
         volvía a apagar.
      4. vuelve a haber medallones → sigue visible y el forzado **se suelta
         solo** (`forzado=false`)

## 6. Que avise qué escondió y por qué

Agregado después: *"estaría bueno saber qué falta y por qué se apagó"*.

- [x] 6.1 El recorrido de recetas se partió en dos —`_requerimientos()` y el
      cálculo— para que el mismo paseo conteste las dos preguntas: cuántas
      unidades salen, y cuál es el insumo que lo impide. `insumosQueFaltan()`
      devuelve los que no alcanzan ni para una unidad.
- [x] 6.2 `getStockAlerts` suma una alerta `oculto` por cada producto que apagó
      el sistema, con lo que falta. Un combo también puede estar frenado por un
      componente agotado, que no es un insumo sino otro producto.
- [x] 6.3 La pantalla de Stock lo muestra arriba de todo, separado del contador:
      *"Dejamos de ofrecer 1 producto en la web y en WhatsApp — Hamburguesa
      simple — falta Medallón de carne"*, y aclara que en el mostrador se
      siguen vendiendo.
- [x] 6.4 Sacado el doble conteo: el contador rojo sumaba `elaboradosAgotados`
      —los elaborados con stock teórico en cero, que son exactamente los que el
      sistema escondió—, así que el mismo producto se contaba dos veces: decía 3
      y desglosaba 2. Ahora cuenta los ocultos, que además saben por qué.
      **Verificado:** el cartel dice "2 items: 1 ingrediente bajo · 1 sin
      ofrecer".
- [x] 6.5 **Verificado en el navegador:** con el medallón en 0, el aviso nombra
      el producto, dice qué falta y aclara lo del mostrador; al marcarlo
      disponible a mano, el aviso desaparece.

## 7. El detalle de insumos en la fila

David: *"pensaba en una opción en la tabla de alertas que abra una sección y
muestre la información de los ingredientes y lo que falta"*. Mejor que el cartel
de arriba: el dato va donde ya está mirando.

- [x] 7.1 `getInsumosDelProducto()` devuelve de qué depende un producto: qué
      pide de cada insumo, cuánto hay y para cuántas unidades alcanza. Se pide
      al desplegar una fila, no para toda la tabla.
- [x] 7.2 La fila de la tabla de alertas se despliega y muestra esa tabla, con
      el insumo que frena marcado. Si hay empate en el mínimo están todos:
      comprar solo uno no destraba el producto.
- [x] 7.3 Sacado el link del tooltip de "Auto-deshabilitado", que ofrecía "Ver
      ingredientes faltantes" y llevaba a la misma pantalla donde ya estabas.
- [x] 7.4 **Verificado en el navegador:** la fila se despliega, lista los
      insumos y marca cuál frena.

## 5. Cerrar

- [x] 5.1 `npm run lint` y `npm run build` sin errores nuevos.
- [ ] 5.2 **Corregir la receta de la salsa.** Queda para David: es dato de
      producción. Recomendado `0.33 unidad` por pizza, manteniendo el pote como
      unidad. Sin eso, las pizzas van a seguir desapareciendo cada tres ventas;
      este cambio solo permite volver a prenderlas.
