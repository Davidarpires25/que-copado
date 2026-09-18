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

## 5. Cerrar

- [x] 5.1 `npm run lint` y `npm run build` sin errores nuevos.
- [ ] 5.2 **Corregir la receta de la salsa.** Queda para David: es dato de
      producción. Recomendado `0.33 unidad` por pizza, manteniendo el pote como
      unidad. Sin eso, las pizzas van a seguir desapareciendo cada tres ventas;
      este cambio solo permite volver a prenderlas.
