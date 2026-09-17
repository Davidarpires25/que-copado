-- Fase 1: Perfiles de empleados y roles
-- Ejecutar en Supabase Dashboard > SQL Editor
--
-- Esta migración crea la INFRAESTRUCTURA de roles. No cambia ninguna política
-- de las tablas de dominio: hoy siguen siendo `TO authenticated USING (true)`,
-- o sea que cualquier usuario autenticado sigue pudiendo todo.
--
-- IMPORTANTE: no des de alta a ningún empleado hasta aplicar la fase 2, que es
-- la que reescribe esas políticas. Un login nuevo hoy es un login con permisos
-- totales sobre el negocio.

-- ============================================
-- 1. El enum de roles
-- ============================================
-- 'cajero' cubre también al vendedor: en este local es la misma persona, la que
-- toma el pedido es la que cierra el turno.
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'cajero', 'cocina');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. Tabla de perfiles
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text        NOT NULL DEFAULT '',
  role       app_role    NOT NULL DEFAULT 'cajero',
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS
  'Empleados del local. Una fila por usuario de auth.users. Dar de baja es is_active = false, nunca DELETE: borrar rompe la trazabilidad de los turnos y arqueos que esa persona cerró.';

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. auth_role() — el rol del usuario actual
-- ============================================
-- SECURITY DEFINER es obligatorio, no una optimización: sin eso, una política
-- sobre `profiles` que llame a esta función vuelve a consultar `profiles` y
-- Postgres entra en recursión infinita.
CREATE OR REPLACE FUNCTION auth_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_active AND role = 'admin'
  )
$$;

-- ============================================
-- 4. Crear el perfil automáticamente al crear el usuario
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'cajero')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 5. RLS de profiles
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leer mi propio perfil"      ON profiles;
DROP POLICY IF EXISTS "admin lee todos los perfiles" ON profiles;
DROP POLICY IF EXISTS "admin crea perfiles"        ON profiles;
DROP POLICY IF EXISTS "admin edita perfiles"       ON profiles;

-- Cada uno puede leer su propia fila: es lo que necesita el sidebar para
-- mostrar quién está trabajando.
CREATE POLICY "leer mi propio perfil"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "admin lee todos los perfiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

-- Nadie edita su propio perfil, ni siquiera el nombre. Es deliberado: si un
-- usuario pudiera hacer UPDATE sobre su fila, podría subirse el rol a 'admin'.
-- RLS no filtra por columna, así que la forma segura es que solo el admin
-- escriba.
CREATE POLICY "admin crea perfiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admin edita perfiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Sin política de DELETE a propósito: las bajas son lógicas (is_active = false).

-- ============================================
-- 6. Semilla — que no te quedes afuera
-- ============================================
-- Toda cuenta que ya exista pasa a admin. Si no se hace esto, al aplicar la
-- fase 2 nadie tendría permisos y el panel quedaría inutilizable.
INSERT INTO profiles (id, full_name, role, is_active)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'admin',
  true
FROM auth.users u
ON CONFLICT (id) DO UPDATE
  SET role = 'admin', is_active = true;

-- ============================================
-- Verificación
-- ============================================
-- Después de ejecutar, esto tiene que devolver tu cuenta con role = 'admin':
--
--   SELECT p.full_name, p.role, p.is_active, u.email
--   FROM profiles p JOIN auth.users u ON u.id = p.id;
