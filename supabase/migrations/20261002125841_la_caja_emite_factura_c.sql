-- La caja emite factura C por ARCA (change la-caja-emite-factura-c).
--
-- Tres tablas:
--
-- * `datos_fiscales`: una sola fila con lo que el comprobante tiene que decir
--   del emisor y cómo factura el local. Sin fila, o con `activa = false`, la
--   facturación está apagada y la caja es la de siempre.
-- * `facturas`: cada comprobante pedido a ARCA, emitido o no. Una factura
--   pendiente o rechazada también se guarda: es una venta sin facturar, y
--   tiene que verse.
-- * `arca_ticket_de_acceso`: el permiso que da ARCA por ~12 horas. Vive en la
--   base porque Vercel no conserva memoria entre invocaciones, y ARCA rechaza
--   pedir uno nuevo mientras el anterior siga vigente.
--
-- Todo se escribe desde el servidor (clave de servicio). Los usuarios solo
-- leen, y cada uno lo que su permiso le deja.

-- ─── Datos fiscales ─────────────────────────────────────────────────────────

create table if not exists public.datos_fiscales (
  -- Una sola fila: la clave es siempre `true`.
  id boolean primary key default true check (id),
  activa boolean not null default false,
  razon_social text not null default '',
  cuit text not null default '' check (cuit = '' or cuit ~ '^[0-9]{11}$'),
  -- Esta versión solo emite factura C.
  condicion_iva text not null default 'monotributo' check (condicion_iva = 'monotributo'),
  punto_venta integer check (punto_venta between 1 and 99998),
  domicilio_comercial text not null default '',
  ingresos_brutos text not null default '',
  inicio_actividades date,
  -- Con qué medios de pago se factura solo al cobrar (como Fudo). Todos por
  -- defecto: lo que no está acá se factura a mano desde el Historial.
  medios_automaticos text[] not null default array['cash', 'card', 'transfer', 'mercadopago']
    check (medios_automaticos <@ array['cash', 'card', 'transfer', 'mercadopago']),
  updated_at timestamptz not null default now()
);

comment on table public.datos_fiscales is
  'Una fila. Lo que la factura dice del emisor y cómo factura el local. Sin fila o con activa=false, no se factura.';

alter table public.datos_fiscales enable row level security;

create policy "ajustes lee datos fiscales" on public.datos_fiscales
  for select to authenticated using (public.has_permission('settings.view'));

-- ─── Facturas ───────────────────────────────────────────────────────────────

create table if not exists public.facturas (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  -- 11 = Factura C, 13 = Nota de Crédito C (tabla de tipos de ARCA).
  tipo smallint not null check (tipo in (11, 13)),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'emitida', 'rechazada')),
  -- Se conocen cuando ARCA autoriza.
  punto_venta integer,
  numero integer,
  cae text,
  cae_vence date,
  fecha date not null,
  total numeric(12, 2) not null check (total > 0),
  -- 99 / 0: consumidor final sin identificar.
  doc_tipo smallint not null default 99,
  doc_nro bigint not null default 0,
  -- La factura que compensa una nota de crédito.
  asociada_a uuid references public.facturas(id) on delete restrict,
  -- El texto de ARCA si se rechazó, o qué falló si no se pudo hablar con ARCA.
  motivo text,
  intentos integer not null default 0,
  -- Una emisión en curso toma la fila poniendo la hora; otra que llega en ese
  -- momento no pide otro número a ARCA. Si quedó tomada más de 2 minutos (la
  -- función se murió), se puede volver a tomar.
  procesando_desde timestamptz,
  -- Lo último que se mandó y se recibió, para entender un problema.
  pedido_arca jsonb,
  respuesta_arca jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint facturas_emitida_completa check (
    estado <> 'emitida' or (punto_venta is not null and numero is not null and cae is not null and cae_vence is not null)
  ),
  constraint facturas_nota_asociada check ((tipo = 13) = (asociada_a is not null))
);

comment on table public.facturas is
  'Comprobantes pedidos a ARCA. Pendiente o rechazada = venta sin facturar, a la vista en el Historial.';

-- Nunca dos facturas para el mismo pedido, ni dos notas para la misma
-- factura. Dos clics en "Facturar" o dos reintentos a la vez chocan acá, en la
-- base, antes de llegar a ARCA. Una rechazada no cuenta: se puede volver a
-- pedir después de corregir el dato.
create unique index if not exists facturas_una_por_pedido
  on public.facturas (order_id) where tipo = 11 and estado <> 'rechazada';

create unique index if not exists facturas_una_nota_por_factura
  on public.facturas (asociada_a) where tipo = 13 and estado <> 'rechazada';

create unique index if not exists facturas_numero_unico
  on public.facturas (tipo, punto_venta, numero) where numero is not null;

-- El Historial y el cierre buscan las facturas de pedidos puntuales, y las
-- pendientes.
create index if not exists idx_facturas_order on public.facturas (order_id);
create index if not exists idx_facturas_pendientes on public.facturas (created_at) where estado <> 'emitida';

alter table public.facturas enable row level security;

create policy "caja lee facturas" on public.facturas
  for select to authenticated using (public.has_permission('caja.view'));

-- ─── Ticket de acceso de ARCA ───────────────────────────────────────────────

create table if not exists public.arca_ticket_de_acceso (
  servicio text not null,
  ambiente text not null check (ambiente in ('homologacion', 'produccion')),
  token text not null,
  firma text not null,
  vence timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (servicio, ambiente)
);

comment on table public.arca_ticket_de_acceso is
  'El permiso de ARCA (WSAA) vigente. Solo el servidor: RLS sin políticas.';

-- RLS encendido y sin políticas: ni anon ni authenticated lo leen. Solo la
-- clave de servicio, que la saltea.
alter table public.arca_ticket_de_acceso enable row level security;

-- ─── Tomar una factura para emitirla ────────────────────────────────────────

-- Una emisión toma la fila antes de hablar con ARCA; otra que llega en ese
-- momento no la consigue y no pide otro número. Una toma de más de 2 minutos
-- es de una función que se murió: se puede retomar.
--
-- Es una función y no un update desde la aplicación porque PostgREST vuelve a
-- aplicar el filtro `or` a la fila ya actualizada: como la toma cambia
-- justamente `procesando_desde`, la fila dejaba de cumplirlo y la respuesta
-- salía vacía aunque se hubiera tomado. Acá además manda el reloj de la base.
create or replace function public.tomar_factura(p_id uuid)
returns setof public.facturas
language sql
security invoker
set search_path = public
as $$
  update public.facturas
     set procesando_desde = now(),
         estado = 'pendiente',
         intentos = intentos + 1,
         updated_at = now()
   where id = p_id
     and (procesando_desde is null or procesando_desde < now() - interval '2 minutes')
  returning *;
$$;

revoke all on function public.tomar_factura(uuid) from public, anon, authenticated;
grant execute on function public.tomar_factura(uuid) to service_role;
