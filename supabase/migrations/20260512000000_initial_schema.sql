-- ============================================================
-- FINMED Calculadora — Schema inicial
-- Tabelas: profiles, simulations, subscriptions, one_time_passes
-- ============================================================

-- 1) PROFILES — extende auth.users
-- Criada automaticamente em sign-up via trigger
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  phone        text,
  -- Tipo de utilizador: 'consumer' (cliente final), 'professional' (consultor)
  user_type    text default 'consumer' check (user_type in ('consumer', 'professional')),
  -- Sub status sincronizado por webhook do Stripe (cache local)
  plan_status  text default 'free' check (plan_status in ('free', 'active', 'past_due', 'canceled', 'expired')),
  plan_kind    text check (plan_kind in ('monthly', 'annual', 'one_off_12m')),
  plan_renews_at timestamptz,
  stripe_customer_id text unique,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index profiles_stripe_customer_idx on public.profiles(stripe_customer_id);

-- 2) SIMULATIONS — histórico de cálculos
create table public.simulations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  -- Label que o utilizador atribui (ex: "T2 Graça", "Casa pais")
  label           text,
  scenario        text not null check (scenario in ('hpp', 'geral', 'pre1989', 'estado')),
  -- Inputs (JSON para flexibilidade)
  inputs          jsonb not null,
  -- Outputs (JSON com tudo o que aparece no resultado)
  outputs         jsonb not null,
  -- Campos extraídos para queries rápidas / listagens
  irs_isolado     numeric(12, 2),
  mais_valia_bruta numeric(12, 2),
  tributavel_final numeric(12, 2),
  created_at      timestamptz default now()
);

create index simulations_user_idx on public.simulations(user_id, created_at desc);

-- 3) SUBSCRIPTIONS — registo histórico (Stripe é a fonte de verdade, isto é cache + audit log)
create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id     text not null,
  stripe_price_id        text not null,
  plan_kind              text not null check (plan_kind in ('monthly', 'annual')),
  status                 text not null,  -- active, past_due, canceled, incomplete, etc.
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

create index subscriptions_user_idx on public.subscriptions(user_id);
create index subscriptions_stripe_idx on public.subscriptions(stripe_subscription_id);

-- 4) ONE_TIME_PASSES — pagamentos únicos com validade
create table public.one_time_passes (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  stripe_payment_intent_id text unique,
  stripe_checkout_session_id text unique,
  amount                numeric(10, 2) not null,
  currency              text default 'EUR',
  valid_from            timestamptz not null default now(),
  valid_until           timestamptz not null,
  created_at            timestamptz default now()
);

create index one_time_passes_user_idx on public.one_time_passes(user_id, valid_until desc);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Cria profile automaticamente quando alguém faz sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.simulations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.one_time_passes enable row level security;

-- PROFILES: utilizador só vê e edita o próprio profile
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- SIMULATIONS: utilizador CRUD nas próprias
create policy "simulations_select_own"
  on public.simulations for select
  using (auth.uid() = user_id);

create policy "simulations_insert_own"
  on public.simulations for insert
  with check (auth.uid() = user_id);

create policy "simulations_update_own"
  on public.simulations for update
  using (auth.uid() = user_id);

create policy "simulations_delete_own"
  on public.simulations for delete
  using (auth.uid() = user_id);

-- SUBSCRIPTIONS: utilizador só LÊ as próprias. Inserts/updates só via webhook (service_role).
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- ONE_TIME_PASSES: idem
create policy "one_time_passes_select_own"
  on public.one_time_passes for select
  using (auth.uid() = user_id);

-- ============================================================
-- VIEW: tem_acesso_pago (helper para o app saber se utilizador tem acesso premium ativo)
-- ============================================================
create or replace view public.v_user_access as
select
  p.id as user_id,
  p.email,
  p.plan_status,
  p.plan_kind,
  p.plan_renews_at,
  -- Tem acesso pago se: subscription ativa OU one-off ainda válido
  exists(
    select 1 from public.subscriptions s
    where s.user_id = p.id
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  ) or exists(
    select 1 from public.one_time_passes o
    where o.user_id = p.id
      and o.valid_until > now()
  ) as has_paid_access
from public.profiles p;

grant select on public.v_user_access to authenticated;
