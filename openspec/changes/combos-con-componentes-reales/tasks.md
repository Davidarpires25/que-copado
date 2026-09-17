# Tasks

> Todo en `que-copado`. `AgentePOS` solo recibe un aviso (tarea 6.2).
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
- [ ] 2.4 Un combo sin componentes no se puede vender. Verificación: crear uno
      vacío e intentar cobrarlo.

## 3. Cocina y ticket

- [x] 3.1 `sendToKitchen` arma la comanda desde los componentes del combo, cada
      uno a su estación, omitiendo los que no van a cocina. Verificación: en
      local, enviar un combo y ver la hamburguesa en la comanda de cocina y la
      bebida ausente.
- [ ] 3.2 El ítem de comanda indica a qué combo pertenece, para despacharlo
      junto. Verificación: mirar la comanda impresa y la pantalla de cocina.
- [ ] 3.3 El ticket de venta muestra el combo como una sola línea con su precio,
      sin componentes. Verificación: imprimir —o previsualizar— el ticket de un
      pedido con combo.

## 4. Configurar y costear

- [x] 4.1 En el alta y edición de producto, cuando el tipo es `combo`, se cargan
      componentes en vez de recetas: buscar un producto, agregarlo con su
      cantidad, quitarlo. **Verificado en navegador:** se creó "COMBO DESDE LA
      PANTALLA" eligiendo el tipo Combo, buscando y agregando Hamburguesa simple
      y Gaseosa 500ml, y quedó guardado con sus dos componentes.
- [ ] 4.2 Un combo no ofrece stock propio ni mínimo. Verificación: en la pantalla
      de stock, el combo no aparece como seguible.
- [x] 4.3 El costo del combo se calcula sumando sus componentes y se muestra al
      configurarlo. Verificación: comparar contra la suma hecha a mano.
- [ ] 4.4 Extender el recálculo de costos para que una compra que cambia el costo
      de un componente actualice también los combos que lo contienen.
      Verificación: registrar una compra que cambie el costo de la bebida y ver
      el costo del combo actualizado.

## 5. Migrar lo que ya existe (producción, al final)

- [ ] 5.1 Escribir el mapeo de cada bebida-ingrediente al producto de reventa que
      le corresponde, y **revisarlo con David antes de aplicar**: `coca-coca 375`,
      `coca cola descartable 1.5lts`, `fanta 500ml`, `sprite 500ml`.
      Verificación: el mapeo aprobado, por escrito, en la migración.
- [ ] 5.2 Migración que convierte los tres combos actuales a tipo `combo` con sus
      componentes, y desactiva las bebidas-ingrediente sin borrarlas ni tocar sus
      movimientos. Verificación: aplicada primero en local sobre una copia del
      caso real; los tres combos quedan con componentes y el historial intacto.
- [ ] 5.3 Conteo físico de bebidas antes de aplicar en producción, y ajuste del
      stock real. **El stock de las bebidas empieza a bajar de verdad desde este
      momento**, y lo que el sistema decía hasta ahora no era cierto.
      Verificación: el stock del sistema coincide con lo contado.

## 6. Cerrar

- [ ] 6.1 `npm run lint` y `npm run build` sin errores nuevos.
- [ ] 6.2 Avisar en `AgentePOS` que existe un `product_type` nuevo, por si alguna
      rama del agente depende del tipo. Verificación: el aviso hecho y respondido.
