-- La reventa tambien se compra.
--
-- La compra solo sabia de insumos. Pero lo que entra por la puerta tambien son
-- gaseosas, cervezas y aguas que se venden tal cual, y su stock entraba como
-- ajuste --que en el historial se lee como una correccion de inventario-- y su
-- costo no tenia por donde entrar: 16 de 23 productos de reventa no lo tienen.
--
-- Cada linea trae ahora un `tipo`: 'insumo' (lo de siempre, y el valor por
-- defecto, asi que las llamadas viejas siguen andando) o 'producto'. Todo sigue
-- en una sola transaccion: la compra entra entera o no entra.
--
-- Una linea de producto:
--   * solo acepta reventa. Un elaborado o un combo se produce, no se compra, y
--     sumarle stock lo desincronizaria de sus recetas.
--   * activa el seguimiento de stock. Si se compran 24 unidades es porque se
--     quiere saber cuantas quedan (decidido con David).
--   * deja el movimiento con `product_id`. `stock_movements` ya lo admite: el
--     CHECK exige insumo **o** producto.
create or replace function public.registrar_compra_de_stock(
  p_items  jsonb,
  p_motivo text default null
) returns jsonb
  language plpgsql
  set search_path to 'public'
as $$
declare
  v_item     jsonb;
  v_tipo     text;
  v_id       uuid;
  v_cantidad numeric;
  v_costo    numeric;
  v_prev     numeric;
  v_new      numeric;
  v_aplicados int := 0;
  -- Los insumos a los que les cambio el costo: obligan a recalcular los
  -- productos que los usan.
  v_con_costo_nuevo jsonb := '[]'::jsonb;
  -- Los productos a los que les cambio el costo: obligan a recalcular los
  -- combos que los incluyen.
  v_productos_con_costo_nuevo jsonb := '[]'::jsonb;
  -- Los productos que entraron, con su stock nuevo: pueden volver a estar
  -- disponibles si el sistema los habia apagado por falta.
  v_productos jsonb := '[]'::jsonb;
  v_user     uuid := auth.uid();
  v_motivo   text := coalesce(nullif(btrim(p_motivo), ''), 'Compra de mercadería');
begin
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_tipo     := coalesce(nullif(v_item->>'tipo', ''), 'insumo');
    v_id       := (v_item->>'id')::uuid;
    v_cantidad := (v_item->>'cantidad')::numeric;
    v_costo    := nullif(v_item->>'costo', '')::numeric;

    if v_id is null or v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Linea de compra invalida: %', v_item;
    end if;

    if v_tipo = 'insumo' then
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

      if v_costo is not null then
        v_con_costo_nuevo := v_con_costo_nuevo || to_jsonb(v_id);
      end if;

    elsif v_tipo = 'producto' then
      update products
         set current_stock          = coalesce(current_stock, 0) + v_cantidad,
             cost                   = coalesce(v_costo, cost),
             stock_tracking_enabled = true
       where id = v_id
         and product_type = 'reventa'
      returning current_stock - v_cantidad, current_stock into v_prev, v_new;

      if not found then
        raise exception 'No existe el producto de reventa %', v_id;
      end if;

      insert into stock_movements (
        product_id, movement_type, quantity, previous_stock, new_stock,
        reason, reference_type, created_by
      ) values (
        v_id, 'purchase', v_cantidad, v_prev, v_new,
        v_motivo, 'purchase', v_user
      );

      v_productos := v_productos || jsonb_build_object('id', v_id, 'stock', v_new);

      if v_costo is not null then
        v_productos_con_costo_nuevo := v_productos_con_costo_nuevo || to_jsonb(v_id);
      end if;

    else
      raise exception 'Tipo de linea desconocido: %', v_tipo;
    end if;

    v_aplicados := v_aplicados + 1;
  end loop;

  return jsonb_build_object(
    'aplicados', v_aplicados,
    'cambiaron_costo', v_con_costo_nuevo,
    'productos', v_productos,
    'productos_cambiaron_costo', v_productos_con_costo_nuevo
  );
end;
$$;

comment on function public.registrar_compra_de_stock(jsonb, text) is
  'Registra una compra entera en una transaccion: insumos y productos de reventa. Suma stock, actualiza el costo si vino y deja un movimiento por linea. O entra todo o no entra nada.';

revoke all on function public.registrar_compra_de_stock(jsonb, text) from public, anon;
grant execute on function public.registrar_compra_de_stock(jsonb, text) to authenticated;
