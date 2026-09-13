-- 033_descuento_de_stock_en_una_transaccion.sql
--
-- El descuento de stock escribia a medida que recorria el arbol de recetas:
-- por cada ingrediente, un SELECT de current_stock, la cuenta en JS y un UPDATE
-- con el valor absoluto, mas un INSERT aparte del movimiento. De ahi salian
-- tres problemas:
--
--   * Carrera: dos ventas simultaneas del mismo ingrediente leian el mismo
--     current_stock y la segunda pisaba a la primera. Es exactamente lo que
--     `increment_field` (migracion 013) ya resolvia para los totales de caja,
--     pero el stock habia quedado afuera.
--   * El UPDATE del stock y el INSERT del movimiento no eran atomicos. Si
--     fallaba el insert, el stock bajaba sin registro; y como la reversion de
--     una venta se arma leyendo esos movimientos, ese stock no volvia nunca.
--   * Sin idempotencia: un reintento descontaba dos veces.
--
-- Estas dos funciones reciben la lista completa de movimientos ya calculada y
-- la aplican de una, en una transaccion, con incrementos relativos.

BEGIN;

-- ---------------------------------------------------------------------------
-- Aplicar los descuentos de una venta
-- ---------------------------------------------------------------------------
--
-- p_movimientos: [{ "tipo": "ingredient"|"product", "id": uuid, "cantidad": numeric }]
--   `cantidad` es positiva y se RESTA del stock.
--
-- Devuelve { aplicados, duplicado, negativos: [{ tipo, id, stock }] }.
create or replace function public.aplicar_movimientos_de_stock(
  p_order_id    uuid,
  p_movimientos jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_mov       jsonb;
  v_cantidad  numeric;
  v_id        uuid;
  v_prev      numeric;
  v_new       numeric;
  v_negativos jsonb := '[]'::jsonb;
  v_aplicados int := 0;
  v_user      uuid := auth.uid();
begin
  if p_order_id is null then
    raise exception 'Falta el id del pedido';
  end if;

  -- Idempotencia: si este pedido ya descontó, no se vuelve a tocar. Cubre el
  -- reintento, el doble clic y el reenvio de la server action.
  if exists (
    select 1 from stock_movements
     where order_id = p_order_id and movement_type = 'sale'
  ) then
    return jsonb_build_object('aplicados', 0, 'duplicado', true, 'negativos', '[]'::jsonb);
  end if;

  for v_mov in select * from jsonb_array_elements(coalesce(p_movimientos, '[]'::jsonb))
  loop
    v_id       := (v_mov->>'id')::uuid;
    v_cantidad := (v_mov->>'cantidad')::numeric;

    if v_id is null or v_cantidad is null or v_cantidad = 0 then
      continue;
    end if;

    if (v_mov->>'tipo') = 'ingredient' then
      -- Incremento relativo: la resta la hace Postgres sobre el valor vigente,
      -- asi que dos ventas simultaneas ya no se pisan.
      update ingredients
         set current_stock = current_stock - v_cantidad
       where id = v_id
      returning current_stock + v_cantidad, current_stock into v_prev, v_new;

      if not found then continue; end if;

      insert into stock_movements (
        ingredient_id, movement_type, quantity, previous_stock, new_stock,
        reason, reference_type, order_id, created_by
      ) values (
        v_id, 'sale', -v_cantidad, v_prev, v_new,
        'Venta automatica', 'order', p_order_id, v_user
      );
    else
      update products
         set current_stock = current_stock - v_cantidad
       where id = v_id
      returning current_stock + v_cantidad, current_stock into v_prev, v_new;

      if not found then continue; end if;

      insert into stock_movements (
        product_id, movement_type, quantity, previous_stock, new_stock,
        reason, reference_type, order_id, created_by
      ) values (
        v_id, 'sale', -v_cantidad, v_prev, v_new,
        'Venta automatica', 'order', p_order_id, v_user
      );
    end if;

    v_aplicados := v_aplicados + 1;

    -- No se bloquea la venta: vender en rojo es una decision ya tomada. Lo que
    -- faltaba era que quedara constancia de la anomalia.
    if v_new < 0 then
      v_negativos := v_negativos || jsonb_build_object(
        'tipo', v_mov->>'tipo', 'id', v_id, 'stock', v_new
      );
    end if;
  end loop;

  return jsonb_build_object(
    'aplicados', v_aplicados,
    'duplicado', false,
    'negativos', v_negativos
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Revertir los descuentos de una venta cancelada
-- ---------------------------------------------------------------------------
--
-- Devuelve { revertidos, duplicado }.
create or replace function public.revertir_movimientos_de_stock(
  p_order_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sale        stock_movements%rowtype;
  v_prev        numeric;
  v_new         numeric;
  v_revertidos  int := 0;
  v_user        uuid := auth.uid();
begin
  if p_order_id is null then
    raise exception 'Falta el id del pedido';
  end if;

  -- Sin esto, cancelar dos veces devolvia el stock dos veces.
  if exists (
    select 1 from stock_movements
     where order_id = p_order_id and movement_type = 'sale_reversal'
  ) then
    return jsonb_build_object('revertidos', 0, 'duplicado', true);
  end if;

  for v_sale in
    select * from stock_movements
     where order_id = p_order_id and movement_type = 'sale'
     order by created_at
  loop
    if v_sale.ingredient_id is not null then
      update ingredients
         set current_stock = current_stock + abs(v_sale.quantity)
       where id = v_sale.ingredient_id
      returning current_stock - abs(v_sale.quantity), current_stock into v_prev, v_new;

      if not found then continue; end if;

      insert into stock_movements (
        ingredient_id, movement_type, quantity, previous_stock, new_stock,
        reason, reference_type, order_id, created_by
      ) values (
        v_sale.ingredient_id, 'sale_reversal', abs(v_sale.quantity), v_prev, v_new,
        'Reversion por cancelacion', 'order', p_order_id, v_user
      );
    else
      update products
         set current_stock = current_stock + abs(v_sale.quantity)
       where id = v_sale.product_id
      returning current_stock - abs(v_sale.quantity), current_stock into v_prev, v_new;

      if not found then continue; end if;

      insert into stock_movements (
        product_id, movement_type, quantity, previous_stock, new_stock,
        reason, reference_type, order_id, created_by
      ) values (
        v_sale.product_id, 'sale_reversal', abs(v_sale.quantity), v_prev, v_new,
        'Reversion por cancelacion', 'order', p_order_id, v_user
      );
    end if;

    v_revertidos := v_revertidos + 1;
  end loop;

  return jsonb_build_object('revertidos', v_revertidos, 'duplicado', false);
end;
$$;

COMMIT;
