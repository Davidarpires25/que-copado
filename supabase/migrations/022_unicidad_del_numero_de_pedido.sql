-- El numero de pedido se reinicia cada dia, asi que "unico" para el es unico
-- DENTRO del dia. En 021 eso lo garantizaba solamente la logica del trigger; la
-- base aceptaba duplicados sin chistar. Un INSERT que trajera su propio
-- order_number, o un UPDATE a mano, podia dejar dos "#3" el mismo dia y nadie
-- se enteraba hasta que dos clientes reclamaran el mismo pedido.
--
-- La fecha se guarda en una columna en vez de calcularse en el indice porque
-- `created_at AT TIME ZONE ...` es STABLE y no IMMUTABLE: Postgres no la acepta
-- ni en un indice de expresion ni en una columna generada.

alter table public.orders add column if not exists order_day date;

update public.orders
   set order_day = (created_at at time zone 'America/Argentina/Buenos_Aires')::date
 where order_day is null;

create or replace function public.assign_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- La red de seguridad: a partir de aca la base rechaza el duplicado.
create unique index if not exists uniq_orders_dia_numero
  on public.orders (order_day, order_number)
  where order_number is not null;
