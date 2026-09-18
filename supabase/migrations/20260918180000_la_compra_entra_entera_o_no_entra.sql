-- Registrar una compra es una sola operacion, no una por linea.
--
-- Hasta aca `registerPurchase` recorria las lineas haciendo tres viajes por
-- cada una --leer el stock, actualizarlo, insertar el movimiento-- y cada viaje
-- por separado. Una compra de diez insumos eran treinta idas y vueltas en
-- serie.
--
-- Pero lo que mas pesa no es la velocidad:
--
-- 1. **No era atomica.** Si la linea 5 de 10 fallaba, las cuatro primeras ya
--    estaban aplicadas y la funcion devolvia error. Quedaba media compra
--    cargada, sin forma de saber cual mitad.
--
-- 2. **El movimiento se podia perder en silencio.** Si fallaba el insert del
--    movimiento, el stock ya habia cambiado y el error solo se escribia en la
--    consola, en desarrollo. El stock quedaba alto y el historial no lo
--    explicaba. Todo lo que se pudo diagnosticar hoy --el descuento en gramos,
--    cuanto morron se uso de verdad-- salio de ese historial: un movimiento que
--    falta es un numero que despues nadie puede reconstruir.
--
-- Una funcion de plpgsql corre en una transaccion: o entra toda la compra con
-- sus movimientos, o no entra nada.
--
-- Es la misma forma que ya usa la venta (`aplicar_movimientos_de_stock`). Corre
-- como quien la llama, asi que las policies de `ingredients` siguen decidiendo
-- quien puede escribir.
create or replace function public.registrar_compra_de_stock(
  p_items  jsonb,
  p_motivo text default null
) returns jsonb
  language plpgsql
  set search_path to 'public'
as $$
declare
  v_item     jsonb;
  v_id       uuid;
  v_cantidad numeric;
  v_costo    numeric;
  v_prev     numeric;
  v_new      numeric;
  v_aplicados int := 0;
  -- Los insumos a los que les cambio el costo: son los unicos que obligan a
  -- recalcular el costo de los productos que los usan.
  v_con_costo_nuevo jsonb := '[]'::jsonb;
  v_user     uuid := auth.uid();
  v_motivo   text := coalesce(nullif(btrim(p_motivo), ''), 'Compra de mercadería');
begin
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_id       := (v_item->>'id')::uuid;
    v_cantidad := (v_item->>'cantidad')::numeric;
    v_costo    := nullif(v_item->>'costo', '')::numeric;

    if v_id is null or v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Linea de compra invalida: %', v_item;
    end if;

    update ingredients
       set current_stock = current_stock + v_cantidad,
           cost_per_unit = coalesce(v_costo, cost_per_unit),
           updated_at    = now()
     where id = v_id
    returning current_stock - v_cantidad, current_stock into v_prev, v_new;

    if not found then
      raise exception 'No existe el insumo %', v_id;
    end if;

    insert into stock_movements (
      ingredient_id, movement_type, quantity, previous_stock, new_stock,
      reason, reference_type, created_by
    ) values (
      v_id, 'purchase', v_cantidad, v_prev, v_new,
      v_motivo, 'purchase', v_user
    );

    v_aplicados := v_aplicados + 1;

    if v_costo is not null then
      v_con_costo_nuevo := v_con_costo_nuevo || to_jsonb(v_id);
    end if;
  end loop;

  return jsonb_build_object(
    'aplicados', v_aplicados,
    'cambiaron_costo', v_con_costo_nuevo
  );
end;
$$;

comment on function public.registrar_compra_de_stock(jsonb, text) is
  'Registra una compra entera en una transaccion: suma el stock de cada insumo, actualiza su costo si vino, y deja un movimiento por linea. O entra todo o no entra nada.';

revoke all on function public.registrar_compra_de_stock(jsonb, text) from public, anon;
grant execute on function public.registrar_compra_de_stock(jsonb, text) to authenticated;
