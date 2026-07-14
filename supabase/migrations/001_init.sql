-- CajuSpace — Schema do Banco (Supabase / Postgres)
-- Reconstruído a partir da camada de dados da aplicação:
--   app/lib/repository/*.ts  e  app/api/**/route.ts
--
-- Inclui: tabelas, relações (FKs), índices, trigger de updated_at,
-- RLS (deny-all: todo acesso é server-side via service_role, que ignora RLS)
-- e o bucket de Storage "spaces" usado para imagens dos espaços.
--
-- Como aplicar: Supabase Studio → SQL Editor → cole este arquivo → Run.

-- 0) Extensões (normalmente já habilitadas no Supabase)
create extension if not exists "pgcrypto";

-- 1) Utilitário: trigger de updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- 2) system_settings  (linha única, id = 1) — usada em /api/availability
-- =====================================================================
create table if not exists public.system_settings (
  id                    integer primary key default 1,
  default_open_time     time        not null default '08:00:00',
  default_close_time    time        not null default '22:00:00',
  slot_duration_minutes integer     not null default 60,
  updated_at            timestamptz not null default now(),
  constraint system_settings_singleton check (id = 1)
);

drop trigger if exists trg_system_settings_updated_at on public.system_settings;
create trigger trg_system_settings_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

-- =====================================================================
-- 3) space_types
-- =====================================================================
create table if not exists public.space_types (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  description text        null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_space_types_updated_at on public.space_types;
create trigger trg_space_types_updated_at
before update on public.space_types
for each row execute function public.set_updated_at();

-- =====================================================================
-- 4) resources
-- =====================================================================
create table if not exists public.resources (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  description text        null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_resources_updated_at on public.resources;
create trigger trg_resources_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

-- =====================================================================
-- 5) spaces
-- =====================================================================
create table if not exists public.spaces (
  id                   uuid primary key default gen_random_uuid(),
  name                 text          not null,
  slug                 text          not null unique,
  capacity             integer       not null default 0,
  description          text          null,
  default_hourly_price numeric(10,2) not null default 0,
  space_type_id        uuid          null references public.space_types(id) on delete set null,
  image_url            text          null,
  is_active            boolean       not null default true,
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now()
);

create index if not exists idx_spaces_space_type on public.spaces(space_type_id);
create index if not exists idx_spaces_is_active   on public.spaces(is_active);

drop trigger if exists trg_spaces_updated_at on public.spaces;
create trigger trg_spaces_updated_at
before update on public.spaces
for each row execute function public.set_updated_at();

-- =====================================================================
-- 6) space_resources  (N:N entre spaces e resources)
-- =====================================================================
create table if not exists public.space_resources (
  space_id    uuid        not null references public.spaces(id)    on delete cascade,
  resource_id uuid        not null references public.resources(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (space_id, resource_id)
);

create index if not exists idx_space_resources_resource on public.space_resources(resource_id);

-- =====================================================================
-- 7) opening_hours  (horário de funcionamento por espaço/dia da semana)
--    weekday: 0=domingo ... 6=sábado (getUTCDay)
-- =====================================================================
create table if not exists public.opening_hours (
  id         uuid        primary key default gen_random_uuid(),
  space_id   uuid        not null references public.spaces(id) on delete cascade,
  weekday    smallint    not null check (weekday between 0 and 6),
  start_time time        null,
  end_time   time        null,
  is_closed  boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, weekday)
);

drop trigger if exists trg_opening_hours_updated_at on public.opening_hours;
create trigger trg_opening_hours_updated_at
before update on public.opening_hours
for each row execute function public.set_updated_at();

-- =====================================================================
-- 8) blackout_periods  (bloqueios pontuais de disponibilidade)
-- =====================================================================
create table if not exists public.blackout_periods (
  id         uuid        primary key default gen_random_uuid(),
  space_id   uuid        not null references public.spaces(id) on delete cascade,
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  reason     text        null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists idx_blackout_space_start on public.blackout_periods(space_id, start_at);

-- =====================================================================
-- 9) clients  (cliente final; login por CPF/CNPJ = document único)
-- =====================================================================
create table if not exists public.clients (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  type       text        not null default 'individual' check (type in ('individual','company')),
  email      text        null,
  phone      text        null,
  document   text        null unique,
  notes      text        null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- =====================================================================
-- 10) staff_users  (equipe/admin; login por email + PIN global via env ADMIN_PIN)
-- =====================================================================
create table if not exists public.staff_users (
  id         uuid        primary key default gen_random_uuid(),
  name       text        null,
  email      text        not null unique,
  role       text        not null default 'admin',
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_staff_users_updated_at on public.staff_users;
create trigger trg_staff_users_updated_at
before update on public.staff_users
for each row execute function public.set_updated_at();

-- =====================================================================
-- 11) reservations
-- =====================================================================
create table if not exists public.reservations (
  id                  uuid        primary key default gen_random_uuid(),
  space_id            uuid        not null references public.spaces(id)      on delete restrict,
  client_id           uuid        not null references public.clients(id)     on delete restrict,
  start_at            timestamptz not null,
  end_at              timestamptz not null,
  status              text        not null default 'pending'
                        check (status in ('pending','confirmed','cancelled','completed','no_show')),
  people_count        integer     null,
  usage_purpose       text        null,
  total_price         numeric(10,2) null,
  source              text        not null default 'web'
                        check (source in ('web','operator','request_approved')),
  created_by_staff_id uuid        null references public.staff_users(id) on delete set null,
  cancel_reason       text        null,
  cancelled_at        timestamptz null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists idx_reservations_space_start on public.reservations(space_id, start_at);
create index if not exists idx_reservations_client      on public.reservations(client_id);
create index if not exists idx_reservations_status      on public.reservations(status);

drop trigger if exists trg_reservations_updated_at on public.reservations;
create trigger trg_reservations_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

-- =====================================================================
-- 12) RLS — deny-all
-- Toda a aplicação acessa o banco pelo service_role (server-client),
-- que IGNORA RLS. O browser (anon key) NÃO lê tabelas — só usa Storage.
-- Logo, habilitamos RLS sem policies: bloqueia qualquer acesso anônimo
-- direto às tabelas, sem quebrar a aplicação.
-- =====================================================================
alter table public.system_settings  enable row level security;
alter table public.space_types      enable row level security;
alter table public.resources        enable row level security;
alter table public.spaces           enable row level security;
alter table public.space_resources  enable row level security;
alter table public.opening_hours    enable row level security;
alter table public.blackout_periods enable row level security;
alter table public.clients          enable row level security;
alter table public.staff_users      enable row level security;
alter table public.reservations     enable row level security;

-- =====================================================================
-- 13) Storage — bucket "spaces" (imagens dos espaços)
-- Usado em app/admin/espacos/edit-space-modal.tsx (upload + getPublicUrl).
-- ATENÇÃO DE SEGURANÇA: hoje o upload é feito no browser com a anon key,
-- por isso as policies abaixo permitem escrita anônima no bucket.
-- Recomendação futura: mover o upload para uma route server-side usando
-- o service_role e remover as policies de insert/update/delete anônimas.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('spaces', 'spaces', true)
on conflict (id) do nothing;

drop policy if exists "spaces_public_read"   on storage.objects;
drop policy if exists "spaces_anon_insert"   on storage.objects;
drop policy if exists "spaces_anon_update"   on storage.objects;
drop policy if exists "spaces_anon_delete"   on storage.objects;

create policy "spaces_public_read" on storage.objects
  for select using (bucket_id = 'spaces');

create policy "spaces_anon_insert" on storage.objects
  for insert with check (bucket_id = 'spaces');

create policy "spaces_anon_update" on storage.objects
  for update using (bucket_id = 'spaces') with check (bucket_id = 'spaces');

create policy "spaces_anon_delete" on storage.objects
  for delete using (bucket_id = 'spaces');
