-- Agregar items a una mesa hacia cuatro viajes: verificar la orden, insertar, y
-- recalcular el total (que son dos mas). Con los ~160ms fijos de cada uno eso
-- son ~0,6 segundos antes de que el cliente pueda siquiera empezar a mostrarlo.
--
-- Ademas no era atomico: si el recalculo fallaba despues del insert, los items
-- quedaban cargados y el total viejo, o sea una mesa que debe mas de lo que
-- dice.

create or replace function public.agregar_items_al_pedido(
  p_order_id uuid,
  p_items    jsonb,
  p_sale_tag text default null,
  p_added_by uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order      orders%rowtype;
  v_total      numeric;
  v_items_json jsonb;
  v_nuevos     jsonb;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found or v_order.status not in ('abierto', 'cuenta_pedida') then
    raise exception 'La orden no esta abierta';
  end if;

  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'No hay items para agregar';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) it
     where (it->>'quantity')::numeric <= 0
  ) then
    raise exception 'La cantidad de cada producto debe ser mayor a cero';
  end if;

  with insertados as (
    insert into order_items (
      order_id, product_id, product_name, product_price, quantity,
      notes, sale_tag, status, added_by, metadata
    )
    select p_order_id,
           (it->>'product_id')::uuid,
           it->>'product_name',
           (it->>'product_price')::numeric,
           (it->>'quantity')::numeric,
           nullif(it->>'notes', ''),
           nullif(p_sale_tag, ''),
           'pendiente',
           p_added_by,
           it->'metadata'
      from jsonb_array_elements(p_items) it
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(insertados)), '[]'::jsonb) into v_nuevos from insertados;

  -- Mismo recalculo que recalculateOrderTotal: items vigentes mas el envio, y
  -- el snapshot JSON sincronizado.
  select coalesce(sum(oi.product_price * oi.quantity), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'id',       coalesce(oi.product_id, oi.id),
           'name',     oi.product_name,
           'price',    oi.product_price,
           'quantity', oi.quantity
         ) order by oi.added_at), '[]'::jsonb)
    into v_total, v_items_json
    from order_items oi
   where oi.order_id = p_order_id
     and oi.status is distinct from 'cancelado';

  v_total := v_total + coalesce(v_order.shipping_cost, 0);

  update orders
     set total = v_total, items = v_items_json, updated_at = now()
   where id = p_order_id;

  return jsonb_build_object('items', v_nuevos, 'total', v_total);
end;
$$;

grant execute on function public.agregar_items_al_pedido(uuid, jsonb, text, uuid) to authenticated;
revoke execute on function public.agregar_items_al_pedido(uuid, jsonb, text, uuid) from anon;

notify pgrst, 'reload schema';
