# Tasks

> Todo en `que-copado`. No toca `AgentePOS`.
>
> Este cambio escribe en `stock_movements` e `ingredients` al probarlo. La base
> de producción está en uso y no hay base de prueba todavía, así que la 5.2 se
> verifica con la próxima compra real: no se cargan compras inventadas.

## 1. La página

- [x] 1.1 Crear `components/admin/stock/purchase-form-page.tsx` con la carga
      fuera del `Dialog`: buscador con el catálogo a la izquierda, la compra en
      curso a la derecha, la nota en el mismo panel que las líneas, y la llamada
      a `registerPurchase()` igual que antes. Verificación: `npx tsc --noEmit`
      pasa y el componente no importa nada de `@/components/ui/dialog`.
- [x] 1.2 Crear `app/admin/stock/compras/nueva/page.tsx` como server component:
      verifica sesión con `getAuthUser` y redirige a `/admin/login` si no hay,
      trae los ingredientes y monta el formulario dentro de `AdminLayout`.
      Verificación: `npm run build` lista la ruta `/admin/stock/compras/nueva`.
- [ ] 1.3 Al confirmar, volver a `/admin/stock` con los datos frescos; al
      cancelar, volver sin registrar nada. Verificación: recorrer los dos
      caminos en el navegador y ver que la tabla de stock refleje lo cargado.
      **Implementado; falta la pasada en navegador.**

## 2. Buscar y agregar

- [x] 2.0 El buscador filtra por nombre sin distinguir acentos ni mayúsculas,
      Enter agrega la primera coincidencia, y elegir uno ya agregado no duplica
      la línea sino que resalta la existente y le lleva el foco a su cantidad.
      Verificación: en el navegador, buscar "pure" encuentra "Puré", Enter lo
      agrega, y volver a elegirlo resalta la línea en vez de sumar otra.

## 3. El estado vacío

- [ ] 3.1 Cuando no hay ningún ingrediente, la página muestra el aviso y el
      enlace a `/admin/ingredients/new` en vez del formulario. Verificación:
      entrar a la ruta con la lista de ingredientes vacía —basta con pasarle
      una lista vacía al componente— y ver el aviso, no un selector sin
      opciones.

## 4. Sacar el diálogo

- [x] 4.1 En `stock-dashboard.tsx`, reemplazar los **dos** botones "Registrar
      Compra" —uno vive en la fila de búsqueda de la pestaña Ingredientes y el
      otro en el resto de las pestañas— por navegación a la ruta nueva,
      y eliminar el estado `purchaseOpen` y el render de `<PurchaseDialog>`.
      Verificación: `grep -rn "PurchaseDialog\|purchaseOpen" components app`
      no devuelve nada.
- [x] 4.2 Eliminar `components/admin/stock/purchase-dialog.tsx`. Verificación:
      `npm run build` pasa; si algo más lo importaba, falla acá.

## 5. Verificación

- [x] 5.1 `npm run lint` y `npm run build` sin errores nuevos —la única
      advertencia esperada es la preexistente de `SupabaseClient` en
      `app/actions/orders.ts`.
- [ ] 5.2 Registrar una compra de prueba de dos líneas y comprobar contra la
      base que el stock subió y que quedaron dos `stock_movements` de tipo
      `purchase` con `previous_stock` y `new_stock` correctos. Hacerlo sobre un
      ingrediente de prueba creado para esto, o revertir después dejando
      constancia: `stock_movements` es el historial con el que se explica el
      consumo y no se ensucia con pruebas.
- [x] 5.3 Comprobar que la ruta está protegida: pedirla sin sesión redirige a
      `/admin/login`.
- [ ] 5.4 Recorrer los escenarios de la spec que no cubren las tareas de
      arriba: con la compra vacía no se puede confirmar, una cantidad en cero
      deja el botón apagado, quitar una línea devuelve el ingrediente al
      buscador, y la unidad mostrada es la del ingrediente.
