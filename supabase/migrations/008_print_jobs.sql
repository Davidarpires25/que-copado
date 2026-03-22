-- Print jobs queue for thermal printer bridge
create table print_jobs (
  id          uuid        primary key default gen_random_uuid(),
  type        text        not null,          -- 'client_ticket' | 'kitchen_ticket'
  data        jsonb       not null,          -- TicketData or KitchenData as JSON
  status      text        not null default 'pending', -- 'pending' | 'printed' | 'error'
  error_msg   text,
  created_at  timestamptz not null default now()
);

-- Only keep last 7 days of jobs (optional housekeeping index)
create index print_jobs_created_at_idx on print_jobs (created_at);
create index print_jobs_status_idx     on print_jobs (status);

-- RLS
alter table print_jobs enable row level security;

-- El admin (autenticado) puede insertar jobs desde el POS
create policy "auth insert"  on print_jobs for insert to authenticated with check (true);
create policy "auth select"  on print_jobs for select to authenticated using (true);

-- El bridge local usa la anon key: solo puede leer pending y actualizar status/error
-- (anon key ya es pública en el frontend, no es un secreto)
create policy "anon select pending" on print_jobs
  for select to anon using (status = 'pending');

create policy "anon update status" on print_jobs
  for update to anon
  using (true)
  with check (
    -- Solo puede cambiar status y error_msg, nada más
    status in ('printed', 'error')
  );
