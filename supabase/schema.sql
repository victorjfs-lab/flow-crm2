create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.crm_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  role text not null default 'agent' check (role in ('admin', 'manager', 'agent')),
  whatsapp_phone text,
  hubspot_owner_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  color_token text not null,
  stage_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  hubspot_list_id text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope_type text not null check (scope_type in ('stage', 'list')),
  stage_id uuid references public.pipeline_stages(id) on delete cascade,
  list_id uuid references public.contact_lists(id) on delete cascade,
  body text not null,
  is_active boolean not null default true,
  created_by uuid references public.crm_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint whatsapp_templates_scope_check check (
    (scope_type = 'stage' and stage_id is not null and list_id is null)
    or
    (scope_type = 'list' and list_id is not null and stage_id is null)
  )
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  first_name text,
  email text,
  whatsapp_phone text,
  form_name text,
  source text,
  notes text,
  current_stage_id uuid not null references public.pipeline_stages(id),
  current_list_id uuid references public.contact_lists(id),
  owner_id uuid references public.crm_users(id) on delete set null,
  hubspot_contact_id text unique,
  hubspot_owner_id text,
  hubspot_last_synced_at timestamptz,
  entered_at timestamptz not null default timezone('utc', now()),
  last_interaction_at timestamptz,
  next_action_at timestamptz,
  sale_date timestamptz,
  sold_product text check (sold_product in ('smart', 'mentoria')),
  sold_amount numeric(12,2),
  day_trade_status text,
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color_token text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_tag_links (
  contact_id uuid not null references public.contacts(id) on delete cascade,
  tag_id uuid not null references public.contact_tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (contact_id, tag_id)
);

create table if not exists public.contact_interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('note', 'whatsapp', 'call', 'email', 'movement', 'system')),
  description text not null,
  happened_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.crm_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_stage_history (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  from_stage_id uuid references public.pipeline_stages(id),
  to_stage_id uuid not null references public.pipeline_stages(id),
  changed_by uuid references public.crm_users(id) on delete set null,
  reason text,
  changed_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_list_history (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  from_list_id uuid references public.contact_lists(id),
  to_list_id uuid references public.contact_lists(id),
  changed_by uuid references public.crm_users(id) on delete set null,
  changed_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_attachments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hubspot_sync_log (
  id uuid primary key default gen_random_uuid(),
  object_type text not null check (object_type in ('contact', 'list', 'owner')),
  object_id text not null,
  action text not null check (action in ('import', 'upsert', 'archive', 'error')),
  status text not null check (status in ('pending', 'success', 'error')),
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  synced_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_contacts_stage on public.contacts(current_stage_id);
create index if not exists idx_contacts_list on public.contacts(current_list_id);
create index if not exists idx_contacts_owner on public.contacts(owner_id);
create index if not exists idx_contacts_hubspot_contact_id on public.contacts(hubspot_contact_id);
create index if not exists idx_contact_interactions_contact_id on public.contact_interactions(contact_id, happened_at desc);
create index if not exists idx_contact_stage_history_contact_id on public.contact_stage_history(contact_id, changed_at desc);
create index if not exists idx_contact_list_history_contact_id on public.contact_list_history(contact_id, changed_at desc);
create index if not exists idx_contact_attachments_contact_id on public.contact_attachments(contact_id, created_at desc);
create index if not exists idx_hubspot_sync_log_object on public.hubspot_sync_log(object_type, object_id, synced_at desc);

drop trigger if exists trg_crm_users_updated_at on public.crm_users;
create trigger trg_crm_users_updated_at
before update on public.crm_users
for each row execute function public.set_updated_at();

drop trigger if exists trg_pipeline_stages_updated_at on public.pipeline_stages;
create trigger trg_pipeline_stages_updated_at
before update on public.pipeline_stages
for each row execute function public.set_updated_at();

drop trigger if exists trg_contact_lists_updated_at on public.contact_lists;
create trigger trg_contact_lists_updated_at
before update on public.contact_lists
for each row execute function public.set_updated_at();

drop trigger if exists trg_whatsapp_templates_updated_at on public.whatsapp_templates;
create trigger trg_whatsapp_templates_updated_at
before update on public.whatsapp_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

insert into public.pipeline_stages (code, name, color_token, stage_order)
values
  ('novo', 'Novo Lead', 'bg-stage-novo', 1),
  ('contato', 'Contato Inicial', 'bg-stage-contato', 2),
  ('espera', 'Espera Smart Flow', 'bg-stage-espera', 3),
  ('acompanhamento', 'Em Acompanhamento', 'bg-stage-acompanhamento', 4),
  ('proposta', 'Proposta Enviada', 'bg-stage-proposta', 5),
  ('fechado', 'Fechado', 'bg-stage-fechado', 6),
  ('perdido', 'Perdido', 'bg-stage-perdido', 7)
on conflict (code) do update
set
  name = excluded.name,
  color_token = excluded.color_token,
  stage_order = excluded.stage_order,
  updated_at = timezone('utc', now());

insert into public.contact_lists (name, description)
values
  ('Espera Smart Flow', 'Clientes aguardando liberacao ou chamada do fluxo Smart Flow'),
  ('Contato Inicial', 'Leads novos ou em qualificacao inicial'),
  ('Reengajamento', 'Clientes que voltaram a demonstrar interesse'),
  ('Proposta', 'Clientes em etapa comercial com proposta ativa'),
  ('Follow-up', 'Clientes em acompanhamento recorrente')
on conflict (name) do update
set
  description = excluded.description,
  updated_at = timezone('utc', now());
