-- Cobrar una mesa hacia 14 viajes a la base, ~2,1 segundos con los ~160ms fijos
-- que cuesta cada uno. Y como eran 14 operaciones sueltas, el codigo tenia que
-- deshacerlas a mano si alguna fallaba a mitad de camino:
--
--     let paymentSplitsInserted = false
--     let sessionTotalsUpdated = false
--     let tableFreed = false
--
-- Eso no es una transaccion, es una imitacion: si el proceso se corta —la
-- funcion de Netlify se muere, se cae la red— nadie ejecuta la compensacion y
-- la caja queda a medio cobrar.
--
-- Aca es una transaccion de verdad: o pasa todo, o no pasa nada, y en un viaje.
-- Las reglas son exactamente las de validateHybridPaymentSplits y getSalesField.

create or replace function public.pagar_pedido_de_mesa(
  p_order_id       uuid,
  p_table_id       uuid,
  p_session_id     uuid,
  p_payment_method text,
  p_splits         jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  eps            constant numeric := 0.02;
  v_order        orders%rowtype;
  v_table        restaurant_tables%rowtype;
  v_total        numeric;
  v_items_json   jsonb;
  v_hibrido      boolean;
  v_no_efectivo  numeric;
  v_efectivo     numeric;
  v_principal    text;
  v_split        jsonb;
begin
  if not exists (
    select 1 from cash_register_sessions
     where id = p_session_id and status = 'open'
  ) then
    raise exception 'La caja no esta abierta';
  end if;

  -- FOR UPDATE: si dos terminales cobran la misma mesa a la vez, la segunda
  -- espera y se encuentra la orden ya pagada.
  select * into v_table from restaurant_tables where id = p_table_id for update;
  if not found or v_table.current_order_id is distinct from p_order_id then
    raise exception 'La orden no corresponde a esta mesa';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found or v_order.status not in ('abierto', 'cuenta_pedida') then
    raise exception 'Orden no encontrada o ya pagada';
  end if;

  -- Total recalculado desde los items, mas el envio. Sin sumar el envio se lo
  -- come, que es el bug que costo 3.000 pesos en un pedido de mostrador.
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

  v_hibrido := p_splits is not null and jsonb_array_length(p_splits) > 1;

  if v_hibrido then
    if exists (
      select 1 from jsonb_array_elements(p_splits) s
       where (s->>'amount')::numeric <= 0
    ) then
      raise exception 'Los montos deben ser mayores a cero';
    end if;

    select coalesce(sum((s->>'amount')::numeric) filter (where s->>'method' <> 'cash'), 0),
           coalesce(sum((s->>'amount')::numeric) filter (where s->>'method' =  'cash'), 0)
      into v_no_efectivo, v_efectivo
      from jsonb_array_elements(p_splits) s;

    if v_no_efectivo > v_total + eps then
      raise exception 'Los medios distintos de efectivo no pueden superar el total del pedido';
    end if;
    if v_no_efectivo + v_efectivo < v_total - eps then
      raise exception 'La suma de los medios es menor al total del pedido';
    end if;
    if v_no_efectivo >= v_total - eps and v_efectivo > eps then
      raise exception 'El total ya esta cubierto; quita el efectivo o ajusta los montos';
    end if;

    select s->>'method' into v_principal
      from jsonb_array_elements(p_splits) s
     order by (s->>'amount')::numeric desc
     limit 1;
  else
    v_principal := p_payment_method;
  end if;

  update orders
     set status         = 'pagado',
         payment_method = v_principal,
         total          = v_total,
         items          = v_items_json,
         updated_at     = now()
   where id = p_order_id
  returning * into v_order;

  if v_hibrido then
    insert into payment_splits (order_id, amount, method, session_id)
    select p_order_id, (s->>'amount')::numeric, s->>'method', p_session_id
      from jsonb_array_elements(p_splits) s;
  end if;

  -- Totales del turno. Mercado Pago va a transferencias, igual que getSalesField.
  update cash_register_sessions
     set total_sales  = coalesce(total_sales, 0) + v_total,
         total_orders = coalesce(total_orders, 0) + 1
   where id = p_session_id;

  if v_hibrido then
    for v_split in select * from jsonb_array_elements(p_splits) loop
      update cash_register_sessions
         set total_cash_sales     = coalesce(total_cash_sales, 0)
                                    + case when v_split->>'method' = 'cash' then (v_split->>'amount')::numeric else 0 end,
             total_card_sales     = coalesce(total_card_sales, 0)
                                    + case when v_split->>'method' = 'card' then (v_split->>'amount')::numeric else 0 end,
             total_transfer_sales = coalesce(total_transfer_sales, 0)
                                    + case when v_split->>'method' in ('transfer', 'mercadopago') then (v_split->>'amount')::numeric else 0 end
       where id = p_session_id;
    end loop;
  else
    update cash_register_sessions
       set total_cash_sales     = coalesce(total_cash_sales, 0)
                                  + case when v_principal = 'card' or v_principal in ('transfer','mercadopago') then 0 else v_total end,
           total_card_sales     = coalesce(total_card_sales, 0)
                                  + case when v_principal = 'card' then v_total else 0 end,
           total_transfer_sales = coalesce(total_transfer_sales, 0)
                                  + case when v_principal in ('transfer','mercadopago') then v_total else 0 end
     where id = p_session_id;
  end if;

  update restaurant_tables
     set status = 'libre', current_order_id = null
   where id = p_table_id;

  -- Los items pendientes viajan de vuelta para que el descuento de stock no
  -- necesite otra consulta.
  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('product_id', oi.product_id, 'quantity', oi.quantity))
        from order_items oi
       where oi.order_id = p_order_id and oi.status = 'pendiente'
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.pagar_pedido_de_mesa(uuid, uuid, uuid, text, jsonb) to authenticated;
revoke execute on function public.pagar_pedido_de_mesa(uuid, uuid, uuid, text, jsonb) from anon;

notify pgrst, 'reload schema';
