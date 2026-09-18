-- Un combo no genera comanda, y cocina nunca se entera.
--
-- `crear_pedido_de_mostrador` arma las comandas agrupando por `products.station`
-- y salteando la reventa. Un combo no tiene estacion propia —la tienen sus
-- componentes— asi que no entraba en ningun grupo: el pedido se cobraba y la
-- hamburguesa del combo no aparecia en ninguna pantalla de cocina.
--
-- Esta version expande el combo antes de agrupar. Cada componente va a su
-- estacion, la reventa sigue sin ir a cocina, y el nombre del combo viaja al
-- lado del componente para que despacho sepa que se entregan juntos: sin eso,
-- cocina prepara bien y en el mostrador nadie sabe que esa hamburguesa va con
-- una bebida.
--
-- Un combo con estacion propia aparece ademas con su propio nombre: significa
-- que el combo arma algo el mismo —sus recetas traen el envase y la preparacion
-- especifica— y cocina tiene que verlo.
--
-- Lo demas de la funcion queda igual que en la migracion 038.

create or replace function public.crear_pedido_de_mostrador(
  p_session_id       uuid,
  p_items            jsonb,
  p_total            numeric,
  p_notes            text    default null,
  p_shipping_cost    numeric default 0,
  p_delivery_zone_id uuid    default null,
  p_added_by         uuid    default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order    orders%rowtype;
  v_autor    uuid := coalesce(p_added_by, auth.uid());
  v_station  text;
  v_comanda  uuid;
begin
  if not exists (
    select 1 from cash_register_sessions
     where id = p_session_id and status = 'open'
  ) then
    raise exception 'La caja no esta abierta';
  end if;

  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) it
     where (it->>'quantity')::numeric <= 0
  ) then
    raise exception 'La cantidad de cada producto debe ser mayor a cero';
  end if;

  insert into orders (
    items, total, payment_method, order_source, order_type, table_number,
    notes, cash_register_session_id, status, shipping_cost, delivery_zone_id,
    customer_phone, customer_name, customer_address, opened_at, updated_at
  ) values (
    p_items, p_total, 'cash', 'pos', 'mostrador', null,
    p_notes, p_session_id, 'abierto', coalesce(p_shipping_cost, 0), p_delivery_zone_id,
    null, null, null, now(), now()
  )
  returning * into v_order;

  insert into order_items (
    order_id, product_id, product_name, product_price, quantity,
    notes, status, added_by, metadata
  )
  select v_order.id,
         (it->>'id')::uuid,
         it->>'name',
         (it->>'price')::numeric,
         (it->>'quantity')::smallint,
         nullif(it->>'notes', ''),
         'pendiente',
         v_autor,
         nullif(it->'metadata', 'null'::jsonb)
    from jsonb_array_elements(p_items) it;

  -- Lo que efectivamente va a cocina, con los combos ya expandidos.
  create temp table _lineas_de_cocina on commit drop as
  select oi.id            as order_item_id,
         oi.product_name  as nombre,
         oi.quantity::int as cantidad,
         p.station        as station,
         oi.sale_tag      as sale_tag,
         oi.notes         as notes
    from order_items oi
    join products p on p.id = oi.product_id
   where oi.order_id = v_order.id
     and p.station is not null
     -- El combo entra aca cuando tiene estacion propia: eso significa que el
     -- combo mismo prepara algo —sus recetas, el armado— y cocina tiene que
     -- verlo con su nombre. Un combo sin estacion no arma nada por si mismo y
     -- solo aporta sus componentes, que salen del segundo bloque.
     and coalesce(p.product_type, '') <> 'reventa'
  union all
  select oi.id,
         c.name || '  ·  ' || oi.product_name,
         (oi.quantity * pc.quantity)::int,
         c.station,
         oi.sale_tag,
         oi.notes
    from order_items oi
    join products p  on p.id = oi.product_id and p.product_type = 'combo'
    join product_components pc on pc.parent_id = p.id
    join products c  on c.id = pc.component_id
   where oi.order_id = v_order.id
     and c.station is not null
     and coalesce(c.product_type, '') <> 'reventa';

  for v_station in select distinct station from _lineas_de_cocina
  loop
    insert into comandas (order_id, station, status)
    values (v_order.id, v_station, 'pendiente')
    returning id into v_comanda;

    insert into comanda_items (
      comanda_id, order_item_id, product_name, quantity, sale_tag, notes
    )
    select v_comanda, order_item_id, nombre, cantidad, sale_tag, notes
      from _lineas_de_cocina
     where station = v_station;
  end loop;

  drop table if exists _lineas_de_cocina;

  return to_jsonb(v_order);
end;
$$;

grant execute on function public.crear_pedido_de_mostrador(uuid, jsonb, numeric, text, numeric, uuid, uuid) to authenticated;
