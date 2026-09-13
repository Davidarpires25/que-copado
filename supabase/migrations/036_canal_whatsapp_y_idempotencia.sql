-- El agente de WhatsApp crea pedidos por HTTP, y eso pide dos cosas de la tabla
-- `orders` que hoy no estan.
--
-- Primero, un origen propio. Sin el, los pedidos del agente serian
-- indistinguibles de los de la web y no habria forma de medir el canal, que es
-- justo lo que hay que poder mostrar para saber si el agente sirve.
--
-- Segundo, idempotencia. WhatsApp reentrega webhooks y el agente reintenta ante
-- un timeout sin saber si el pedido llego a crearse. Sin una clave, cada
-- reintento es un pedido duplicado en cocina.
--
-- Ojo: `order_source` y `order_type` no fueron creadas por ninguna migracion de
-- este repo —se agregaron a mano en el dashboard—, asi que aca no se puede
-- asumir ni el nombre ni la existencia de su CHECK. Por eso el bloque de abajo
-- busca la constraint en el catalogo en vez de nombrarla.

-- 1. Origen del pedido: se suma 'whatsapp' a los valores aceptados.
--
-- Se eliminan TODAS las check constraints que mencionen order_source antes de
-- crear la nueva. Nombrar una a mano y errarle dejaria la vieja en pie: los
-- INSERT con 'whatsapp' seguirian fallando y el sintoma —una constraint que no
-- aparece en ninguna migracion -- seria dificil de rastrear.
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'orders'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%order_source%'
  loop
    execute format('alter table public.orders drop constraint %I', c.conname);
    raise notice 'Eliminada constraint previa sobre order_source: %', c.conname;
  end loop;
end $$;

alter table public.orders
  add constraint orders_order_source_check
  check (order_source in ('web', 'pos', 'whatsapp'));

comment on column public.orders.order_source is
  'Canal de origen: web (checkout publico), pos (mostrador o mesa), whatsapp (agente).';

-- 2. Idempotencia en la creacion de pedidos.
alter table public.orders
  add column if not exists idempotency_key       text,
  add column if not exists idempotency_body_hash text;

-- El indice es parcial a proposito. Todos los pedidos web y de mostrador dejan
-- la clave nula, y un unique total los haria colisionar entre si.
create unique index if not exists orders_idempotency_key_uniq
  on public.orders (idempotency_key)
  where idempotency_key is not null;

comment on column public.orders.idempotency_key is
  'Clave de idempotencia del canal WhatsApp. Nula para pedidos web y de mostrador.';
comment on column public.orders.idempotency_body_hash is
  'Hash del cuerpo del request que creo el pedido. Permite distinguir un reintento '
  'legitimo de una reutilizacion de la clave con datos distintos.';

notify pgrst, 'reload schema';
