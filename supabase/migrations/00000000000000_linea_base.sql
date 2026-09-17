


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "agent";


ALTER SCHEMA "agent" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."order_status_new" AS ENUM (
    'abierto',
    'recibido',
    'cuenta_pedida',
    'pagado',
    'entregado',
    'cancelado'
);


ALTER TYPE "public"."order_status_new" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "agent"."tocar_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "agent"."tocar_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."agregar_items_al_pedido"("p_order_id" "uuid", "p_items" "jsonb", "p_sale_tag" "text" DEFAULT NULL::"text", "p_added_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."agregar_items_al_pedido"("p_order_id" "uuid", "p_items" "jsonb", "p_sale_tag" "text", "p_added_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."aplicar_movimientos_de_stock"("p_order_id" "uuid", "p_movimientos" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."aplicar_movimientos_de_stock"("p_order_id" "uuid", "p_movimientos" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_order_number"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  d date;
begin
  d := (coalesce(new.created_at, now()) at time zone 'America/Argentina/Buenos_Aires')::date;

  -- Se escribe siempre, incluso si la fila ya trae numero: si quedara nula, el
  -- indice unico de abajo no podria compararla contra nada (en Postgres dos
  -- NULL no colisionan) y el duplicado volveria a pasar.
  new.order_day := d;

  if new.order_number is not null then
    return new;
  end if;

  insert into public.order_number_counters as c (day, last_number)
       values (d, 1)
  on conflict (day) do update set last_number = c.last_number + 1
    returning c.last_number into new.order_number;

  return new;
end;
$$;


ALTER FUNCTION "public"."assign_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT role::text FROM profiles WHERE id = auth.uid() AND is_active $$;


ALTER FUNCTION "public"."auth_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cobrar_pedido_de_mostrador"("p_order_id" "uuid", "p_session_id" "uuid", "p_payment_method" "text", "p_splits" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."cobrar_pedido_de_mostrador"("p_order_id" "uuid", "p_session_id" "uuid", "p_payment_method" "text", "p_splits" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_pedido_de_mostrador"("p_session_id" "uuid", "p_items" "jsonb", "p_total" numeric, "p_notes" "text" DEFAULT NULL::"text", "p_shipping_cost" numeric DEFAULT 0, "p_delivery_zone_id" "uuid" DEFAULT NULL::"uuid", "p_added_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."crear_pedido_de_mostrador"("p_session_id" "uuid", "p_items" "jsonb", "p_total" numeric, "p_notes" "text", "p_shipping_cost" numeric, "p_delivery_zone_id" "uuid", "p_added_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_pedido_remoto"("p_customer_name" "text", "p_customer_phone" "text", "p_customer_address" "text", "p_items" "jsonb", "p_total" numeric, "p_payment_method" "text", "p_order_source" "text" DEFAULT 'web'::"text", "p_customer_coordinates" "jsonb" DEFAULT NULL::"jsonb", "p_shipping_cost" numeric DEFAULT 0, "p_delivery_zone_id" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order orders%rowtype;
begin
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

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'created_at', v_order.created_at,
    'status', v_order.status
  );
end;
$$;


ALTER FUNCTION "public"."crear_pedido_remoto"("p_customer_name" "text", "p_customer_phone" "text", "p_customer_address" "text", "p_items" "jsonb", "p_total" numeric, "p_payment_method" "text", "p_order_source" "text", "p_customer_coordinates" "jsonb", "p_shipping_cost" numeric, "p_delivery_zone_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((SELECT r.key FROM roles r WHERE r.key = NEW.raw_user_meta_data->>'role'), 'cajero')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("perm" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
      FROM profiles p
      JOIN role_permissions rp ON rp.role_key = p.role::text
     WHERE p.id = auth.uid() AND p.is_active AND rp.permission = perm
  )
$$;


ALTER FUNCTION "public"."has_permission"("perm" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_field"("table_name" "text", "row_id" "uuid", "field_name" "text", "increment_value" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
BEGIN
  IF table_name <> 'cash_register_sessions'
     OR field_name NOT IN ('total_withdrawals', 'total_deposits') THEN
    RAISE EXCEPTION 'increment_field: combinacion no permitida (%, %)', table_name, field_name;
  END IF;
  IF NOT has_permission('caja.manage') THEN
    RAISE EXCEPTION 'increment_field: sin permiso';
  END IF;
  EXECUTE format('UPDATE %I SET %I = %I + $1 WHERE id = $2', table_name, field_name, field_name)
    USING increment_value, row_id;
END;
$_$;


ALTER FUNCTION "public"."increment_field"("table_name" "text", "row_id" "uuid", "field_name" "text", "increment_value" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT has_permission('users.manage') $$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."marcar_print_job"("p_id" "uuid", "p_status" "text", "p_error" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if p_status not in ('printed', 'error') then
    raise exception 'Estado no valido para un print job: %', p_status;
  end if;

  update print_jobs
     set status = p_status,
         error_msg = case when p_status = 'error' then p_error else null end
   where id = p_id
     and status = 'pending';

  return found;
end;
$$;


ALTER FUNCTION "public"."marcar_print_job"("p_id" "uuid", "p_status" "text", "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pagar_pedido_de_mesa"("p_order_id" "uuid", "p_table_id" "uuid", "p_session_id" "uuid", "p_payment_method" "text", "p_splits" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."pagar_pedido_de_mesa"("p_order_id" "uuid", "p_table_id" "uuid", "p_session_id" "uuid", "p_payment_method" "text", "p_splits" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."puede_administrar"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT has_permission('productos.manage') $$;


ALTER FUNCTION "public"."puede_administrar"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."puede_operar"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT has_permission('caja.manage') $$;


ALTER FUNCTION "public"."puede_operar"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reiniciar_control_de_stock"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."reiniciar_control_de_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revertir_movimientos_de_stock"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."revertir_movimientos_de_stock"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_order_sale_tag"("p_order_id" "uuid", "p_tag" "text", "p_agregar" boolean) RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  update public.orders
     set sale_tags = case
           when p_agregar then
             case when p_tag = any(sale_tags) then sale_tags
                  else array_append(sale_tags, p_tag) end
           else array_remove(sale_tags, p_tag)
         end,
         updated_at = now()
   where id = p_order_id;
$$;


ALTER FUNCTION "public"."toggle_order_sale_tag"("p_order_id" "uuid", "p_tag" "text", "p_agregar" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ve_operacion"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT has_permission('pedidos.view') $$;


ALTER FUNCTION "public"."ve_operacion"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "agent"."conversaciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "telefono" "text" NOT NULL,
    "nombre" "text",
    "atendida_por_humano" boolean DEFAULT false NOT NULL,
    "ultimo_mensaje_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "motivo_traspaso" "text",
    "traspasada_at" timestamp with time zone,
    "contexto_desde" timestamp with time zone,
    "direccion_texto" "text",
    "direccion_lat" double precision,
    "direccion_lng" double precision,
    "direccion_at" timestamp with time zone
);


ALTER TABLE "agent"."conversaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "agent"."mensajes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversacion_id" "uuid" NOT NULL,
    "message_id" "text" NOT NULL,
    "direccion" "text" DEFAULT 'entrante'::"text" NOT NULL,
    "tipo" "text" NOT NULL,
    "contenido" "text",
    "media_id" "text",
    "transcripcion" "text",
    "transcripcion_fallida" boolean DEFAULT false NOT NULL,
    "recibido_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ubicacion_lat" double precision,
    "ubicacion_lng" double precision,
    CONSTRAINT "mensajes_direccion_check" CHECK (("direccion" = ANY (ARRAY['entrante'::"text", 'saliente'::"text"])))
);


ALTER TABLE "agent"."mensajes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operating_days" integer[] DEFAULT '{0,1,2,3,4,5,6}'::integer[] NOT NULL,
    "opening_time" "text" DEFAULT '21:00'::"text" NOT NULL,
    "closing_time" "text" DEFAULT '01:00'::"text" NOT NULL,
    "is_paused" boolean DEFAULT false NOT NULL,
    "pause_message" "text" DEFAULT 'Estamos cerrados temporalmente. Volvemos pronto!'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "transfer_alias" "text",
    "transfer_cbu" "text",
    "transfer_titular" "text",
    CONSTRAINT "valid_closing_time" CHECK (("closing_time" ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'::"text")),
    CONSTRAINT "valid_opening_time" CHECK (("opening_time" ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'::"text")),
    CONSTRAINT "valid_operating_days" CHECK ((("operating_days" <@ ARRAY[0, 1, 2, 3, 4, 5, 6]) AND ("array_length"("operating_days", 1) > 0)))
);


ALTER TABLE "public"."business_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."business_settings" IS 'Configuración del negocio (singleton)';



COMMENT ON COLUMN "public"."business_settings"."operating_days" IS 'Días activos: 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab';



COMMENT ON COLUMN "public"."business_settings"."opening_time" IS 'Hora de apertura en formato 24h (HH:MM)';



COMMENT ON COLUMN "public"."business_settings"."closing_time" IS 'Hora de cierre en formato 24h (HH:MM)';



COMMENT ON COLUMN "public"."business_settings"."is_paused" IS 'Pausa manual para cerrar temporalmente';



COMMENT ON COLUMN "public"."business_settings"."transfer_alias" IS 'Alias de la cuenta para pagos por transferencia. Null o vacio = no configurado: el checkout no muestra nada.';



COMMENT ON COLUMN "public"."business_settings"."transfer_cbu" IS 'CBU/CVU de la cuenta para pagos por transferencia. Null o vacio = no configurado.';



COMMENT ON COLUMN "public"."business_settings"."transfer_titular" IS 'Nombre del titular de la cuenta. Es lo que el cliente ve en su banco al transferir: sin esto, paga a un alias y no sabe si es el del local.';



CREATE TABLE IF NOT EXISTS "public"."cash_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "reason" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cash_movements_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "cash_movements_type_check" CHECK (("type" = ANY (ARRAY['withdrawal'::"text", 'deposit'::"text"])))
);


ALTER TABLE "public"."cash_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_register_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    "opened_by" "uuid",
    "closed_by" "uuid",
    "opening_balance" numeric(12,2) DEFAULT 0 NOT NULL,
    "expected_cash" numeric(12,2) DEFAULT NULL::numeric,
    "actual_cash" numeric(12,2) DEFAULT NULL::numeric,
    "cash_difference" numeric(12,2) DEFAULT NULL::numeric,
    "total_sales" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_orders" integer DEFAULT 0 NOT NULL,
    "total_cash_sales" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_card_sales" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_transfer_sales" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_withdrawals" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_deposits" numeric(12,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    CONSTRAINT "cash_register_sessions_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."cash_register_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cash_register_sessions"."opened_by" IS 'Empleado que abrio el turno. Null para los turnos anteriores a esta columna.';



COMMENT ON COLUMN "public"."cash_register_sessions"."closed_by" IS 'Empleado que cerro el turno y firmo el arqueo.';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "color" "text" DEFAULT '#FEC501'::"text" NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comanda_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comanda_id" "uuid" NOT NULL,
    "order_item_id" "uuid",
    "product_name" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "sale_tag" "text",
    "notes" "text"
);


ALTER TABLE "public"."comanda_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comandas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "station" "text" NOT NULL,
    "status" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comandas_station_check" CHECK (("station" = ANY (ARRAY['cocina'::"text", 'barra'::"text"]))),
    CONSTRAINT "comandas_status_check" CHECK (("status" = ANY (ARRAY['pendiente'::"text", 'en_preparacion'::"text", 'listo'::"text"])))
);

ALTER TABLE ONLY "public"."comandas" REPLICA IDENTITY FULL;


ALTER TABLE "public"."comandas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "polygon" "jsonb",
    "shipping_cost" integer DEFAULT 0 NOT NULL,
    "color" "text" DEFAULT '#FF6B00'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "free_shipping_threshold" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "zone_type" "text" DEFAULT 'polygon'::"text" NOT NULL,
    "center" "jsonb",
    "radius_meters" integer,
    CONSTRAINT "delivery_zones_polygon_check" CHECK (((("zone_type" = 'polygon'::"text") AND ("polygon" IS NOT NULL)) OR (("zone_type" = 'circle'::"text") AND ("center" IS NOT NULL) AND ("radius_meters" IS NOT NULL) AND ("radius_meters" > 0)))),
    CONSTRAINT "delivery_zones_zone_type_check" CHECK (("zone_type" = ANY (ARRAY['polygon'::"text", 'circle'::"text"])))
);


ALTER TABLE "public"."delivery_zones" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_zones" IS 'Delivery zones with polygon boundaries for shipping cost calculation';



COMMENT ON COLUMN "public"."delivery_zones"."polygon" IS 'GeoJSON Polygon format: {"type": "Polygon", "coordinates": [[[lng, lat], ...]]}';



COMMENT ON COLUMN "public"."delivery_zones"."shipping_cost" IS 'Shipping cost in ARS (Argentine Pesos)';



COMMENT ON COLUMN "public"."delivery_zones"."free_shipping_threshold" IS 'Order amount threshold for free shipping in this zone (NULL = no free shipping)';



CREATE TABLE IF NOT EXISTS "public"."ingredient_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ingredient_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ingredient_sub_recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_ingredient_id" "uuid" NOT NULL,
    "child_ingredient_id" "uuid" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ingredient_sub_recipes_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "no_self_reference" CHECK (("parent_ingredient_id" <> "child_ingredient_id"))
);


ALTER TABLE "public"."ingredient_sub_recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "cost_per_unit" numeric NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_stock" numeric DEFAULT 0,
    "min_stock" numeric,
    "stock_tracking_enabled" boolean DEFAULT false NOT NULL,
    "category_id" "uuid",
    "waste_percentage" numeric DEFAULT 0,
    "yield_quantity" numeric DEFAULT 1 NOT NULL,
    CONSTRAINT "ingredients_cost_per_unit_check" CHECK (("cost_per_unit" >= (0)::numeric)),
    CONSTRAINT "ingredients_unit_check" CHECK (("unit" = ANY (ARRAY['kg'::"text", 'g'::"text", 'litro'::"text", 'ml'::"text", 'unidad'::"text"]))),
    CONSTRAINT "ingredients_waste_percentage_check" CHECK ((("waste_percentage" >= (0)::numeric) AND ("waste_percentage" < (100)::numeric))),
    CONSTRAINT "ingredients_yield_quantity_check" CHECK (("yield_quantity" > (0)::numeric))
);


ALTER TABLE "public"."ingredients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "product_name" "text" NOT NULL,
    "product_price" numeric(10,2) NOT NULL,
    "quantity" smallint DEFAULT 1 NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "added_by" "uuid",
    "sale_tag" "text",
    "metadata" "jsonb",
    "kitchen_print_batch_id" "uuid",
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_status_check" CHECK (("status" = ANY (ARRAY['pendiente'::"text", 'cancelado'::"text"])))
);

ALTER TABLE ONLY "public"."order_items" REPLICA IDENTITY FULL;


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_number_counters" (
    "day" "date" NOT NULL,
    "last_number" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."order_number_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by" "uuid"
);


ALTER TABLE "public"."order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "total" numeric(10,2) NOT NULL,
    "items" "jsonb" NOT NULL,
    "customer_phone" "text",
    "customer_name" "text",
    "customer_address" "text",
    "customer_coordinates" "jsonb",
    "shipping_cost" numeric(10,2) DEFAULT 0,
    "delivery_zone_id" "uuid",
    "notes" "text",
    "payment_method" "text",
    "status" "public"."order_status_new" DEFAULT 'recibido'::"public"."order_status_new",
    "order_source" "text" DEFAULT 'web'::"text" NOT NULL,
    "order_type" "text",
    "table_number" smallint,
    "cash_register_session_id" "uuid",
    "opened_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order_number" integer,
    "order_day" "date",
    "sale_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "idempotency_key" "text",
    "idempotency_body_hash" "text",
    CONSTRAINT "orders_order_source_check" CHECK (("order_source" = ANY (ARRAY['web'::"text", 'pos'::"text", 'whatsapp'::"text"]))),
    CONSTRAINT "orders_order_type_check" CHECK ((("order_type" IS NULL) OR ("order_type" = ANY (ARRAY['mostrador'::"text", 'mesa'::"text"])))),
    CONSTRAINT "orders_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'transfer'::"text", 'mercadopago'::"text", 'card'::"text"])))
);

ALTER TABLE ONLY "public"."orders" REPLICA IDENTITY FULL;


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."customer_coordinates" IS 'JSON con lat/lng: {"lat": -34.6037, "lng": -58.3816}';



COMMENT ON COLUMN "public"."orders"."shipping_cost" IS 'Costo de envío en ARS al momento del pedido';



COMMENT ON COLUMN "public"."orders"."delivery_zone_id" IS 'Referencia a zona de delivery (null si no hay zonas configuradas)';



COMMENT ON COLUMN "public"."orders"."payment_method" IS 'Método de pago: cash, transfer, o mercadopago';



COMMENT ON COLUMN "public"."orders"."status" IS 'Estado: recibido, pagado, entregado, cancelado';



COMMENT ON COLUMN "public"."orders"."order_source" IS 'Canal de origen: web (checkout publico), pos (mostrador o mesa), whatsapp (agente).';



COMMENT ON COLUMN "public"."orders"."idempotency_key" IS 'Clave de idempotencia del canal WhatsApp. Nula para pedidos web y de mostrador.';



COMMENT ON COLUMN "public"."orders"."idempotency_body_hash" IS 'Hash del cuerpo del request que creo el pedido. Permite distinguir un reintento legitimo de una reutilizacion de la clave con datos distintos.';



CREATE TABLE IF NOT EXISTS "public"."payment_splits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "sale_tag" "text",
    "amount" numeric(12,2) NOT NULL,
    "method" "text" NOT NULL,
    "paid_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid",
    CONSTRAINT "payment_splits_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "payment_splits_method_check" CHECK (("method" = ANY (ARRAY['cash'::"text", 'card'::"text", 'transfer'::"text", 'mercadopago'::"text"])))
);


ALTER TABLE "public"."payment_splits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."print_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "data" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_msg" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."print_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_half_configs" (
    "product_id" "uuid" NOT NULL,
    "source_category_id" "uuid",
    "pricing_method" "text" DEFAULT 'max'::"text" NOT NULL,
    "pricing_markup_pct" numeric(5,2),
    CONSTRAINT "product_half_configs_pricing_method_check" CHECK (("pricing_method" = ANY (ARRAY['max'::"text", 'average'::"text", 'fixed'::"text", 'cost_markup'::"text"])))
);


ALTER TABLE "public"."product_half_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "quantity" numeric DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_recipes_quantity_check" CHECK (("quantity" > (0)::numeric))
);


ALTER TABLE "public"."product_recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_types" (
    "type_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "uses_recipes" boolean DEFAULT false NOT NULL,
    "sends_to_kitchen" boolean DEFAULT false NOT NULL,
    CONSTRAINT "product_types_type_key_check" CHECK (("type_key" = "lower"("type_key")))
);


ALTER TABLE "public"."product_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "is_out_of_stock" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "cost" numeric(10,2) DEFAULT NULL::numeric,
    "product_type" "text" DEFAULT 'elaborado'::"text" NOT NULL,
    "current_stock" numeric DEFAULT 0,
    "min_stock" numeric,
    "stock_tracking_enabled" boolean DEFAULT false NOT NULL,
    "auto_disabled" boolean DEFAULT false NOT NULL,
    "station" "text",
    CONSTRAINT "products_station_check" CHECK (("station" = ANY (ARRAY['cocina'::"text", 'barra'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."cost" IS 'Costo de materia prima/ingredientes en ARS. NULL = no configurado.';



COMMENT ON COLUMN "public"."products"."auto_disabled" IS 'True when is_out_of_stock was set automatically by stock sync. Used to avoid overriding manual admin decisions.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "role" "text" DEFAULT 'cajero'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Empleados del local. Una fila por usuario de auth.users. Dar de baja es is_active = false, nunca DELETE: borrar rompe la trazabilidad de los turnos y arqueos que esa persona cerro.';



CREATE TABLE IF NOT EXISTS "public"."recipe_ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "ingredient_id" "uuid" NOT NULL,
    "quantity" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unit" "text",
    CONSTRAINT "recipe_ingredients_quantity_check" CHECK (("quantity" > (0)::numeric))
);


ALTER TABLE "public"."recipe_ingredients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."restaurant_tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number" smallint NOT NULL,
    "label" "text",
    "section" "text" DEFAULT 'principal'::"text" NOT NULL,
    "capacity" smallint DEFAULT 4 NOT NULL,
    "status" "text" DEFAULT 'libre'::"text" NOT NULL,
    "current_order_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "restaurant_tables_status_check" CHECK (("status" = ANY (ARRAY['libre'::"text", 'ocupada'::"text", 'cuenta_pedida'::"text"])))
);

ALTER TABLE ONLY "public"."restaurant_tables" REPLICA IDENTITY FULL;


ALTER TABLE "public"."restaurant_tables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "role_key" "text" NOT NULL,
    "permission" "text" NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_system" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "roles_key_check" CHECK (("key" ~ '^[a-z][a-z0-9_]{1,30}$'::"text"))
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ingredient_id" "uuid",
    "product_id" "uuid",
    "movement_type" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "previous_stock" numeric NOT NULL,
    "new_stock" numeric NOT NULL,
    "reason" "text",
    "reference_type" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_id" "uuid",
    CONSTRAINT "stock_movement_target_check" CHECK (((("ingredient_id" IS NOT NULL) AND ("product_id" IS NULL)) OR (("ingredient_id" IS NULL) AND ("product_id" IS NOT NULL)))),
    CONSTRAINT "stock_movements_movement_type_check" CHECK (("movement_type" = ANY (ARRAY['purchase'::"text", 'adjustment'::"text", 'waste'::"text", 'return'::"text", 'initial'::"text", 'sale'::"text", 'sale_reversal'::"text"]))),
    CONSTRAINT "stock_movements_reference_type_check" CHECK (("reference_type" = ANY (ARRAY['manual'::"text", 'purchase'::"text", 'order'::"text"])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


ALTER TABLE ONLY "agent"."conversaciones"
    ADD CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agent"."conversaciones"
    ADD CONSTRAINT "conversaciones_telefono_key" UNIQUE ("telefono");



ALTER TABLE ONLY "agent"."mensajes"
    ADD CONSTRAINT "mensajes_message_id_key" UNIQUE ("message_id");



ALTER TABLE ONLY "agent"."mensajes"
    ADD CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_settings"
    ADD CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_register_sessions"
    ADD CONSTRAINT "cash_register_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."comanda_items"
    ADD CONSTRAINT "comanda_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comandas"
    ADD CONSTRAINT "comandas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_zones"
    ADD CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingredient_categories"
    ADD CONSTRAINT "ingredient_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ingredient_categories"
    ADD CONSTRAINT "ingredient_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingredient_sub_recipes"
    ADD CONSTRAINT "ingredient_sub_recipes_parent_ingredient_id_child_ingredien_key" UNIQUE ("parent_ingredient_id", "child_ingredient_id");



ALTER TABLE ONLY "public"."ingredient_sub_recipes"
    ADD CONSTRAINT "ingredient_sub_recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_number_counters"
    ADD CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("day");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_splits"
    ADD CONSTRAINT "payment_splits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."print_jobs"
    ADD CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_half_configs"
    ADD CONSTRAINT "product_half_configs_pkey" PRIMARY KEY ("product_id");



ALTER TABLE ONLY "public"."product_recipes"
    ADD CONSTRAINT "product_recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_recipes"
    ADD CONSTRAINT "product_recipes_product_id_recipe_id_key" UNIQUE ("product_id", "recipe_id");



ALTER TABLE ONLY "public"."product_types"
    ADD CONSTRAINT "product_types_pkey" PRIMARY KEY ("type_key");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_recipe_id_ingredient_id_key" UNIQUE ("recipe_id", "ingredient_id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."restaurant_tables"
    ADD CONSTRAINT "restaurant_tables_number_key" UNIQUE ("number");



ALTER TABLE ONLY "public"."restaurant_tables"
    ADD CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_key", "permission");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



CREATE INDEX "conversaciones_traspasadas_idx" ON "agent"."conversaciones" USING "btree" ("traspasada_at" DESC) WHERE "atendida_por_humano";



CREATE INDEX "conversaciones_ultimo_mensaje_idx" ON "agent"."conversaciones" USING "btree" ("ultimo_mensaje_at" DESC);



CREATE INDEX "mensajes_conversacion_idx" ON "agent"."mensajes" USING "btree" ("conversacion_id", "recibido_at");



CREATE UNIQUE INDEX "idx_cash_register_sessions_single_open" ON "public"."cash_register_sessions" USING "btree" ((true)) WHERE ("status" = 'open'::"text");



CREATE INDEX "idx_cash_sessions_closed_by" ON "public"."cash_register_sessions" USING "btree" ("closed_by");



CREATE INDEX "idx_cash_sessions_opened_by" ON "public"."cash_register_sessions" USING "btree" ("opened_by");



CREATE INDEX "idx_comanda_items_comanda_id" ON "public"."comanda_items" USING "btree" ("comanda_id");



CREATE INDEX "idx_comandas_order_id" ON "public"."comandas" USING "btree" ("order_id");



CREATE INDEX "idx_comandas_status" ON "public"."comandas" USING "btree" ("status");



CREATE INDEX "idx_delivery_zones_is_active" ON "public"."delivery_zones" USING "btree" ("is_active");



CREATE INDEX "idx_delivery_zones_sort_order" ON "public"."delivery_zones" USING "btree" ("sort_order");



CREATE INDEX "idx_half_configs_source_category" ON "public"."product_half_configs" USING "btree" ("source_category_id");



CREATE INDEX "idx_ingredients_category" ON "public"."ingredients" USING "btree" ("category_id") WHERE ("category_id" IS NOT NULL);



CREATE INDEX "idx_ingredients_stock_tracking" ON "public"."ingredients" USING "btree" ("stock_tracking_enabled") WHERE ("stock_tracking_enabled" = true);



CREATE INDEX "idx_isr_child" ON "public"."ingredient_sub_recipes" USING "btree" ("child_ingredient_id");



CREATE INDEX "idx_isr_parent" ON "public"."ingredient_sub_recipes" USING "btree" ("parent_ingredient_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_orders_cash_register_session_id" ON "public"."orders" USING "btree" ("cash_register_session_id") WHERE ("cash_register_session_id" IS NOT NULL);



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_customer_phone" ON "public"."orders" USING "btree" ("customer_phone");



CREATE INDEX "idx_orders_delivery_zone" ON "public"."orders" USING "btree" ("delivery_zone_id");



CREATE INDEX "idx_orders_order_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_order_source" ON "public"."orders" USING "btree" ("order_source");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_status_open" ON "public"."orders" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['abierto'::"public"."order_status_new", 'cuenta_pedida'::"public"."order_status_new"]));



CREATE INDEX "idx_osh_changed_at" ON "public"."order_status_history" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_osh_order_id" ON "public"."order_status_history" USING "btree" ("order_id");



CREATE INDEX "idx_payment_splits_order_id" ON "public"."payment_splits" USING "btree" ("order_id");



CREATE INDEX "idx_payment_splits_session_id" ON "public"."payment_splits" USING "btree" ("session_id");



CREATE INDEX "idx_product_recipes_product" ON "public"."product_recipes" USING "btree" ("product_id");



CREATE INDEX "idx_product_recipes_recipe" ON "public"."product_recipes" USING "btree" ("recipe_id");



CREATE INDEX "idx_products_auto_disabled" ON "public"."products" USING "btree" ("auto_disabled") WHERE ("auto_disabled" = true);



CREATE INDEX "idx_products_product_type" ON "public"."products" USING "btree" ("product_type");



CREATE INDEX "idx_products_stock_tracking" ON "public"."products" USING "btree" ("stock_tracking_enabled") WHERE ("stock_tracking_enabled" = true);



CREATE INDEX "idx_products_type" ON "public"."products" USING "btree" ("product_type");



CREATE INDEX "idx_recipe_ingredients_ingredient" ON "public"."recipe_ingredients" USING "btree" ("ingredient_id");



CREATE INDEX "idx_recipe_ingredients_recipe" ON "public"."recipe_ingredients" USING "btree" ("recipe_id");



CREATE INDEX "idx_restaurant_tables_active" ON "public"."restaurant_tables" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_restaurant_tables_status" ON "public"."restaurant_tables" USING "btree" ("status") WHERE ("status" <> 'libre'::"text");



CREATE INDEX "idx_role_permissions_role" ON "public"."role_permissions" USING "btree" ("role_key");



CREATE INDEX "idx_stock_movements_created_at" ON "public"."stock_movements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_stock_movements_ingredient" ON "public"."stock_movements" USING "btree" ("ingredient_id") WHERE ("ingredient_id" IS NOT NULL);



CREATE INDEX "idx_stock_movements_order" ON "public"."stock_movements" USING "btree" ("order_id") WHERE ("order_id" IS NOT NULL);



CREATE INDEX "idx_stock_movements_product" ON "public"."stock_movements" USING "btree" ("product_id") WHERE ("product_id" IS NOT NULL);



CREATE INDEX "idx_stock_movements_type" ON "public"."stock_movements" USING "btree" ("movement_type");



CREATE UNIQUE INDEX "orders_idempotency_key_uniq" ON "public"."orders" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "print_jobs_created_at_idx" ON "public"."print_jobs" USING "btree" ("created_at");



CREATE INDEX "print_jobs_status_idx" ON "public"."print_jobs" USING "btree" ("status");



CREATE UNIQUE INDEX "uniq_orders_dia_numero" ON "public"."orders" USING "btree" ("order_day", "order_number") WHERE ("order_number" IS NOT NULL);



CREATE OR REPLACE TRIGGER "conversaciones_updated_at" BEFORE UPDATE ON "agent"."conversaciones" FOR EACH ROW EXECUTE FUNCTION "agent"."tocar_updated_at"();



CREATE OR REPLACE TRIGGER "orders_assign_number" BEFORE INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."assign_order_number"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_business_settings_updated_at" BEFORE UPDATE ON "public"."business_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "agent"."mensajes"
    ADD CONSTRAINT "mensajes_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "agent"."conversaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."cash_register_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_register_sessions"
    ADD CONSTRAINT "cash_register_sessions_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cash_register_sessions"
    ADD CONSTRAINT "cash_register_sessions_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."comanda_items"
    ADD CONSTRAINT "comanda_items_comanda_id_fkey" FOREIGN KEY ("comanda_id") REFERENCES "public"."comandas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comanda_items"
    ADD CONSTRAINT "comanda_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comandas"
    ADD CONSTRAINT "comandas_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "fk_product_type" FOREIGN KEY ("product_type") REFERENCES "public"."product_types"("type_key");



ALTER TABLE ONLY "public"."ingredient_sub_recipes"
    ADD CONSTRAINT "ingredient_sub_recipes_child_ingredient_id_fkey" FOREIGN KEY ("child_ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ingredient_sub_recipes"
    ADD CONSTRAINT "ingredient_sub_recipes_parent_ingredient_id_fkey" FOREIGN KEY ("parent_ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."ingredient_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_cash_register_session_id_fkey" FOREIGN KEY ("cash_register_session_id") REFERENCES "public"."cash_register_sessions"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_splits"
    ADD CONSTRAINT "payment_splits_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_splits"
    ADD CONSTRAINT "payment_splits_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."cash_register_sessions"("id");



ALTER TABLE ONLY "public"."product_half_configs"
    ADD CONSTRAINT "product_half_configs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_half_configs"
    ADD CONSTRAINT "product_half_configs_source_category_id_fkey" FOREIGN KEY ("source_category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."product_recipes"
    ADD CONSTRAINT "product_recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_recipes"
    ADD CONSTRAINT "product_recipes_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_role_fkey" FOREIGN KEY ("role") REFERENCES "public"."roles"("key") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_tables"
    ADD CONSTRAINT "restaurant_tables_current_order_id_fkey" FOREIGN KEY ("current_order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_key_fkey" FOREIGN KEY ("role_key") REFERENCES "public"."roles"("key") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE "agent"."conversaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "agent"."mensajes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin borra comanda items" ON "public"."comanda_items" FOR DELETE TO "authenticated" USING ("public"."puede_administrar"());



CREATE POLICY "admin borra comandas" ON "public"."comandas" FOR DELETE TO "authenticated" USING ("public"."puede_administrar"());



CREATE POLICY "admin borra mesas" ON "public"."restaurant_tables" FOR DELETE TO "authenticated" USING ("public"."puede_administrar"());



CREATE POLICY "admin borra pagos" ON "public"."payment_splits" FOR DELETE TO "authenticated" USING ("public"."puede_administrar"());



CREATE POLICY "admin borra pedidos" ON "public"."orders" FOR DELETE TO "authenticated" USING ("public"."puede_administrar"());



CREATE POLICY "admin borra stock" ON "public"."stock_movements" FOR DELETE TO "authenticated" USING ("public"."puede_administrar"());



CREATE POLICY "admin corrige movimientos" ON "public"."cash_movements" FOR UPDATE TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin corrige stock" ON "public"."stock_movements" FOR UPDATE TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin crea mesas" ON "public"."restaurant_tables" FOR INSERT TO "authenticated" WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin crea perfiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin edita perfiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin escribe ajustes" ON "public"."business_settings" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin escribe categorias" ON "public"."categories" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin escribe categorias insumo" ON "public"."ingredient_categories" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin escribe insumos" ON "public"."ingredients" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin escribe mitades" ON "public"."product_half_configs" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin escribe producto receta" ON "public"."product_recipes" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin escribe productos" ON "public"."products" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin escribe receta items" ON "public"."recipe_ingredients" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin escribe recetas" ON "public"."recipes" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin escribe sub recetas" ON "public"."ingredient_sub_recipes" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin escribe tipos" ON "public"."product_types" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin escribe zonas" ON "public"."delivery_zones" TO "authenticated" USING ("public"."puede_administrar"()) WITH CHECK ("public"."puede_administrar"());



CREATE POLICY "admin lee todos los perfiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "ajustes publicos" ON "public"."business_settings" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "bridge lee pendientes" ON "public"."print_jobs" FOR SELECT TO "anon" USING (("status" = 'pending'::"text"));



CREATE POLICY "bridge marca impreso" ON "public"."print_jobs" FOR UPDATE TO "anon" USING (true) WITH CHECK (("status" = ANY (ARRAY['printed'::"text", 'error'::"text"])));



ALTER TABLE "public"."business_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cash_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cash_register_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categorias insumo publicas" ON "public"."ingredient_categories" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "categorias publicas" ON "public"."categories" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comanda_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comandas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_zones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gestion escribe permisos" ON "public"."role_permissions" TO "authenticated" USING ("public"."has_permission"('roles.manage'::"text")) WITH CHECK ("public"."has_permission"('roles.manage'::"text"));



CREATE POLICY "gestion escribe roles" ON "public"."roles" TO "authenticated" USING ("public"."has_permission"('roles.manage'::"text")) WITH CHECK ("public"."has_permission"('roles.manage'::"text"));



ALTER TABLE "public"."ingredient_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingredient_sub_recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingredients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insumos legibles" ON "public"."ingredients" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "leer mi propio perfil" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "mitades publicas" ON "public"."product_half_configs" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "operacion abre turnos" ON "public"."cash_register_sessions" FOR INSERT TO "authenticated" WITH CHECK ("public"."puede_operar"());



CREATE POLICY "operacion actualiza items" ON "public"."order_items" FOR UPDATE TO "authenticated" USING ("public"."puede_operar"()) WITH CHECK ("public"."puede_operar"());



CREATE POLICY "operacion actualiza pedidos" ON "public"."orders" FOR UPDATE TO "authenticated" USING ("public"."puede_operar"()) WITH CHECK ("public"."puede_operar"());



CREATE POLICY "operacion borra items" ON "public"."order_items" FOR DELETE TO "authenticated" USING ("public"."puede_operar"());



CREATE POLICY "operacion cierra turnos" ON "public"."cash_register_sessions" FOR UPDATE TO "authenticated" USING ("public"."puede_operar"()) WITH CHECK ("public"."puede_operar"());



CREATE POLICY "operacion corrige pagos" ON "public"."payment_splits" FOR UPDATE TO "authenticated" USING ("public"."puede_operar"()) WITH CHECK ("public"."puede_operar"());



CREATE POLICY "operacion crea comanda items" ON "public"."comanda_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."puede_operar"());



CREATE POLICY "operacion crea comandas" ON "public"."comandas" FOR INSERT TO "authenticated" WITH CHECK ("public"."puede_operar"());



CREATE POLICY "operacion crea items" ON "public"."order_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."puede_operar"());



CREATE POLICY "operacion lee movimientos" ON "public"."cash_movements" FOR SELECT TO "authenticated" USING ("public"."puede_operar"());



CREATE POLICY "operacion lee pagos" ON "public"."payment_splits" FOR SELECT TO "authenticated" USING ("public"."puede_operar"());



CREATE POLICY "operacion lee stock" ON "public"."stock_movements" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "operacion lee turnos" ON "public"."cash_register_sessions" FOR SELECT TO "authenticated" USING ("public"."puede_operar"());



CREATE POLICY "operacion mueve mesas" ON "public"."restaurant_tables" FOR UPDATE TO "authenticated" USING ("public"."puede_operar"()) WITH CHECK ("public"."puede_operar"());



CREATE POLICY "operacion registra movimientos" ON "public"."cash_movements" FOR INSERT TO "authenticated" WITH CHECK ("public"."puede_operar"());



CREATE POLICY "operacion registra pagos" ON "public"."payment_splits" FOR INSERT TO "authenticated" WITH CHECK ("public"."puede_operar"());



CREATE POLICY "operacion registra stock" ON "public"."stock_movements" FOR INSERT TO "authenticated" WITH CHECK ("public"."puede_operar"());



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_number_counters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_splits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."print_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_half_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "producto receta publico" ON "public"."product_recipes" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "productos activos publicos" ON "public"."products" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "receta items publicos" ON "public"."recipe_ingredients" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "recetas activas publicas" ON "public"."recipes" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



ALTER TABLE "public"."recipe_ingredients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_tables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff actualiza comanda items" ON "public"."comanda_items" FOR UPDATE TO "authenticated" USING ("public"."ve_operacion"()) WITH CHECK ("public"."ve_operacion"());



CREATE POLICY "staff actualiza comandas" ON "public"."comandas" FOR UPDATE TO "authenticated" USING ("public"."ve_operacion"()) WITH CHECK ("public"."ve_operacion"());



CREATE POLICY "staff actualiza impresiones" ON "public"."print_jobs" FOR UPDATE TO "authenticated" USING ("public"."ve_operacion"()) WITH CHECK ("public"."ve_operacion"());



CREATE POLICY "staff encola impresiones" ON "public"."print_jobs" FOR INSERT TO "authenticated" WITH CHECK ("public"."ve_operacion"());



CREATE POLICY "staff lee comanda items" ON "public"."comanda_items" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "staff lee comandas" ON "public"."comandas" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "staff lee historial estado" ON "public"."order_status_history" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "staff lee impresiones" ON "public"."print_jobs" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "staff lee items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "staff lee pedidos" ON "public"."orders" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "staff lee permisos" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "staff lee roles" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "staff ve mesas" ON "public"."restaurant_tables" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "staff ve todas las recetas" ON "public"."recipes" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "staff ve todas las zonas" ON "public"."delivery_zones" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "staff ve todos los productos" ON "public"."products" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sub recetas legibles" ON "public"."ingredient_sub_recipes" FOR SELECT TO "authenticated" USING ("public"."ve_operacion"());



CREATE POLICY "tipos publicos" ON "public"."product_types" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "web crea pedidos" ON "public"."orders" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "web escribe historial estado" ON "public"."order_status_history" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "zonas activas publicas" ON "public"."delivery_zones" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."comandas";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."order_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."print_jobs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."restaurant_tables";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."agregar_items_al_pedido"("p_order_id" "uuid", "p_items" "jsonb", "p_sale_tag" "text", "p_added_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."agregar_items_al_pedido"("p_order_id" "uuid", "p_items" "jsonb", "p_sale_tag" "text", "p_added_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."aplicar_movimientos_de_stock"("p_order_id" "uuid", "p_movimientos" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."aplicar_movimientos_de_stock"("p_order_id" "uuid", "p_movimientos" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."aplicar_movimientos_de_stock"("p_order_id" "uuid", "p_movimientos" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_order_number"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_order_number"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cobrar_pedido_de_mostrador"("p_order_id" "uuid", "p_session_id" "uuid", "p_payment_method" "text", "p_splits" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cobrar_pedido_de_mostrador"("p_order_id" "uuid", "p_session_id" "uuid", "p_payment_method" "text", "p_splits" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."crear_pedido_de_mostrador"("p_session_id" "uuid", "p_items" "jsonb", "p_total" numeric, "p_notes" "text", "p_shipping_cost" numeric, "p_delivery_zone_id" "uuid", "p_added_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."crear_pedido_de_mostrador"("p_session_id" "uuid", "p_items" "jsonb", "p_total" numeric, "p_notes" "text", "p_shipping_cost" numeric, "p_delivery_zone_id" "uuid", "p_added_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_pedido_de_mostrador"("p_session_id" "uuid", "p_items" "jsonb", "p_total" numeric, "p_notes" "text", "p_shipping_cost" numeric, "p_delivery_zone_id" "uuid", "p_added_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."crear_pedido_remoto"("p_customer_name" "text", "p_customer_phone" "text", "p_customer_address" "text", "p_items" "jsonb", "p_total" numeric, "p_payment_method" "text", "p_order_source" "text", "p_customer_coordinates" "jsonb", "p_shipping_cost" numeric, "p_delivery_zone_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."crear_pedido_remoto"("p_customer_name" "text", "p_customer_phone" "text", "p_customer_address" "text", "p_items" "jsonb", "p_total" numeric, "p_payment_method" "text", "p_order_source" "text", "p_customer_coordinates" "jsonb", "p_shipping_cost" numeric, "p_delivery_zone_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_pedido_remoto"("p_customer_name" "text", "p_customer_phone" "text", "p_customer_address" "text", "p_items" "jsonb", "p_total" numeric, "p_payment_method" "text", "p_order_source" "text", "p_customer_coordinates" "jsonb", "p_shipping_cost" numeric, "p_delivery_zone_id" "uuid", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_permission"("perm" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_permission"("perm" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("perm" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_field"("table_name" "text", "row_id" "uuid", "field_name" "text", "increment_value" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_field"("table_name" "text", "row_id" "uuid", "field_name" "text", "increment_value" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_field"("table_name" "text", "row_id" "uuid", "field_name" "text", "increment_value" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."marcar_print_job"("p_id" "uuid", "p_status" "text", "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."marcar_print_job"("p_id" "uuid", "p_status" "text", "p_error" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."marcar_print_job"("p_id" "uuid", "p_status" "text", "p_error" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."marcar_print_job"("p_id" "uuid", "p_status" "text", "p_error" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pagar_pedido_de_mesa"("p_order_id" "uuid", "p_table_id" "uuid", "p_session_id" "uuid", "p_payment_method" "text", "p_splits" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pagar_pedido_de_mesa"("p_order_id" "uuid", "p_table_id" "uuid", "p_session_id" "uuid", "p_payment_method" "text", "p_splits" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."puede_administrar"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."puede_administrar"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."puede_administrar"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."puede_operar"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."puede_operar"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."puede_operar"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reiniciar_control_de_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."reiniciar_control_de_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reiniciar_control_de_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."revertir_movimientos_de_stock"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revertir_movimientos_de_stock"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revertir_movimientos_de_stock"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."toggle_order_sale_tag"("p_order_id" "uuid", "p_tag" "text", "p_agregar" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."toggle_order_sale_tag"("p_order_id" "uuid", "p_tag" "text", "p_agregar" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."toggle_order_sale_tag"("p_order_id" "uuid", "p_tag" "text", "p_agregar" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ve_operacion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ve_operacion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ve_operacion"() TO "service_role";


















GRANT ALL ON TABLE "public"."business_settings" TO "anon";
GRANT ALL ON TABLE "public"."business_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."business_settings" TO "service_role";



GRANT ALL ON TABLE "public"."cash_movements" TO "anon";
GRANT ALL ON TABLE "public"."cash_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_movements" TO "service_role";



GRANT ALL ON TABLE "public"."cash_register_sessions" TO "anon";
GRANT ALL ON TABLE "public"."cash_register_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_register_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."comanda_items" TO "anon";
GRANT ALL ON TABLE "public"."comanda_items" TO "authenticated";
GRANT ALL ON TABLE "public"."comanda_items" TO "service_role";



GRANT ALL ON TABLE "public"."comandas" TO "anon";
GRANT ALL ON TABLE "public"."comandas" TO "authenticated";
GRANT ALL ON TABLE "public"."comandas" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_zones" TO "anon";
GRANT ALL ON TABLE "public"."delivery_zones" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_zones" TO "service_role";



GRANT ALL ON TABLE "public"."ingredient_categories" TO "anon";
GRANT ALL ON TABLE "public"."ingredient_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredient_categories" TO "service_role";



GRANT ALL ON TABLE "public"."ingredient_sub_recipes" TO "anon";
GRANT ALL ON TABLE "public"."ingredient_sub_recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredient_sub_recipes" TO "service_role";



GRANT ALL ON TABLE "public"."ingredients" TO "anon";
GRANT ALL ON TABLE "public"."ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_number_counters" TO "anon";
GRANT ALL ON TABLE "public"."order_number_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."order_number_counters" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_splits" TO "anon";
GRANT ALL ON TABLE "public"."payment_splits" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_splits" TO "service_role";



GRANT ALL ON TABLE "public"."print_jobs" TO "anon";
GRANT ALL ON TABLE "public"."print_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."print_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."product_half_configs" TO "anon";
GRANT ALL ON TABLE "public"."product_half_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."product_half_configs" TO "service_role";



GRANT ALL ON TABLE "public"."product_recipes" TO "anon";
GRANT ALL ON TABLE "public"."product_recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."product_recipes" TO "service_role";



GRANT ALL ON TABLE "public"."product_types" TO "anon";
GRANT ALL ON TABLE "public"."product_types" TO "authenticated";
GRANT ALL ON TABLE "public"."product_types" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."recipe_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_tables" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_tables" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_tables" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































