-- Migration 007: Add auto_disabled flag to products
-- Used by syncElaboradoAvailability() to distinguish automatic vs manual out-of-stock
ALTER TABLE products ADD COLUMN IF NOT EXISTS auto_disabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.auto_disabled IS 'True when is_out_of_stock was set automatically by stock sync. Used to avoid overriding manual admin decisions.';
