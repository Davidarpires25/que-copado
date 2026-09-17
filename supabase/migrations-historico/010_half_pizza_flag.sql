-- Migration 010: Add has_half_selection flag to products
ALTER TABLE products ADD COLUMN has_half_selection BOOLEAN NOT NULL DEFAULT FALSE;
