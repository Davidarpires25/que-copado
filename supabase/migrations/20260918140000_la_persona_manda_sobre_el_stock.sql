-- Cuando una persona dice que hay, hay.
--
-- El barrido esconde un producto cuando su insumo llega a cero. Esta bien, salvo
-- cuando el que miente es el dato: una receta de pizza descontaba un pote entero
-- de salsa por pizza, cuando un pote hace tres. La salsa llegaba a cero, las tres
-- pizzas desaparecian, y en la cocina habia salsa de sobra.
--
-- Quien atiende las prendia a mano y el barrido se las volvia a apagar al
-- siguiente movimiento de stock, porque la rama que apaga no miraba si alguien
-- habia decidido lo contrario:
--
--   if (stockTeorico <= 0 && !producto.is_out_of_stock) { apagar }
--
-- `auto_disabled` ya distinguia lo que apago el sistema de lo que apago una
-- persona, pero solo servia para no volver a encender. Faltaba el otro lado: que
-- una persona pueda decir "esto esta disponible" y que eso aguante.
--
-- Se limpia solo cuando el stock se recupera: ahi el motivo para forzarlo ya no
-- existe y el producto vuelve a seguir al stock, sin que nadie se acuerde de
-- apagar la excepcion.
alter table public.products
  add column if not exists forzado_disponible boolean not null default false;

comment on column public.products.forzado_disponible is
  'Una persona marco este producto como disponible a pesar del stock. El barrido no lo apaga. Se limpia solo cuando el stock se recupera.';
