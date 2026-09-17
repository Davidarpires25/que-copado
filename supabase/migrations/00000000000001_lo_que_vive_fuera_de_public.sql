-- La linea base se volco del esquema `public`, que es donde vive casi todo. Casi.
--
-- Al comparar el esquema local contra produccion aparecieron dos objetos que
-- quedaron afuera del volcado y sin los cuales el sistema no funciona igual:
--
--   1. El trigger que crea el perfil cuando nace un usuario. Vive sobre
--      `auth.users`, no sobre `public`. Sin el, un usuario nuevo entra sin fila
--      en `profiles`, o sea sin rol y sin permisos: puede iniciar sesion y no
--      puede hacer nada.
--
--   2. El bucket de imagenes de producto. Sin el, subir una foto falla.
--
-- Van en su propia migracion y no dentro del volcado porque el volcado se
-- regenera: si algun dia se rehace la linea base, esto sigue existiendo aparte.

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- `public=true`: el catalogo lo lee cualquiera sin sesion.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
