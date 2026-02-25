-- ============================================================================
-- Migration 004: Recipe System
-- Replaces direct product->ingredient linking with a proper recipe model:
--   ingredients -> recipe_ingredients -> recipes -> product_recipes -> products
-- Also adds product_type ('elaborado' | 'reventa') distinction.
-- ============================================================================

-- 1. Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create recipe_ingredients junction table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, ingredient_id)
);

-- 3. Create product_recipes junction table
CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, recipe_id)
);

-- 4. Add product_type to products (elaborado = uses recipes, reventa = direct cost)
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'elaborado';

-- 5. Drop old has_recipe column (replaced by product_type + product_recipes)
ALTER TABLE products DROP COLUMN IF EXISTS has_recipe;

-- 6. Drop old product_ingredients table (replaced by recipe system)
DROP TABLE IF EXISTS product_ingredients;

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_product ON product_recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_recipe ON product_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);

-- 8. RLS policies for recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active recipes"
  ON recipes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated can manage recipes"
  ON recipes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. RLS policies for recipe_ingredients
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read recipe ingredients"
  ON recipe_ingredients FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can manage recipe ingredients"
  ON recipe_ingredients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 10. RLS policies for product_recipes
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read product recipes"
  ON product_recipes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can manage product recipes"
  ON product_recipes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
