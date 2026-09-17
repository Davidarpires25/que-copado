-- Fase 2: Politicas RLS por rol
-- Ejecutar DESPUES de 016.
--
-- Hasta ahora toda politica de escritura decia `USING (true)` para cualquier
-- autenticado: un empleado con login podia borrar productos, cambiar precios y
-- modificar arqueos cerrados. Esta migracion es la que hace que entregar un
-- login sea seguro.
--
-- ESCRITA CONTRA EL ESTADO REAL DE LA BASE, no contra las migraciones del repo.
-- El esquema base se creo desde el dashboard, asi que habia tablas y politicas
-- que no figuraban en ningun archivo. En particular se preserva, tal cual esta
-- hoy, TODO el acceso anonimo:
--
--   products          SELECT  is_active = true      <- la tienda publica
--   delivery_zones    SELECT  is_active = true
--   recipes           SELECT  is_active = true
--   categories        SELECT  true
--   product_types     SELECT  true
--   product_half_configs / product_recipes / recipe_ingredients  SELECT true
--   ingredient_categories  SELECT true
--   business_settings SELECT  true
--   orders            INSERT                        <- el checkout web
--   print_jobs        SELECT status='pending' y UPDATE a printed/error
--                                                   <- el print-bridge, que
--                                                      corre con la anon key
--
-- Tocar cualquiera de esas rompe la tienda o la impresora termica.

BEGIN;

-- ============================================================================
-- 0. Helpers
-- ============================================================================
CREATE OR REPLACE FUNCTION puede_operar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth_role() IN ('admin', 'cajero')
$$;

CREATE OR REPLACE FUNCTION puede_administrar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth_role() = 'admin'
$$;

-- Cocina ve la operacion pero no toca plata ni catalogo.
CREATE OR REPLACE FUNCTION ve_operacion()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth_role() IN ('admin', 'cajero', 'cocina')
$$;

-- ============================================================================
-- 1. Borrar las politicas viejas
-- ============================================================================
-- `profiles` queda afuera: sus politicas son las de la 016.
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
-- 2. Catalogo — lectura publica intacta, escritura solo admin
-- ============================================================================
CREATE POLICY "productos activos publicos" ON products
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "staff ve todos los productos" ON products
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "admin escribe productos" ON products
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "categorias publicas" ON categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin escribe categorias" ON categories
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "tipos publicos" ON product_types
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin escribe tipos" ON product_types
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "mitades publicas" ON product_half_configs
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin escribe mitades" ON product_half_configs
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "zonas activas publicas" ON delivery_zones
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "staff ve todas las zonas" ON delivery_zones
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "admin escribe zonas" ON delivery_zones
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "ajustes publicos" ON business_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin escribe ajustes" ON business_settings
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

-- ============================================================================
-- 3. Recetas, insumos y costos
-- ============================================================================
-- La lectura se mantiene como esta hoy —publica— porque el descuento de stock
-- al vender resuelve recetas con la sesion del cajero. Solo se cierra la
-- escritura.
--
-- Consecuencia asumida: los costos siguen siendo legibles por la API. Cerrarlos
-- obligaria a mover el camino caliente de la venta a la clave de servicio, que
-- es peor. Si en algun momento importa, se resuelve con una vista que exponga
-- las recetas sin las columnas de costo.

CREATE POLICY "recetas activas publicas" ON recipes
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "staff ve todas las recetas" ON recipes
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "admin escribe recetas" ON recipes
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "receta items publicos" ON recipe_ingredients
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin escribe receta items" ON recipe_ingredients
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "producto receta publico" ON product_recipes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin escribe producto receta" ON product_recipes
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "insumos legibles" ON ingredients
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "admin escribe insumos" ON ingredients
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "categorias insumo publicas" ON ingredient_categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin escribe categorias insumo" ON ingredient_categories
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

CREATE POLICY "sub recetas legibles" ON ingredient_sub_recipes
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "admin escribe sub recetas" ON ingredient_sub_recipes
  FOR ALL TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());

-- ============================================================================
-- 4. Operacion — pedidos, mesas y comandas
-- ============================================================================
-- El checkout web crea pedidos sin sesion. `order_items` NO recibe anon: la
-- tienda publica guarda el detalle en orders.items, order_items es solo del POS.

CREATE POLICY "web crea pedidos" ON orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff lee pedidos" ON orders
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "operacion actualiza pedidos" ON orders
  FOR UPDATE TO authenticated USING (puede_operar()) WITH CHECK (puede_operar());
-- Anular es un UPDATE de estado. Borrar una venta se lleva puesto el arqueo.
CREATE POLICY "admin borra pedidos" ON orders
  FOR DELETE TO authenticated USING (puede_administrar());

CREATE POLICY "staff lee items" ON order_items
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "operacion crea items" ON order_items
  FOR INSERT TO authenticated WITH CHECK (puede_operar());
CREATE POLICY "operacion actualiza items" ON order_items
  FOR UPDATE TO authenticated USING (puede_operar()) WITH CHECK (puede_operar());
CREATE POLICY "operacion borra items" ON order_items
  FOR DELETE TO authenticated USING (puede_operar());

CREATE POLICY "staff lee historial estado" ON order_status_history
  FOR SELECT TO authenticated USING (ve_operacion());
-- anon tambien: el checkout publico registra el estado inicial del pedido.
-- Con la policy anterior, que era solo `authenticated`, esa insercion fallaba.
CREATE POLICY "web escribe historial estado" ON order_status_history
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "staff ve mesas" ON restaurant_tables
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "operacion mueve mesas" ON restaurant_tables
  FOR UPDATE TO authenticated USING (puede_operar()) WITH CHECK (puede_operar());
CREATE POLICY "admin crea mesas" ON restaurant_tables
  FOR INSERT TO authenticated WITH CHECK (puede_administrar());
CREATE POLICY "admin borra mesas" ON restaurant_tables
  FOR DELETE TO authenticated USING (puede_administrar());

-- Cocina lee las comandas y las marca listas. Nada mas.
CREATE POLICY "staff lee comandas" ON comandas
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "operacion crea comandas" ON comandas
  FOR INSERT TO authenticated WITH CHECK (puede_operar());
CREATE POLICY "staff actualiza comandas" ON comandas
  FOR UPDATE TO authenticated USING (ve_operacion()) WITH CHECK (ve_operacion());
CREATE POLICY "admin borra comandas" ON comandas
  FOR DELETE TO authenticated USING (puede_administrar());

CREATE POLICY "staff lee comanda items" ON comanda_items
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "operacion crea comanda items" ON comanda_items
  FOR INSERT TO authenticated WITH CHECK (puede_operar());
CREATE POLICY "staff actualiza comanda items" ON comanda_items
  FOR UPDATE TO authenticated USING (ve_operacion()) WITH CHECK (ve_operacion());
CREATE POLICY "admin borra comanda items" ON comanda_items
  FOR DELETE TO authenticated USING (puede_administrar());

-- ============================================================================
-- 5. Impresion — el print-bridge corre con la anon key
-- ============================================================================
-- Se replica exactamente lo que hay hoy. Si se toca, deja de imprimir.
CREATE POLICY "bridge lee pendientes" ON print_jobs
  FOR SELECT TO anon USING (status = 'pending');
CREATE POLICY "bridge marca impreso" ON print_jobs
  FOR UPDATE TO anon USING (true)
  WITH CHECK (status = ANY (ARRAY['printed'::text, 'error'::text]));

CREATE POLICY "staff lee impresiones" ON print_jobs
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "staff encola impresiones" ON print_jobs
  FOR INSERT TO authenticated WITH CHECK (ve_operacion());
CREATE POLICY "staff actualiza impresiones" ON print_jobs
  FOR UPDATE TO authenticated USING (ve_operacion()) WITH CHECK (ve_operacion());

-- ============================================================================
-- 6. Caja — cocina no entra, nadie borra
-- ============================================================================
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
-- El cajero necesita INSERT porque la venta descuenta. La diferencia entre
-- "descuento por venta" y "ajuste manual" se controla en la server action: RLS
-- no puede mirar el `type` sin volverse ilegible.
CREATE POLICY "operacion lee stock" ON stock_movements
  FOR SELECT TO authenticated USING (ve_operacion());
CREATE POLICY "operacion registra stock" ON stock_movements
  FOR INSERT TO authenticated WITH CHECK (puede_operar());
CREATE POLICY "admin corrige stock" ON stock_movements
  FOR UPDATE TO authenticated USING (puede_administrar()) WITH CHECK (puede_administrar());
CREATE POLICY "admin borra stock" ON stock_movements
  FOR DELETE TO authenticated USING (puede_administrar());

COMMIT;

-- ============================================================================
-- Verificacion — correr despues, con la tienda publica abierta al lado
-- ============================================================================
-- 1) El acceso anonimo sigue existiendo donde tiene que estar:
--
--   SELECT tablename, policyname, cmd FROM pg_policies
--    WHERE schemaname='public' AND 'anon' = ANY(roles) ORDER BY tablename;
--   -- esperado: products, categories, product_types, product_half_configs,
--   --           delivery_zones, business_settings, ingredient_categories,
--   --           recipes, recipe_ingredients, product_recipes (SELECT),
--   --           orders (INSERT), print_jobs (SELECT + UPDATE)
--
-- 2) Ninguna tabla quedo con RLS y sin politicas:
--
--   SELECT t.tablename FROM pg_tables t
--    WHERE t.schemaname='public' AND t.rowsecurity
--      AND NOT EXISTS (SELECT 1 FROM pg_policies p
--                       WHERE p.schemaname='public' AND p.tablename=t.tablename);
--   -- no deberia devolver ninguna
--
-- 3) Tu rol:  SELECT auth_role();   -- 'admin'
--
-- 4) A ojo: abrir la tienda publica y confirmar que se ven los productos y que
--    se puede mandar un pedido. Y mandar una impresion de prueba.
