-- Cuatro pantallas se suscriben a cambios en tiempo real —la caja, la tabla de
-- pedidos, el mapa de mesas y la pantalla de cocina— pero ninguna de las tablas
-- que escuchan estaba en la publicacion `supabase_realtime`, que solo tenia
-- print_jobs. O sea que las suscripciones existian y no disparaban nunca:
-- codigo muerto que parecia funcionalidad. Nada se actualizaba sin refrescar
-- la pagina a mano, ni siquiera la pantalla de cocina.

do $$
declare
  t text;
begin
  foreach t in array array['orders', 'order_items', 'restaurant_tables', 'comandas']
  loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- REPLICA IDENTITY FULL: sin esto, en UPDATE y DELETE el WAL solo lleva la
-- clave primaria. Realtime necesita la fila completa para dos cosas que este
-- proyecto usa: evaluar las policies de RLS sobre el registro viejo, y aplicar
-- filtros por columna (la caja se suscribe filtrando por
-- cash_register_session_id). Sin la fila entera esos eventos se descartan en
-- silencio.
--
-- Cuesta mas WAL por escritura. Con el volumen de un local es irrelevante.
alter table public.orders            replica identity full;
alter table public.order_items       replica identity full;
alter table public.restaurant_tables replica identity full;
alter table public.comandas          replica identity full;
