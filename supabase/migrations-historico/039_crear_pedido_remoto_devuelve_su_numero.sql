-- createOrder() devolvia siempre order_number en null.
--
-- El correlativo lo pone un trigger al insertar, asi que habia que leerlo de
-- vuelta. Esa relectura la hace `createAdminClient()`, que —pese al nombre— usa
-- la clave ANON (lo dice su propio comentario), y `anon` no tiene SELECT sobre
-- `orders`: la consulta vuelve vacia, el error se descarta, y el pedido sale con
-- el numero en null. El checkout web no lo notaba porque la pantalla de
-- confirmacion no lo muestra; el agente de WhatsApp si, porque su contrato
-- promete el numero y no podia decirle al cliente "tu pedido es el #12".
--
-- Esta funcion inserta y devuelve el numero en el mismo viaje. Es
-- `security definer` porque justamente necesita leer la fila que acaba de
-- escribir, que es lo que la policy le niega a anon.
--
-- Sobre los permisos: lo que anon puede hacer no cambia. La policy de INSERT
-- sobre `orders` es `with_check (true)` para anon, o sea que hoy ya puede
-- insertar un pedido con los valores que quiera. Esta funcion es mas estricta
-- que ese camino: fija el status en 'recibido', no deja elegir 'pos' como
-- origen, exige que haya productos y rechaza totales negativos. Lo unico nuevo
-- que devuelve es el numero del pedido que acaba de crear.

create or replace function public.crear_pedido_remoto(
  p_customer_name        text,
  p_customer_phone       text,
  p_customer_address     text,
  p_items                jsonb,
  p_total                numeric,
  p_payment_method       text,
  p_order_source         text    default 'web',
  p_customer_coordinates jsonb   default null,
  p_shipping_cost        numeric default 0,
  p_delivery_zone_id     uuid    default null,
  p_notes                text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  -- 'pos' queda afuera a proposito: el pedido de caja nace 'abierto', con sus
  -- productos en order_items y con sesion asignada. No es lo que hace esto.
  if p_order_source is null or p_order_source not in ('web', 'whatsapp') then
    raise exception 'Origen de pedido no valido';
  end if;

  if p_payment_method is null or p_payment_method not in ('cash', 'transfer', 'mercadopago', 'card') then
    raise exception 'Medio de pago no valido';
  end if;

  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;

  if coalesce(p_total, -1) < 0 or coalesce(p_shipping_cost, 0) < 0 then
    raise exception 'El total no puede ser negativo';
  end if;

  insert into orders (
    customer_name, customer_phone, customer_address, customer_coordinates,
    items, total, shipping_cost, delivery_zone_id, notes, payment_method,
    status, order_source
  ) values (
    p_customer_name, p_customer_phone, p_customer_address, p_customer_coordinates,
    p_items, p_total, coalesce(p_shipping_cost, 0), p_delivery_zone_id, p_notes,
    p_payment_method, 'recibido', p_order_source
  )
  returning * into v_order;

  -- Solo lo que quien hizo el pedido necesita saber de vuelta. No se devuelve
  -- la fila entera: seria darle a anon una lectura de `orders` por la ventana.
  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'created_at', v_order.created_at,
    'status', v_order.status
  );
end;
$$;

grant execute on function public.crear_pedido_remoto(
  text, text, text, jsonb, numeric, text, text, jsonb, numeric, uuid, text
) to anon, authenticated;
