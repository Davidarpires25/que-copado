-- 032_rendimiento_de_sub_recetas.sql
--
-- Las sub-recetas expresaban las cantidades "por 1 unidad base del compuesto".
-- Nadie cocina asi: se piensa "1 kg de mayonesa + medio de ketchup me da 1,5 kg
-- de salsa". Sin un rendimiento, cargar una preparacion obligaba a dividir a
-- mano por 1,5 antes de escribirla, que es justamente la aritmetica que le
-- corresponde al sistema.
--
-- `yield_quantity` es cuanto rinde la preparacion, en la unidad del propio
-- ingrediente. El default 1 deja intacta la aritmetica de los datos que ya
-- existen: dividir por 1 no cambia nada.

BEGIN;

ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS yield_quantity NUMERIC NOT NULL DEFAULT 1;

-- Un rendimiento de 0 o negativo haria explotar la division en cada calculo de
-- costo y de descuento de stock.
ALTER TABLE public.ingredients
  DROP CONSTRAINT IF EXISTS ingredients_yield_quantity_check;

ALTER TABLE public.ingredients
  ADD CONSTRAINT ingredients_yield_quantity_check CHECK (yield_quantity > 0);

COMMIT;
