-- Confirmar un pedido de mostrador hacia entre 7 y 9 viajes a la base, uno
-- atras del otro: verificar la sesion, insertar la orden, insertar los items, y
-- adentro de sendToKitchen dos consultas mas y dos inserts por estacion. Con
-- los ~160ms fijos de cada viaje eso es mas de un segundo antes de que el
-- cajero vea nada.
--
-- Las migraciones 028-030 hicieron esto mismo con los tres caminos de cobro. La
-- creacion quedo afuera de esa tanda, aunque es la que mas viajes tiene.
--
-- Tampoco era atomico. El insert de order_items se compensaba a mano borrando
-- la orden recien creada, y si fallaba una comanda el codigo seguia de largo:
-- quedaba un pedido cobrable que cocina nunca veia.

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

  -- Una comanda por estacion, con los items que efectivamente van a cocina.
  -- Se omite lo que no tiene estacion y la reventa, igual que sendToKitchen.
  for v_station in
    select distinct p.station
      from order_items oi
      join products p on p.id = oi.product_id
     where oi.order_id = v_order.id
       and p.station is not null
       and coalesce(p.product_type, '') <> 'reventa'
  loop
    insert into comandas (order_id, station, status)
    values (v_order.id, v_station, 'pendiente')
    returning id into v_comanda;

    insert into comanda_items (
      comanda_id, order_item_id, product_name, quantity, sale_tag, notes
    )
    select v_comanda, oi.id, oi.product_name, oi.quantity, oi.sale_tag, oi.notes
      from order_items oi
      join products p on p.id = oi.product_id
     where oi.order_id = v_order.id
       and p.station = v_station
       and coalesce(p.product_type, '') <> 'reventa';
  end loop;

  return to_jsonb(v_order);
end;
$$;

grant execute on function public.crear_pedido_de_mostrador(uuid, jsonb, numeric, text, numeric, uuid, uuid) to authenticated;
