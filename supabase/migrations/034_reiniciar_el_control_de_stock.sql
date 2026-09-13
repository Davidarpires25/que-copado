-- 034_reiniciar_el_control_de_stock.sql
--
-- La zona de peligro ya tenia "borrar movimientos de stock", pero borraba el
-- historial sin tocar `current_stock`. Eso dejaba un estado peor que el
-- anterior: ingredientes con 5.251 kg de aceituna y ningun movimiento que
-- explique de donde salieron. El historial dejaba de reconstruir el stock, que
-- es la unica forma de auditar como se llego a un numero.
--
-- Esta funcion reinicia el control de stock entero y coherente, para cuando lo
-- cargado fueron pruebas o datos mal ingresados:
--
--   * borra los movimientos,
--   * pone `current_stock` en 0,
--   * APAGA `stock_tracking_enabled`.
--
-- Lo ultimo no es un detalle: con el control encendido y todo en 0, la
-- sincronizacion de disponibilidad —que se dispara sola en la proxima venta o
-- ajuste— marcaria como agotado todo lo que dependa de esos ingredientes, y el
-- catalogo publico quedaria vacio. Apagando el control se vuelve al estado
-- previo a activar stock, y se reactiva a medida que se carga inventario real.
--
-- Se conservan `min_stock` y `cost_per_unit`: son configuracion, no datos de
-- prueba. Y se limpian solo los `is_out_of_stock` que habia puesto el sistema
-- (`auto_disabled`), nunca los que marco una persona a mano.

BEGIN;

create or replace function public.reiniciar_control_de_stock()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_movimientos  int;
  v_ingredientes int;
  v_productos    int;
  v_reactivados  int;
begin
  select count(*) into v_movimientos from stock_movements;
  delete from stock_movements where id is not null;

  update ingredients
     set current_stock = 0,
         stock_tracking_enabled = false,
         updated_at = now()
   where current_stock <> 0 or stock_tracking_enabled;
  get diagnostics v_ingredientes = row_count;

  -- Solo lo que el sistema habia agotado solo. Si alguien marco un producto
  -- como agotado a mano, esa decision se respeta.
  update products
     set is_out_of_stock = false,
         auto_disabled = false
   where auto_disabled;
  get diagnostics v_reactivados = row_count;

  update products
     set current_stock = 0,
         stock_tracking_enabled = false
   where current_stock <> 0 or stock_tracking_enabled;
  get diagnostics v_productos = row_count;

  return jsonb_build_object(
    'movimientos_borrados', v_movimientos,
    'ingredientes_reiniciados', v_ingredientes,
    'productos_reiniciados', v_productos,
    'productos_reactivados', v_reactivados
  );
end;
$$;

COMMIT;
