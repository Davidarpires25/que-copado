-- `cobrar_pedido_de_mostrador` decide con esta linea que rama seguir:
--
--   v_es_web := v_order.order_source = 'web';
--
-- El nombre engania. Lo que la funcion necesita saber no es "vino de la web"
-- sino "es un pedido remoto": uno que nacio en 'recibido', que guarda sus
-- productos en la columna JSON `items` en vez de en `order_items`, y que
-- todavia no tiene sesion de caja asignada. Eso vale para cualquier pedido que
-- haya pasado por `createOrder()`, venga de la web o del agente de WhatsApp.
--
-- Con el canal nuevo, un pedido de WhatsApp entraria por la rama de mostrador:
-- recalcularia el total desde `order_items`, que para el esta vacio, y lo
-- cobraria en CERO. Ademas la validacion de estado lo rechazaria antes, porque
-- nace 'recibido' y no 'abierto'. O sea: el pedido no se podria cobrar, y si se
-- pudiera, se cobraria mal.
--
-- La condicion pasa a `<> 'pos'`, que expresa la intencion real y no vuelve a
-- romperse cuando aparezca un cuarto canal. La variable se renombra para que
-- diga lo que hace.
--
-- Todo lo demas de la funcion queda igual que en la migracion 029. Para
-- revertir: reemplazar la linea de v_es_remoto por
-- `v_es_web := v_order.order_source = 'web';` y volver a usar v_es_web en los
-- tres lugares donde se lee.

create or replace function public.cobrar_pedido_de_mostrador(
  p_order_id       uuid,
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
  v_es_remoto    boolean;
  v_total        numeric;
  v_items_json   jsonb;
  v_items_stock  jsonb;
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

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Orden no encontrada o ya procesada';
  end if;

  -- Remoto = nacio fuera del mostrador: web o agente de WhatsApp.
  v_es_remoto := v_order.order_source <> 'pos';

  if not (
    (v_order.order_type = 'mostrador' and v_order.status = 'abierto')
    or (v_es_remoto and v_order.status = 'recibido')
  ) then
    raise exception 'Orden no encontrada o ya procesada';
  end if;

  if v_es_remoto then
    -- El pedido remoto guarda sus productos en el JSON y no tiene filas en
    -- order_items: recalcular desde ahi le pondria el total en cero. Su total
    -- ya lo valido el servidor al crearlo.
    v_total := v_order.total;
    v_items_json := v_order.items;
    v_items_stock := coalesce((
      select jsonb_agg(jsonb_build_object(
               'product_id', it->>'id',
               'quantity',   (it->>'quantity')::numeric))
        from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) it
       where it->>'id' is not null
    ), '[]'::jsonb);
  else
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

    -- El envio entra en el total. Omitirlo fue el bug que costo 3.000 pesos.
    v_total := v_total + coalesce(v_order.shipping_cost, 0);

    v_items_stock := coalesce((
      select jsonb_agg(jsonb_build_object('product_id', oi.product_id, 'quantity', oi.quantity))
        from order_items oi
       where oi.order_id = p_order_id and oi.status = 'pendiente'
    ), '[]'::jsonb);
  end if;

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
         -- El pedido remoto nace sin turno: entra al de quien lo cobra.
         cash_register_session_id = case when v_es_remoto then p_session_id
                                         else cash_register_session_id end,
         updated_at     = now()
   where id = p_order_id
  returning * into v_order;

  if v_hibrido then
    insert into payment_splits (order_id, amount, method, session_id)
    select p_order_id, (s->>'amount')::numeric, s->>'method', p_session_id
      from jsonb_array_elements(p_splits) s;
  end if;

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
                                    + case when v_split->>'method' in ('transfer','mercadopago') then (v_split->>'amount')::numeric else 0 end
       where id = p_session_id;
    end loop;
  else
    update cash_register_sessions
       set total_cash_sales     = coalesce(total_cash_sales, 0)
                                  + case when v_principal in ('card','transfer','mercadopago') then 0 else v_total end,
           total_card_sales     = coalesce(total_card_sales, 0)
                                  + case when v_principal = 'card' then v_total else 0 end,
           total_transfer_sales = coalesce(total_transfer_sales, 0)
                                  + case when v_principal in ('transfer','mercadopago') then v_total else 0 end
     where id = p_session_id;
  end if;

  return jsonb_build_object('order', to_jsonb(v_order), 'items', v_items_stock);
end;
$$;

grant execute on function public.cobrar_pedido_de_mostrador(uuid, uuid, text, jsonb) to authenticated;
revoke execute on function public.cobrar_pedido_de_mostrador(uuid, uuid, text, jsonb) from anon;

notify pgrst, 'reload schema';
