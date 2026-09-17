-- Un combo es varios productos que se entregan juntos a un precio propio.
--
-- Hasta acá no había forma de armarlo, así que los tres combos activos se
-- cargaron como productos `elaborado` con una receta adentro y la bebida metida
-- como ingrediente. El resultado es que vender un combo descuenta un inventario
-- paralelo al de esa misma bebida vendida suelta: dos stocks para la misma
-- heladera, y ninguno dice cuántas botellas quedan.
--
-- Lo que faltaba era la relación producto -> producto. Un componente es el mismo
-- producto del catálogo que se vende solo, así que descuenta del mismo stock.

create table if not exists public.product_components (
  id           uuid primary key default gen_random_uuid(),
  -- El combo.
  parent_id    uuid not null references public.products(id) on delete cascade,
  -- Lo que incluye: un producto de reventa o uno elaborado, nunca otro combo.
  component_id uuid not null references public.products(id) on delete restrict,
  quantity     numeric not null default 1 check (quantity > 0),
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),

  -- Un combo no se contiene a sí mismo.
  constraint componente_distinto_del_combo check (parent_id <> component_id),
  -- Un producto entra una sola vez: dos líneas del mismo son una sola con más
  -- cantidad, igual que en una compra.
  constraint componente_unico_por_combo unique (parent_id, component_id)
);

comment on table public.product_components is
  'Componentes de un producto tipo combo. El componente es el mismo producto que se vende suelto: descuenta del mismo stock.';

create index if not exists idx_product_components_parent on public.product_components(parent_id);
-- Para responder "qué combos usan este producto" cuando cambia su costo.
create index if not exists idx_product_components_component on public.product_components(component_id);

alter table public.product_components enable row level security;

-- Mismas reglas que `product_recipes`: lo lee cualquiera —el catálogo público
-- necesita saber qué incluye un combo— y lo escribe un administrador.
create policy "componentes publicos" on public.product_components
  for select to authenticated, anon using (true);

create policy "admin escribe componentes" on public.product_components
  to authenticated using (public.puede_administrar()) with check (public.puede_administrar());

-- El tipo nuevo.
--
-- `uses_recipes` en false: un combo no tiene receta propia, la tienen sus
-- componentes elaborados.
-- `sends_to_kitchen` en false: el combo como tal no va a cocina. Van sus
-- componentes, cada uno a su estación, y de eso se encarga el armado de comandas.
insert into public.product_types (type_key, label, description, sends_to_kitchen, uses_recipes)
values ('combo', 'Combo', 'Varios productos juntos a un precio propio', false, false)
on conflict (type_key) do nothing;
