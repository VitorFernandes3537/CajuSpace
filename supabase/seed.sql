-- CajuSpace — Seed de demonstração (dados fictícios, LGPD-safe)
-- Rode DEPOIS de 001_init.sql. Idempotente (usa upsert por chaves naturais).
-- Supabase Studio → SQL Editor → cole → Run.

-- 1) Configuração global (linha única id=1)
insert into public.system_settings (id, default_open_time, default_close_time, slot_duration_minutes)
values (1, '08:00:00', '22:00:00', 60)
on conflict (id) do update
  set default_open_time = excluded.default_open_time,
      default_close_time = excluded.default_close_time,
      slot_duration_minutes = excluded.slot_duration_minutes;

-- 2) Tipos de espaço
insert into public.space_types (name, description) values
  ('Sala de Reunião',     'Salas para reuniões e encontros de equipe'),
  ('Auditório',           'Espaços para palestras e eventos maiores'),
  ('Sala de Treinamento', 'Ambientes para cursos e workshops'),
  ('Coworking',           'Estações compartilhadas de trabalho'),
  ('Estúdio',             'Estúdio para gravação e produção de conteúdo')
on conflict do nothing;

-- 3) Recursos
insert into public.resources (name, description) values
  ('Projetor',        'Projetor Full HD com HDMI'),
  ('TV 4K',           'Televisão 55" 4K com espelhamento'),
  ('Wi-Fi',           'Internet dedicada de alta velocidade'),
  ('Ar-condicionado', 'Climatização individual'),
  ('Quadro branco',   'Quadro branco com pincéis'),
  ('Café',            'Estação de café e água'),
  ('Sistema de som',  'Caixas de som e microfone'),
  ('Webcam',          'Webcam para videoconferência')
on conflict do nothing;

-- 4) Espaços (slug é a chave natural)
insert into public.spaces (name, slug, capacity, description, default_hourly_price, space_type_id, is_active)
values
  ('Sala Caju 1',       'sala-caju-1',       8,  'Sala de reunião compacta para até 8 pessoas.', 60.00,
     (select id from public.space_types where name = 'Sala de Reunião'),     true),
  ('Sala Caju 2',       'sala-caju-2',       12, 'Sala de reunião ampla com TV 4K.',             90.00,
     (select id from public.space_types where name = 'Sala de Reunião'),     true),
  ('Auditório Central', 'auditorio-central', 80, 'Auditório para palestras e demodays.',        250.00,
     (select id from public.space_types where name = 'Auditório'),           true),
  ('Lab de Treinamento','lab-treinamento',   24, 'Sala equipada para workshops e cursos.',      120.00,
     (select id from public.space_types where name = 'Sala de Treinamento'), true),
  ('Espaço Coworking',  'espaco-coworking',  30, 'Estações compartilhadas com café incluso.',    35.00,
     (select id from public.space_types where name = 'Coworking'),           true),
  ('Estúdio Criativo',  'estudio-criativo',  6,  'Estúdio para gravação de vídeo e podcast.',   140.00,
     (select id from public.space_types where name = 'Estúdio'),             false)
on conflict (slug) do nothing;

-- 5) Vínculos espaço <-> recursos
insert into public.space_resources (space_id, resource_id)
select s.id, r.id
from public.spaces s
join public.resources r
  on (s.slug = 'sala-caju-1'       and r.name in ('Wi-Fi','Ar-condicionado','Quadro branco','TV 4K'))
  or (s.slug = 'sala-caju-2'       and r.name in ('Wi-Fi','Ar-condicionado','TV 4K','Café'))
  or (s.slug = 'auditorio-central' and r.name in ('Wi-Fi','Ar-condicionado','Projetor','Sistema de som'))
  or (s.slug = 'lab-treinamento'   and r.name in ('Wi-Fi','Ar-condicionado','Projetor','Quadro branco','Webcam'))
  or (s.slug = 'espaco-coworking'  and r.name in ('Wi-Fi','Café','Ar-condicionado'))
  or (s.slug = 'estudio-criativo'  and r.name in ('Wi-Fi','Sistema de som','Webcam'))
on conflict do nothing;

-- 6) Horário de funcionamento: seg–sex 08:00–22:00; sáb 08:00–14:00; dom fechado
insert into public.opening_hours (space_id, weekday, start_time, end_time, is_closed)
select s.id, wd.weekday, wd.start_time, wd.end_time, wd.is_closed
from public.spaces s
cross join (values
  (0, null,       null,       true),   -- domingo
  (1, '08:00'::time, '22:00'::time, false),
  (2, '08:00'::time, '22:00'::time, false),
  (3, '08:00'::time, '22:00'::time, false),
  (4, '08:00'::time, '22:00'::time, false),
  (5, '08:00'::time, '22:00'::time, false),
  (6, '08:00'::time, '14:00'::time, false)   -- sábado
) as wd(weekday, start_time, end_time, is_closed)
on conflict (space_id, weekday) do nothing;

-- 7) Usuário da equipe (login: este email + o PIN definido em ADMIN_PIN)
insert into public.staff_users (name, email, role, is_active)
values ('Administrador CajuSpace', 'admin@cajuspace.local', 'admin', true)
on conflict (email) do nothing;

-- 8) Clientes fictícios (documentos claramente fake — LGPD-safe)
insert into public.clients (name, type, email, phone, document, notes) values
  ('Ana Souza',            'individual', 'ana.demo@example.com',    '11999990001', '11111111111',    'Cliente de demonstração'),
  ('Bruno Lima',           'individual', 'bruno.demo@example.com',  '11999990002', '22222222222',    'Cliente de demonstração'),
  ('Startup Caju LTDA',    'company',    'contato@cajudemo.example','11999990003', '11222333000181', 'Empresa de demonstração')
on conflict (document) do nothing;

-- 9) Reservas de exemplo (datas relativas a hoje)
insert into public.reservations
  (space_id, client_id, start_at, end_at, status, people_count, usage_purpose, total_price, source)
select s.id, c.id, r.start_at, r.end_at, r.status, r.people_count, r.usage_purpose, r.total_price, 'web'
from (values
  ('sala-caju-1',       '11111111111',
     (current_date + 1 + time '14:00')::timestamptz, (current_date + 1 + time '16:00')::timestamptz,
     'confirmed', 6,  'Reunião de planejamento',        120.00),
  ('auditorio-central', '11222333000181',
     (current_date + 2 + time '19:00')::timestamptz, (current_date + 2 + time '21:00')::timestamptz,
     'pending',   60, 'Palestra sobre tecnologia',      500.00),
  ('lab-treinamento',   '22222222222',
     (current_date + 3 + time '09:00')::timestamptz, (current_date + 3 + time '12:00')::timestamptz,
     'confirmed', 20, 'Workshop de React',              360.00),
  ('sala-caju-2',       '22222222222',
     (current_date - 5 + time '10:00')::timestamptz, (current_date - 5 + time '11:00')::timestamptz,
     'completed', 10, 'Entrevista',                      90.00)
) as r(slug, document, start_at, end_at, status, people_count, usage_purpose, total_price)
join public.spaces  s on s.slug = r.slug
join public.clients c on c.document = r.document
on conflict do nothing;
