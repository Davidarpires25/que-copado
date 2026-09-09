-- Fase 2: Politicas RLS por rol
-- Ejecutar en Supabase Dashboard > SQL Editor, DESPUES de 016.
--
-- Hasta ahora todas las politicas de escritura decian `TO authenticated
-- USING (true)`: cualquier usuario logueado podia borrar productos, cambiar
-- precios y modificar arqueos cerrados. Esta migracion es la que hace que
-- entregarle un login a un empleado sea seguro.
--
-- ANTES DE EJECUTAR, mira como esta hoy tu base. Las migraciones del repo
-- arrancan en "actualizar tabla orders", asi que el esquema base se creo por
-- fuera y puede haber politicas hechas desde el dashboard que no figuran aca:
--
--   SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname = 'public' ORDER BY tablename;
--
--   SELECT tablename, policyname, cmd, roles
--     FROM pg_policies WHERE schemaname = 'public'
--    ORDER BY tablename, policyname;
--
-- Si aparece alguna politica que este archivo no contempla, avisame antes de
-- seguir: no quiero pisar algo que no vi.

-- Todo en una transaccion: si algo falla, no queda a medio camino. Sin esto, un
-- error entre el DROP de las politicas viejas y el CREATE de las nuevas dejaria
-- las tablas con RLS activo y sin ninguna politica, o sea la tienda publica sin
-- poder mostrar productos ni tomar pedidos.
BEGIN;

-- ============================================================================
-- 0. Helpers de legibilidad
-- ============================================================================
-- Quien puede operar el local: tomar pedidos, cobrar, mover la caja.
CREATE OR REPLACE FUNCTION puede_operar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth_role() IN ('admin', 'cajero')
$$;

-- Quien puede administrar el catalogo y la configuracion.
CREATE OR REPLACE FUNCTION puede_administrar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth_role() = 'admin'
$$;

CREATE OR REPLACE FUNCTION es_cocina()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth_role() = 'cocina'
$$;

-- ============================================================================
-- 1. Habilitar RLS en todo (idempotente)
-- ============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'business_settings','cash_movements','cash_register_sessions','categories',
    'comanda_items','comandas','delivery_zones','ingredient_categories',
    'ingredients','order_items','orders','payment_splits','product_half_configs',
    'product_recipes','product_types','products','recipe_ingredients','recipes',
    'restaurant_tables','stock_movements'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 2. Borrar las politicas viejas
-- ============================================================================
-- Se borran TODAS las de las tablas de dominio y se reemplazan mas abajo.
-- `profiles` queda afuera a proposito: sus politicas son las de la 016.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename <> 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- 3. Catalogo publico — lo lee cualquiera, lo edita solo el admin
-- ============================================================================
-- La tienda publica necesita leer sin sesion.

CREATE POLICY "catalogo visible" ON products
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin edita productos" ON products
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "categorias visibles" ON categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin edita categorias" ON categories
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "tipos visibles" ON product_types
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin edita tipos" ON product_types
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "mitades visibles" ON product_half_configs
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin edita mitades" ON product_half_configs
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "zonas visibles" ON delivery_zones
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin edita zonas" ON delivery_zones
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "ajustes visibles" ON business_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin edita ajustes" ON business_settings
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

-- ============================================================================
-- 4. Recetas, ingredientes y costos
-- ============================================================================
-- Escritura solo admin. La lectura queda para cualquier usuario autenticado
-- porque el descuento de stock al vender resuelve recetas en el server con la
-- sesion del cajero: si se la cerramos, no se puede cobrar.
--
-- Consecuencia asumida: un cajero decidido podria leer los costos por la API
-- aunque la interfaz no se los muestre. Se prefirio eso antes que mover el
-- camino caliente de la venta a la clave de servicio, que es peor.

CREATE POLICY "recetas legibles" ON recipes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin edita recetas" ON recipes
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "receta items legibles" ON recipe_ingredients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin edita receta items" ON recipe_ingredients
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "producto receta legible" ON product_recipes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin edita producto receta" ON product_recipes
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "ingredientes legibles" ON ingredients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin edita ingredientes" ON ingredients
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "categorias ingr legibles" ON ingredient_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin edita categorias ingr" ON ingredient_categories
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

-- ============================================================================
-- 5. Operacion — pedidos, mesas y comandas
-- ============================================================================
-- La tienda publica crea pedidos sin sesion, asi que anon conserva el INSERT.

CREATE POLICY "web crea pedidos" ON orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "operacion lee pedidos" ON orders
  FOR SELECT TO authenticated USING (puede_operar() OR es_cocina());
CREATE POLICY "operacion actualiza pedidos" ON orders
  FOR UPDATE TO authenticated USING (puede_operar()) WITH CHECK (puede_operar());
-- Anular es un UPDATE de estado, no un DELETE: borrar una venta se lleva
-- puesta la trazabilidad del turno.
CREATE POLICY "admin borra pedidos" ON orders
  FOR DELETE TO authenticated USING (puede_administrar());

CREATE POLICY "web crea items" ON order_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "operacion lee items" ON order_items
  FOR SELECT TO authenticated USING (puede_operar() OR es_cocina());
CREATE POLICY "operacion actualiza items" ON order_items
  FOR UPDATE TO authenticated USING (puede_operar()) WITH CHECK (puede_operar());
CREATE POLICY "operacion borra items" ON order_items
  FOR DELETE TO authenticated USING (puede_operar());

CREATE POLICY "operacion ve mesas" ON restaurant_tables
  FOR SELECT TO authenticated USING (puede_operar() OR es_cocina());
CREATE POLICY "operacion mueve mesas" ON restaurant_tables
  FOR UPDATE TO authenticated USING (puede_operar()) WITH CHECK (puede_operar());
CREATE POLICY "admin configura mesas" ON restaurant_tables
  FOR INSERT TO authenticated WITH CHECK (puede_administrar());
CREATE POLICY "admin borra mesas" ON restaurant_tables
  FOR DELETE TO authenticated USING (puede_administrar());

-- Cocina: lee las comandas y marca items como listos. Nada mas.
CREATE POLICY "cocina y operacion leen comandas" ON comandas
  FOR SELECT TO authenticated USING (puede_operar() OR es_cocina());
CREATE POLICY "operacion crea comandas" ON comandas
  FOR INSERT TO authenticated WITH CHECK (puede_operar());
CREATE POLICY "cocina y operacion actualizan comandas" ON comandas
  FOR UPDATE TO authenticated USING (puede_operar() OR es_cocina())
  WITH CHECK (puede_operar() OR es_cocina());
CREATE POLICY "admin borra comandas" ON comandas
  FOR DELETE TO authenticated USING (puede_administrar());

CREATE POLICY "cocina y operacion leen comanda items" ON comanda_items
  FOR SELECT TO authenticated USING (puede_operar() OR es_cocina());
CREATE POLICY "operacion crea comanda items" ON comanda_items
  FOR INSERT TO authenticated WITH CHECK (puede_operar());
CREATE POLICY "cocina y operacion actualizan comanda items" ON comanda_items
  FOR UPDATE TO authenticated USING (puede_operar() OR es_cocina())
  WITH CHECK (puede_operar() OR es_cocina());
CREATE POLICY "admin borra comanda items" ON comanda_items
  FOR DELETE TO authenticated USING (puede_administrar());

-- ============================================================================
-- 6. Caja
-- ============================================================================
-- Un cajero abre y cierra su turno y registra movimientos. Cocina no entra.
-- Nadie borra: un arqueo borrado es un arqueo que nunca paso.

CREATE POLICY "operacion lee turnos" ON cash_register_sessions
  FOR SELECT TO authenticated USING (puede_operar());
CREATE POLICY "operacion abre turnos" ON cash_register_sessions
  FOR INSERT TO authenticated WITH CHECK (puede_operar());
CREATE POLICY "operacion cierra turnos" ON cash_register_sessions
  FOR UPDATE TO authenticated USING (puede_operar()) WITH CHECK (puede_operar());

CREATE POLICY "operacion lee movimientos" ON cash_movements
  FOR SELECT TO authenticated USING (puede_operar());
CREATE POLICY "operacion registra movimientos" ON cash_movements
  FOR INSERT TO authenticated WITH CHECK (puede_operar());
CREATE POLICY "admin corrige movimientos" ON cash_movements
  FOR UPDATE TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "operacion lee pagos" ON payment_splits
  FOR SELECT TO authenticated USING (puede_operar());
CREATE POLICY "operacion registra pagos" ON payment_splits
  FOR INSERT TO authenticated WITH CHECK (puede_operar());
CREATE POLICY "operacion corrige pagos" ON payment_splits
  FOR UPDATE TO authenticated USING (puede_operar()) WITH CHECK (puede_operar());
CREATE POLICY "admin borra pagos" ON payment_splits
  FOR DELETE TO authenticated USING (puede_administrar());

-- ============================================================================
-- 7. Stock
-- ============================================================================
-- La venta descuenta stock, asi que el cajero necesita INSERT. Los ajustes
-- manuales y las compras son del admin, pero eso se distingue por el tipo de
-- movimiento y se controla en la server action: RLS no puede mirar el `type`
-- sin volverse ilegible.

CREATE POLICY "operacion lee stock" ON stock_movements
  FOR SELECT TO authenticated USING (puede_operar());
CREATE POLICY "operacion registra stock" ON stock_movements
  FOR INSERT TO authenticated WITH CHECK (puede_operar());
CREATE POLICY "admin corrige stock" ON stock_movements
  FOR UPDATE TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());
CREATE POLICY "admin borra stock" ON stock_movements
  FOR DELETE TO authenticated USING (puede_administrar());

COMMIT;

-- ============================================================================
-- Verificacion
-- ============================================================================
-- 1) Todas las tablas del dominio con RLS en true:
--
--   SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname='public' AND rowsecurity = false;
--   -- no deberia devolver ninguna
--
-- 2) Ninguna politica con USING (true) para authenticated en escritura:
--
--   SELECT tablename, policyname, cmd, qual
--     FROM pg_policies
--    WHERE schemaname='public' AND cmd <> 'SELECT'
--      AND qual = 'true' AND 'authenticated' = ANY(roles);
--   -- solo deberian aparecer los INSERT de orders y order_items,
--   -- que son los del checkout publico
--
-- 3) Tu propio rol:
--
--   SELECT auth_role();  -- tiene que decir 'admin'
