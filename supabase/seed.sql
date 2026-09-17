-- Datos de prueba para la base local. Corre solo con cada `supabase db reset`.
--
-- Dos clases de datos conviven acá, y la diferencia importa:
--
--   CONFIGURACIÓN — roles, permisos, tipos de producto. Es una copia de lo que
--   hay en producción porque el sistema no funciona sin eso: un admin sin filas
--   en `role_permissions` inicia sesión y no puede abrir nada.
--
--   NEGOCIO — productos, ingredientes, recetas, zonas, mesas. Está inventado a
--   propósito. Datos reales de clientes en una base de desarrollo es un problema
--   que no queremos, y para probar el POS no hacen falta.
--
-- Nada de esto llega nunca a producción: vive en el flujo local del CLI.

begin;

-- ─── Configuración: roles y permisos ────────────────────────────────────────

insert into roles (key, name, description, is_system, sort_order) values
  ('admin',  'Administrador', 'Acceso total. No se puede editar ni eliminar.', true, 1),
  ('cajero', 'Cajero',        'Opera la caja, cobra y cierra el turno.',       true, 2),
  ('cocina', 'Cocina',        'Solo la pantalla de comandas.',                 true, 3)
on conflict (key) do nothing;

insert into role_permissions (role_key, permission)
select 'admin', p from unnest(array[
  'analytics.view','caja.manage','caja.view','categorias.manage','categorias.view',
  'cocina.manage','cocina.view','dashboard.view','delivery_zones.manage',
  'delivery_zones.view','ingredientes.manage','ingredientes.view','mesas.manage',
  'mesas.view','pedidos.manage','pedidos.view','productos.manage','productos.view',
  'recetas.manage','recetas.view','roles.manage','settings.manage','settings.view',
  'stock.manage','stock.view','users.manage','users.view'
]) p
union all select 'cajero', p from unnest(array[
  'caja.manage','caja.view','categorias.view','cocina.view','mesas.manage',
  'mesas.view','pedidos.manage','pedidos.view','productos.view'
]) p
union all select 'cocina', p from unnest(array[
  'cocina.manage','cocina.view','pedidos.view','productos.view'
]) p
on conflict do nothing;

insert into product_types (type_key, label, description, sends_to_kitchen, uses_recipes) values
  ('elaborado', 'Elaborado',     'Se prepara en cocina con receta',      true,  true),
  ('reventa',   'Reventa',       'Producto de reventa directo',          false, false),
  ('mitad',     'Mitad y Mitad', 'Pizza con selección de 2 mitades',     true,  false)
on conflict (type_key) do nothing;

-- ─── El negocio, abierto ────────────────────────────────────────────────────

-- El id es fijo: el código lo busca por esa constante.
-- Abierto de 00:00 a 23:59 todos los días para que probar no dependa de la hora.
insert into business_settings (
  id, operating_days, opening_time, closing_time, is_paused,
  transfer_alias, transfer_cbu, transfer_titular
) values (
  '00000000-0000-0000-0000-000000000001', '{0,1,2,3,4,5,6}', '00:00', '23:59', false,
  'prueba.local.mp', '0000003100010000000001', 'Local De Prueba SRL'
)
on conflict (id) do update set
  operating_days = excluded.operating_days,
  opening_time   = excluded.opening_time,
  closing_time   = excluded.closing_time,
  is_paused      = excluded.is_paused;

-- ─── Usuario de prueba ──────────────────────────────────────────────────────

-- prueba@local.test / prueba1234
--
-- Credenciales fijas y escritas acá a propósito: esta base es descartable y vive
-- en localhost. No sirven contra ninguna otra.
--
-- El perfil lo crea el trigger `on_auth_user_created`; después se le pone el rol
-- de admin, porque el trigger asigna el que tenga por defecto.
--
-- Las columnas de token van en cadena vacia y no en NULL: el servicio de auth
-- las lee como texto y con NULL falla el login entero con un 500 opaco
-- ("Database error querying schema"). Es el precio de crear el usuario por SQL
-- en vez de por la API, y se paga una sola vez aca.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'prueba@local.test',
  extensions.crypt('prueba1234', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin de Prueba"}',
  '', '', '', '', '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"prueba@local.test","email_verified":true}',
  'email', now(), now(), now()
)
on conflict (provider, provider_id) do nothing;

insert into profiles (id, full_name, role, is_active)
values ('11111111-1111-1111-1111-111111111111', 'Admin de Prueba', 'admin', true)
on conflict (id) do update set role = 'admin', is_active = true;

-- ─── Catálogo ───────────────────────────────────────────────────────────────

insert into categories (id, name, slug, sort_order, color) values
  ('c0000000-0000-0000-0000-000000000001', 'Hamburguesas', 'hamburguesas', 1, '#FEC501'),
  ('c0000000-0000-0000-0000-000000000002', 'Guarniciones',  'guarniciones', 2, '#E5B001'),
  ('c0000000-0000-0000-0000-000000000003', 'Bebidas',       'bebidas',      3, '#7FB3D5')
on conflict (id) do nothing;

insert into ingredient_categories (id, name) values
  ('d0000000-0000-0000-0000-000000000001', 'Carnes'),
  ('d0000000-0000-0000-0000-000000000002', 'Panificados'),
  ('d0000000-0000-0000-0000-000000000003', 'Lácteos'),
  ('d0000000-0000-0000-0000-000000000004', 'Verduras')
on conflict (id) do nothing;

-- Stock cargado y con seguimiento activo: es lo que permite probar que una
-- compra suma, que una venta descuenta y que un elaborado se apaga al agotarse.
insert into ingredients (
  id, name, unit, cost_per_unit, current_stock, min_stock,
  stock_tracking_enabled, waste_percentage, is_active, category_id
) values
  ('e0000000-0000-0000-0000-000000000001', 'Medallón de carne', 'unidad', 1200, 40, 10, true, 0,  true, 'd0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000002', 'Pan de papa',       'unidad',  450, 40, 10, true, 0,  true, 'd0000000-0000-0000-0000-000000000002'),
  ('e0000000-0000-0000-0000-000000000003', 'Cheddar',           'kg',     9000,  3,  1, true, 5,  true, 'd0000000-0000-0000-0000-000000000003'),
  ('e0000000-0000-0000-0000-000000000004', 'Papa',              'kg',     1100, 20,  5, true, 15, true, 'd0000000-0000-0000-0000-000000000004'),
  ('e0000000-0000-0000-0000-000000000005', 'Lechuga',           'kg',     2500,  2,  1, true, 20, true, 'd0000000-0000-0000-0000-000000000004')
on conflict (id) do nothing;

insert into recipes (id, name, description, is_active) values
  ('f0000000-0000-0000-0000-000000000001', 'Hamburguesa simple', 'Pan, medallón y cheddar', true),
  ('f0000000-0000-0000-0000-000000000002', 'Porción de papas',   'Papas fritas',            true)
on conflict (id) do nothing;

insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit) values
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 1,    'unidad'),
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 1,    'unidad'),
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 0.04, 'kg'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', 0.25, 'kg')
on conflict do nothing;

insert into products (
  id, name, description, price, cost, category_id, product_type, station,
  is_active, is_out_of_stock, stock_tracking_enabled, current_stock
) values
  ('a0000000-0000-0000-0000-000000000001', 'Hamburguesa simple', 'Medallón, cheddar y pan de papa', 8000,  2000, 'c0000000-0000-0000-0000-000000000001', 'elaborado', 'cocina', true, false, false, 0),
  ('a0000000-0000-0000-0000-000000000002', 'Papas fritas',        'Porción grande',                 5000,   300, 'c0000000-0000-0000-0000-000000000002', 'elaborado', 'cocina', true, false, false, 0),
  ('a0000000-0000-0000-0000-000000000003', 'Gaseosa 500ml',       'Línea Coca-Cola',                3000,  1500, 'c0000000-0000-0000-0000-000000000003', 'reventa',   null,     true, false, true,  24)
on conflict (id) do nothing;

insert into product_recipes (product_id, recipe_id, quantity) values
  ('a0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 1),
  ('a0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 1)
on conflict do nothing;

-- ─── Reparto y salón ────────────────────────────────────────────────────────

-- Dos zonas que comparten un borde, como las reales: sirve para probar que el
-- cálculo elige la correcta y qué pasa con una dirección justo en el límite.
insert into delivery_zones (
  id, name, zone_type, polygon, shipping_cost, free_shipping_threshold,
  color, is_active, sort_order
) values
  ('b0000000-0000-0000-0000-000000000001', 'Zona centro', 'polygon',
   '{"type":"Polygon","coordinates":[[[-65.80,-28.47],[-65.76,-28.47],[-65.76,-28.45],[-65.80,-28.45],[-65.80,-28.47]]]}',
   3000, 15000, '#FEC501', true, 1),
  ('b0000000-0000-0000-0000-000000000002', 'Zona norte', 'polygon',
   '{"type":"Polygon","coordinates":[[[-65.80,-28.45],[-65.76,-28.45],[-65.76,-28.43],[-65.80,-28.43],[-65.80,-28.45]]]}',
   2000, 15000, '#7FB3D5', true, 2)
on conflict (id) do nothing;

insert into restaurant_tables (number, label, capacity, section, status, is_active, sort_order) values
  (1, 'Mesa 1', 4, 'salon',   'libre', true, 1),
  (2, 'Mesa 2', 2, 'salon',   'libre', true, 2),
  (3, 'Mesa 3', 6, 'salon',   'libre', true, 3),
  (4, 'Vereda 1', 4, 'vereda', 'libre', true, 4)
on conflict do nothing;

commit;
