-- El tope de produccion se aplica solo si el local lo enciende.
--
-- El sistema sabe cuantas unidades puede armar de cada producto, y hasta ahora
-- ese numero no se usaba para nada: la cuenta corria con un cliente que no podia
-- leer `ingredients` y terminaba en "sin tope", siempre.
--
-- Al arreglarlo aparecio el motivo por el que no conviene encenderlo de una:
-- medido contra los datos reales, 13 de 38 productos quedaban con techo de 8 o
-- menos, y cinco con techo de 1 --tres pizzas limitadas por "Salsa de tomate",
-- que decia tener una unidad--. Con el tope activo, alguien que pide dos pizzas
-- se lleva un rechazo porque el stock esta viejo, no porque falte salsa.
--
-- El tope vale lo que valen los numeros de stock. Mientras esos numeros no se
-- carguen al dia, rechazar un pedido automaticamente es perder plata por un dato
-- desactualizado. Asi que queda apagado, y se enciende cuando el conteo sea
-- confiable.
alter table public.business_settings
  add column if not exists aplicar_tope_de_stock boolean not null default false;

comment on column public.business_settings.aplicar_tope_de_stock is
  'Si esta en true, un pedido que pide mas unidades de las que se pueden armar se rechaza. Apagado por defecto: el tope vale lo que valen los numeros de stock.';
