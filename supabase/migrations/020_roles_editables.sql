-- Fase 5: los roles pasan a ser datos
--
-- `app_role` era un enum de Postgres con tres valores fijos. Para que el admin
-- pueda crear roles nuevos, los roles pasan a ser filas de `roles` y los
-- permisos una relacion en `role_permissions`.
--
-- Los PERMISOS siguen siendo un catalogo cerrado, definido en
-- lib/constants/permissions.ts: una clave solo significa algo si las policies
-- y la interfaz la consultan. Una clave inventada desde la UI no protegeria ni
-- habilitaria nada.
--
-- Aplicada en produccion el 2026-09-10. El contenido exacto esta en el
-- historial de migraciones de Supabase (version roles_editables); este archivo
-- lo documenta para levantar el proyecto desde cero.

CREATE TABLE IF NOT EXISTS roles (
  key         text PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]{1,30}$'),
  name        text NOT NULL,
  description text,
  is_system   boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_key   text NOT NULL REFERENCES roles(key) ON DELETE CASCADE ON UPDATE CASCADE,
  permission text NOT NULL,
  PRIMARY KEY (role_key, permission)
);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_key);

-- Los tres roles de arranque. `is_system` impide borrarlos; `admin` ademas no
-- se puede editar, porque es la salida de emergencia: si se le pudieran quitar
-- permisos, un clic dejaria el panel sin nadie que pueda administrarlo.
INSERT INTO roles (key, name, description, is_system, sort_order) VALUES
  ('admin',  'Administrador', 'Acceso total. No se puede editar ni eliminar.', true, 1),
  ('cajero', 'Cajero',        'Opera la caja, cobra y cierra el turno.',       true, 2),
  ('cocina', 'Cocina',        'Solo la pantalla de comandas.',                 true, 3)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_key, permission)
SELECT 'admin', p FROM unnest(ARRAY[
  'caja.view','caja.manage','mesas.view','mesas.manage','pedidos.view','pedidos.manage',
  'cocina.view','cocina.manage','productos.view','productos.manage','categorias.view',
  'categorias.manage','recetas.view','recetas.manage','ingredientes.view','ingredientes.manage',
  'stock.view','stock.manage','dashboard.view','analytics.view','delivery_zones.view',
  'delivery_zones.manage','settings.view','settings.manage','users.view','users.manage','roles.manage'
]) AS p ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_key, permission)
SELECT 'cajero', p FROM unnest(ARRAY[
  'caja.view','caja.manage','mesas.view','mesas.manage','pedidos.view','pedidos.manage',
  'cocina.view','productos.view','categorias.view'
]) AS p ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_key, permission)
SELECT 'cocina', p FROM unnest(ARRAY[
  'cocina.view','cocina.manage','pedidos.view','productos.view'
]) AS p ON CONFLICT DO NOTHING;

-- has_permission() es la pieza central: las policies preguntan que puede hacer
-- el usuario, no como se llama su rol. Por eso un rol nuevo funciona sin tocar
-- ninguna de las 68 policies.
CREATE OR REPLACE FUNCTION has_permission(perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM profiles p
      JOIN role_permissions rp ON rp.role_key = p.role::text
     WHERE p.id = auth.uid() AND p.is_active AND rp.permission = perm
  )
$$;

CREATE OR REPLACE FUNCTION puede_operar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT has_permission('caja.manage') $$;

CREATE OR REPLACE FUNCTION puede_administrar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT has_permission('productos.manage') $$;

CREATE OR REPLACE FUNCTION ve_operacion()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT has_permission('pedidos.view') $$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT has_permission('users.manage') $$;

-- El trigger deja de castear al enum y valida contra la tabla.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

-- auth_role() devolvia el enum; hay que dropearla porque no se puede cambiar
-- el tipo de retorno de una funcion existente. Va despues de desenganchar los
-- helpers de arriba, que eran quienes dependian de ella.
DROP FUNCTION IF EXISTS auth_role();
CREATE FUNCTION auth_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role::text FROM profiles WHERE id = auth.uid() AND is_active $$;

ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'cajero';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_fkey
  FOREIGN KEY (role) REFERENCES roles(key) ON UPDATE CASCADE;

REVOKE ALL ON FUNCTION has_permission(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION has_permission(text) FROM anon;
GRANT EXECUTE ON FUNCTION has_permission(text) TO authenticated;
REVOKE ALL ON FUNCTION auth_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_role() FROM anon;
GRANT EXECUTE ON FUNCTION auth_role() TO authenticated;

ALTER TABLE roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff lee roles"          ON roles;
DROP POLICY IF EXISTS "gestion escribe roles"    ON roles;
DROP POLICY IF EXISTS "staff lee permisos"       ON role_permissions;
DROP POLICY IF EXISTS "gestion escribe permisos" ON role_permissions;

-- Todos leen los roles: el sidebar necesita saber que puede ver el usuario.
CREATE POLICY "staff lee roles" ON roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestion escribe roles" ON roles
  FOR ALL TO authenticated
  USING (has_permission('roles.manage')) WITH CHECK (has_permission('roles.manage'));

CREATE POLICY "staff lee permisos" ON role_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestion escribe permisos" ON role_permissions
  FOR ALL TO authenticated
  USING (has_permission('roles.manage')) WITH CHECK (has_permission('roles.manage'));

DROP TYPE IF EXISTS app_role;
