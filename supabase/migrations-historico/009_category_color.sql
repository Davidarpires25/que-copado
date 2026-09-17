-- Add color column to categories for POS display
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#FEC501';
