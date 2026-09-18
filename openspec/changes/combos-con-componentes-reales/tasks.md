# Tasks

> Todo en `que-copado`.
>
> **Revisado a mitad de camino:** el primer modelo hacía que un combo fuera solo
> componentes. Los combos reales consumen envases y preparaciones propias que no
> son productos del catálogo, así que el combo pasa a tener también sus recetas.
> Las tareas 2.0, 3.4, 4.4 y 4.5 son las que agrega esa corrección. `AgentePOS` solo recibe un aviso (tarea 6.2).
>
> Se verifica contra la base local (`npm run db:start`). **La migración de datos
> de la sección 5 toca producción y va última**, después de que todo lo demás
> esté probado y con un conteo físico de bebidas hecho.

## 1. El modelo

- [x] 1.1 Migración: tabla `product_components` (padre, hijo, cantidad) con sus
      claves foráneas, la restricción de que un padre no sea su propio hijo, y
      RLS igual que el resto del catálogo —lectura pública, escritura de admin—.
      Verificación: aplicada en local, y `openspec`/`psql` muestran la tabla con
      sus policies.
- [x] 1.2 Migración: fila `combo` en `product_types`, con `sends_to_kitchen` y
      `uses_recipes` en el valor que corresponda —un combo no tiene receta propia
      y no va directo a cocina: van sus componentes—. Verificación: el tipo
      aparece en el selector de tipo al crear un producto.
- [x] 1.3 Tipos de TypeScript y el helper que dice si un producto es combo.
      Verificación: `npx tsc --noEmit` pasa.

## 2. Vender un combo descuenta lo correcto

- [x] 2.0 El descuento de un combo suma **sus recetas propias y sus
      componentes**, no una cosa o la otra. Verificación: un combo con receta
      propia —con un envase adentro— y un componente de reventa descuenta el
      envase y la bebida en la misma venta. **Verificado:** un combo con receta
      propia (Caja de combo) más componentes (hamburguesa + gaseosa) descontó las
      tres cosas: caja 100→99, medallón 40→39, gaseosa 24→23.

- [x] 2.1 En `lib/server/stock-deduction.ts`, expandir los combos a sus
      componentes antes de armar la lista de movimientos, reusando las ramas de
      reventa y elaborado. Verificación: en local, vender un combo de
      hamburguesa + bebida descuenta los ingredientes de la receta **y** una
      unidad de la bebida, con sus movimientos. **Verificado:** 3 combos →
      medallón 40→37, pan 40→37, cheddar 3→2,8737 (con merma) y **Gaseosa
      500ml 24→21, el mismo stock que si se vendiera sola**.
- [x] 2.2 La cantidad se multiplica: tres combos descuentan tres veces cada
      componente. Verificación: vender 3 y comprobar las cantidades en
      `stock_movements`.
- [x] 2.3 Cancelar un pedido con combos devuelve todo lo descontado.
      **Verificado** llamando a `revertir_movimientos_de_stock` en una
      transacción revertida: 4 movimientos revertidos y todo vuelve a 40/40/3/24.
      La reversa trabaja sobre los movimientos escritos, así que no necesita
      saber de combos.
- [x] 2.4 Un combo sin recetas ni componentes no se puede vender. **Verificado:** un combo
      sin componentes queda marcado agotado por el barrido de disponibilidad
      (`agotado=true auto=true`), y el formulario no deja guardarlo vacío.

## 3. Cocina y ticket

- [x] 3.4 Un combo con receta propia y estación aparece en la comanda de esa
      estación con su propio nombre, además de sus componentes. **Verificado:**
      `[cocina] COMBO MIXTO` y `[cocina] Hamburguesa simple · COMBO MIXTO`.
- [x] 3.1 `sendToKitchen` arma la comanda desde los componentes del combo, cada
      uno a su estación, omitiendo los que no van a cocina. Verificación: en
      local, enviar un combo y ver la hamburguesa en la comanda de cocina y la
      bebida ausente.
- [x] 3.2 El ítem de comanda indica a qué combo pertenece, para despacharlo
      junto. Verificación: mirar la comanda impresa y la pantalla de cocina.
- [x] 3.3 El ticket de venta muestra el combo como una sola línea con su precio,
      sin componentes. Verificación: imprimir —o previsualizar— el ticket de un
      pedido con combo. **Verificado:** el pedido guarda una sola línea,
      `COMBO PRUEBA x1 $10.000`.

## 4. Configurar y costear

- [x] 4.5 En el alta y edición de un combo conviven las dos secciones: las
      recetas propias —lo que se prepara y el envase— y los componentes. Ninguna
      obligatoria por separado; una de las dos, sí. Verificación: armar en local
      un combo con receta y componente, y ver los dos guardados. **Hecho:** el
      formulario de un combo muestra las dos secciones y guarda las dos; alcanza
      con una de ellas para poder guardar.
- [x] 4.1 En el alta y edición de producto, cuando el tipo es `combo`, se cargan
      componentes en vez de recetas: buscar un producto, agregarlo con su
      cantidad, quitarlo. **Verificado en navegador:** se creó "COMBO DESDE LA
      PANTALLA" eligiendo el tipo Combo, buscando y agregando Hamburguesa simple
      y Gaseosa 500ml, y quedó guardado con sus dos componentes.
- [x] 4.2 Un combo no ofrece stock propio ni mínimo. **Se cumple por
      construcción:** la pestaña de stock trae solo productos de tipo `reventa`,
      así que un combo nunca aparece ahí.
- [x] 4.3 El costo del combo se calcula sumando sus componentes y se muestra al
      configurarlo. Verificación: comparar contra la suma hecha a mano.
- [x] 4.4 Extender el recálculo de costos para que una compra que cambia el costo
      de un componente actualice también los combos que lo contienen.
      Verificación: registrar una compra que cambie el costo de la bebida y ver
      el costo del combo actualizado. **Verificado para componentes:** compra con
      costo 2400 del medallón → hamburguesa 2000→3228,95 → combo 5028,95, solo.
      **Hecho:** el costo suma ahora los ingredientes de las recetas propias más
      el costo de los componentes.

## 5. Migrar lo que ya existe — **cancelada**

David, 2026-09-18: *"no le des importancia a esos combos, ya que hay nuevos y
sacaremos los viejos"*. Los tres combos actuales se dan de baja y los nuevos se
cargan con el tipo `combo` desde la pantalla. No hay datos que migrar.

Queda escrito lo que se averiguo, porque vale para cuando se carguen los nuevos:

- Solo **dos** ingredientes-bebida estaban realmente en una receta:
  `coca-coca 375` (x2 en COMBO PATTY Y GASEOSA) y `coca cola descartable 1.5lts`
  (x1 en COMBO PLAZA). `fanta 500ml` y `sprite 500ml` como ingredientes no los
  usaba ninguna receta: son filas muertas.
- El tercer combo, PROMO DE BURGUER CON PAPAS, no lleva bebida.
- **De 19 productos en BEBIDAS, solo 3 tienen costo cargado.** Un combo cuyo
  componente no tiene costo se va a costear de menos. Cuando se carguen los
  combos nuevos hay que cargar el costo de las bebidas que usen.
- **El stock de una bebida que hoy sale en un combo esta alto**, no bajo: solo
  bajaba al venderla suelta. Conviene contarlas al cargar el combo nuevo.

- [-] 5.1 Mapeo de bebida-ingrediente a producto de reventa. **No aplica**: los
      combos viejos se dan de baja.
- [-] 5.2 Migracion de los tres combos. **No aplica**, por lo mismo.
- [-] 5.3 Conteo fisico previo. **No aplica** como paso de migracion; queda como
      la nota de arriba para cuando se carguen los combos nuevos.

## 6. Cerrar

- [x] 6.1 `npm run lint` y `npm run build` sin errores nuevos.
- [x] 6.2 Avisar en `AgentePOS` que existe un `product_type` nuevo. **Revisado:
      ninguna rama de `AgentePOS` depende del tipo de producto** —el contrato le
      pasa `available` y `max_quantity`, no el tipo—, asi que no habia nada que
      avisar. Pero revisarlo destapo el hueco de la tarea 6.3.

- [x] 6.3 **El combo se ofrecia sin tope.** Tres lugares calculaban "cuantas
      unidades se pueden vender" preguntando por el literal `'elaborado'`: el
      menu del agente, `validateCartStock` y el guard de `createOrder`. Un combo
      no entraba en ninguno, asi que salia sin techo: el agente lo podia ofrecer
      sin limite y el checkout aceptaba diez con stock para tres.
      `getMaxComboQuantity()` calcula el tope de un combo —sus recetas propias y
      sus componentes, dividiendo por la cantidad— y `getMaxQuantities()` es
      ahora el unico lugar donde se arma ese Map, para los tres.
      **Verificado en local** con un combo hibrido (1 caja propia, 1 hamburguesa,
      2 gaseosas) sobre stock de 5 cajas / 40 hamburguesas / 24 gaseosas:
      tope = 5, que es la caja. Antes: sin tope.

- [x] 6.4 **El barrido no miraba las recetas propias del combo.**
      `syncCombosAvailability` solo preguntaba por los componentes, asi que un
      combo al que se le acabaron las cajas seguia ofreciendose. Ahora mira las
      dos partes, como el descuento (tarea 2.0).

## Lo que quedo abierto

**El tope de un elaborado tampoco se aplica hoy, y eso es anterior a este
cambio.** `createAdminClient()` usa la clave **anon** —lo dice su propio
comentario— y `ingredients` solo tiene policy de lectura para `authenticated`.
El resultado es que `ingredients` vuelve `null` y la cuenta termina en "sin
tope", siempre. Verificado contra la base local: el endpoint del agente no
emite `max_quantity` para ninguna hamburguesa.

Alcanza a tres caminos: el menu del agente, `validateCartStock` y el guard de
`createOrder`. Lo que si protege es `is_out_of_stock`, que el barrido mantiene
al dia desde los caminos autenticados; lo que no se aplica es el **techo de
cantidad**.

Por eso el tope del combo hoy se calcula solo por sus componentes —que son
productos, y esos anon si los lee—. La mitad de recetas del combo queda ciega
igual que la de un elaborado. Se anota como cambio aparte: es un problema de
RLS y de que cliente usa cada camino, mas grande que los combos.
