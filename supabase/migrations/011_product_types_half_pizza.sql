-- Migration 011: Product types table + half pizza config + order_items metadata

-- 1. Tabla de referencia de tipos de producto
CREATE TABLE product_types (
  type_key         TEXT PRIMARY KEY CHECK (type_key = lower(type_key)),
  label            TEXT NOT NULL,
  description      TEXT,
  uses_recipes     BOOLEAN NOT NULL DEFAULT FALSE,
  sends_to_kitchen BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO product_types (type_key, label, description, uses_recipes, sends_to_kitchen) VALUES
  ('elaborado', 'Elaborado',     'Se prepara en cocina con receta',   TRUE,  TRUE),
  ('reventa',   'Reventa',       'Producto de reventa directo',       FALSE, FALSE),
  ('mitad',     'Mitad y Mitad', 'Pizza con selección de 2 mitades',  FALSE, TRUE);

-- RLS: lectura pública, escritura solo via service_role
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_types_read_all" ON product_types FOR SELECT USING (true);

-- 2. FK en products + eliminar has_half_selection (agregado en migración 010)
ALTER TABLE products
  ADD CONSTRAINT fk_product_type FOREIGN KEY (product_type) REFERENCES product_types(type_key),
  DROP COLUMN has_half_selection;

-- 3. Índice en product_type (many side del FK)
CREATE INDEX idx_products_product_type ON products(product_type);

-- 4. Config por producto tipo 'mitad'
CREATE TABLE product_half_configs (
  product_id         UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  source_category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  pricing_method     TEXT NOT NULL DEFAULT 'max'
    CHECK (pricing_method IN ('max', 'average', 'fixed', 'cost_markup')),
  pricing_markup_pct NUMERIC(5,2)
);

CREATE INDEX idx_half_configs_source_category ON product_half_configs(source_category_id);

ALTER TABLE product_half_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "half_configs_read_all"    ON product_half_configs FOR SELECT USING (true);
CREATE POLICY "half_configs_write_admin" ON product_half_configs FOR ALL   USING (auth.role() = 'authenticated');

-- 5. metadata JSONB en order_items
-- Estructura esperada: { half_1_id, half_1_name, half_2_id, half_2_name, pricing_method }
ALTER TABLE order_items ADD COLUMN metadata JSONB;
