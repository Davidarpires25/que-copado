-- Fase 1: Migración para actualizar tabla orders
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Crear nuevo enum de estados (4 estados simplificados)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_new') THEN
    CREATE TYPE order_status_new AS ENUM ('recibido', 'pagado', 'entregado', 'cancelado');
  END IF;
END $$;

-- 2. Agregar columnas nuevas
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS customer_coordinates JSONB,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_zone_id UUID REFERENCES delivery_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS status_new order_status_new DEFAULT 'recibido';

-- 3. Migrar datos existentes (si hay pedidos viejos)
UPDATE orders SET status_new =
  CASE
    WHEN status::text = 'pending' THEN 'recibido'::order_status_new
    WHEN status::text = 'confirmed' THEN 'pagado'::order_status_new
    WHEN status::text = 'preparing' THEN 'pagado'::order_status_new
    WHEN status::text = 'ready' THEN 'pagado'::order_status_new
    WHEN status::text = 'delivered' THEN 'entregado'::order_status_new
    WHEN status::text = 'cancelled' THEN 'cancelado'::order_status_new
    ELSE 'recibido'::order_status_new
  END
WHERE status_new IS NULL;

-- 4. Eliminar columna status antigua y renombrar la nueva
ALTER TABLE orders DROP COLUMN IF EXISTS status;
ALTER TABLE orders RENAME COLUMN status_new TO status;

-- 5. Agregar constraint para payment_method
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cash', 'transfer', 'mercadopago'));

-- 6. Crear índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_zone ON orders(delivery_zone_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);

-- 7. Comentarios para documentación
COMMENT ON COLUMN orders.customer_coordinates IS 'JSON con lat/lng: {"lat": -34.6037, "lng": -58.3816}';
COMMENT ON COLUMN orders.shipping_cost IS 'Costo de envío en ARS al momento del pedido';
COMMENT ON COLUMN orders.delivery_zone_id IS 'Referencia a zona de delivery (null si no hay zonas configuradas)';
COMMENT ON COLUMN orders.payment_method IS 'Método de pago: cash, transfer, o mercadopago';
COMMENT ON COLUMN orders.status IS 'Estado: recibido, pagado, entregado, cancelado';
