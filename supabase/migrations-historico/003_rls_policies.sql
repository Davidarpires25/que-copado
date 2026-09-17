-- Fase 1: Políticas RLS para orders y business_settings
-- Ejecutar en Supabase Dashboard > SQL Editor

-- ============================================
-- ORDERS: Políticas de seguridad
-- ============================================

-- Habilitar RLS en orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow anon to create orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated to read orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated to update orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated to delete orders" ON orders;

-- 1. Permitir que usuarios anónimos creen pedidos (checkout público)
CREATE POLICY "Allow anon to create orders"
  ON orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Solo usuarios autenticados pueden leer pedidos (admin)
CREATE POLICY "Allow authenticated to read orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Solo usuarios autenticados pueden actualizar pedidos (cambiar estado)
CREATE POLICY "Allow authenticated to update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Solo usuarios autenticados pueden eliminar pedidos
CREATE POLICY "Allow authenticated to delete orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- BUSINESS_SETTINGS: Políticas de seguridad
-- ============================================

-- Habilitar RLS en business_settings
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow anon to read business_settings" ON business_settings;
DROP POLICY IF EXISTS "Allow authenticated to read business_settings" ON business_settings;
DROP POLICY IF EXISTS "Allow authenticated to update business_settings" ON business_settings;

-- 1. Permitir lectura pública (para verificar horarios en checkout)
CREATE POLICY "Allow anon to read business_settings"
  ON business_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Solo usuarios autenticados pueden actualizar configuración
CREATE POLICY "Allow authenticated to update business_settings"
  ON business_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Verificación
-- ============================================
-- Después de ejecutar, verifica en Supabase Dashboard:
-- 1. Authentication > Policies > orders (debe tener 4 policies)
-- 2. Authentication > Policies > business_settings (debe tener 2 policies)
