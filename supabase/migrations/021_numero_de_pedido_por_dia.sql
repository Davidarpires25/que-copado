-- Numero de pedido legible, reiniciado cada dia.
--
-- Hasta ahora el identificador visible era el UUID cortado, y estaba cortado a
-- cuatro largos distintos segun la pantalla: slice(-4) en caja, slice(-6) en la
-- comanda de cocina, slice(-8) en el ticket fisico y slice(0,8) en la tabla de
-- pedidos y en el mensaje de WhatsApp que se lleva el cliente. El mismo pedido
-- se llamaba #5322, #9A5322, #E49A5322 y #1ACCCBC5 al mismo tiempo.
--
-- Ademas no era secuencial (en la tira de pendientes no se sabia cual entro
-- primero), era hexadecimal (hay que deletrearlo) y con cuatro caracteres se
-- repite.

create table if not exists public.order_number_counters (
  day          date primary key,
  last_number  int  not null default 0
);

-- Solo la funcion de abajo la toca, y lo hace como definer.
alter table public.order_number_counters enable row level security;

alter table public.orders add column if not exists order_number int;

-- El upsert con RETURNING es atomico: dos pedidos simultaneos no pueden
-- llevarse el mismo numero.
create or replace function public.assign_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d date;
begin
  if new.order_number is not null then
    return new;
  end if;

  d := (coalesce(new.created_at, now()) at time zone 'America/Argentina/Buenos_Aires')::date;

  insert into public.order_number_counters as c (day, last_number)
       values (d, 1)
  on conflict (day) do update set last_number = c.last_number + 1
    returning c.last_number into new.order_number;

  return new;
end;
$$;

drop trigger if exists orders_assign_number on public.orders;
create trigger orders_assign_number
  before insert on public.orders
  for each row execute function public.assign_order_number();

-- Backfill: los pedidos que ya existen tambien necesitan numero, si no el
-- historial queda mudo.
with numerados as (
  select id,
         row_number() over (
           partition by (created_at at time zone 'America/Argentina/Buenos_Aires')::date
           order by created_at, id
         ) as n
  from public.orders
  where order_number is null
)
update public.orders o
   set order_number = numerados.n
  from numerados
 where o.id = numerados.id;

-- Y el contador arranca donde termino el backfill.
insert into public.order_number_counters (day, last_number)
select (created_at at time zone 'America/Argentina/Buenos_Aires')::date,
       max(order_number)
  from public.orders
 where order_number is not null
 group by 1
on conflict (day) do update
  set last_number = greatest(order_number_counters.last_number, excluded.last_number);

create index if not exists idx_orders_order_number on public.orders (order_number);
