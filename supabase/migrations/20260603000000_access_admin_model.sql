-- ============================================================
-- FINMED Calculadora — Migração 4
-- Modelo de acesso (trial + paywall) + Dashboard admin + RLS endurecido
--
-- Esta migração é o coração de segurança do lançamento da Masterclass.
-- Princípios:
--   1. Nenhum utilizador pode alterar o seu próprio acesso. As colunas de
--      controlo de acesso só são escritas por funções SECURITY DEFINER
--      (gated por is_admin) ou pelo service_role (webhooks/triggers).
--   2. O acesso é calculado num único sítio: public.compute_access().
--   3. Todas as operações de admin passam por RPCs que verificam is_admin.
--
-- Aplicar via Supabase Dashboard → SQL Editor → colar tudo → Run.
-- Idempotente: pode correr mais do que uma vez sem partir nada.
-- ============================================================

-- ============================================================
-- 0. EXTENSÕES / SCHEMA AUXILIAR
-- ============================================================
create schema if not exists app;

-- ============================================================
-- 1. NOVAS COLUNAS EM profiles
-- ------------------------------------------------------------
-- is_admin        → acesso ao dashboard admin (Marta/Luísa/Tomás)
-- is_suspended    → kill switch por utilizador (sobrepõe-se a tudo)
-- allowed         → email consta na lista de inscritos (paywall)
-- cohort          → segmento p/ operações em massa (ex: masterclass_2026_07)
-- trial_ends_at   → fim do mês de trial gratuito
-- access_until    → acesso concedido manualmente pelo admin (exceções)
-- ============================================================
alter table public.profiles
  add column if not exists is_admin      boolean      not null default false,
  add column if not exists is_suspended  boolean      not null default false,
  add column if not exists allowed        boolean      not null default false,
  add column if not exists cohort         text,
  add column if not exists trial_ends_at  timestamptz,
  add column if not exists access_until   timestamptz;

create index if not exists profiles_cohort_idx on public.profiles(cohort);
create index if not exists profiles_email_lower_idx on public.profiles(lower(email));

-- ============================================================
-- 2. ENDURECER RLS DE profiles — column-level grants
-- ------------------------------------------------------------
-- CRÍTICO: por defeito o Supabase concede UPDATE em TODAS as colunas ao
-- role `authenticated`. Isto permitiria a um utilizador autenticado fazer
-- UPDATE profiles SET is_admin=true / trial_ends_at='2099-...' na sua própria
-- linha (a policy `profiles_update_own` autoriza a linha, não a coluna).
-- Revogamos o UPDATE geral e concedemos apenas as colunas de perfil "soft".
-- As colunas de acesso ficam SEM grant para authenticated → impossível mexer.
-- ============================================================
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;
grant  update (full_name, phone, avatar_url) on public.profiles to authenticated;

-- INSERT direto em profiles pela app continua bloqueado (só o trigger,
-- que corre como definer, e o service_role inserem).
revoke insert on public.profiles from authenticated, anon;

-- A policy de update por linha continua a existir (do schema inicial).
-- Garantimos WITH CHECK para impedir trocar a identidade da própria linha.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- 3. is_admin() — helper SECURITY DEFINER (evita recursão de RLS)
-- ------------------------------------------------------------
-- Lê profiles.is_admin SEM passar pela RLS (definer), por isso pode ser
-- usado dentro de policies de profiles sem causar recursão infinita.
-- ============================================================
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = uid), false);
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

-- Guarda interno: levanta exceção se quem chama não for admin.
create or replace function app.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public, app
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;
end;
$$;

-- ============================================================
-- 4. POLICIES DE ADMIN (apenas SELECT — escritas via RPC)
-- ------------------------------------------------------------
-- Admin pode LER todos os perfis para o dashboard. Não pode escrever
-- diretamente (sem column grants); escreve via RPCs definer.
-- ============================================================
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Admin pode ler subscrições e passes de todos (para mostrar plano/datas).
drop policy if exists "subscriptions_select_admin" on public.subscriptions;
create policy "subscriptions_select_admin"
  on public.subscriptions for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "one_time_passes_select_admin" on public.one_time_passes;
create policy "one_time_passes_select_admin"
  on public.one_time_passes for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- NOTA: deliberadamente NÃO damos ao admin acesso às `simulations` de
-- outros utilizadores. Os cálculos imobiliários são privados; o admin
-- só gere acessos, não espreita simulações alheias.

-- ============================================================
-- 5. app_config — configuração global (singleton)
-- ------------------------------------------------------------
-- trial_start_date  → data a partir da qual conta o trial (11 ou 18 jul)
-- trial_days        → duração do trial (30)
-- public_signup_open→ false = paywall ativa; só inscritos entram
-- ============================================================
create table if not exists public.app_config (
  id              int primary key default 1,
  trial_start_date date        not null default '2026-07-11',
  trial_days      int          not null default 30,
  public_signup_open boolean   not null default false,
  updated_at      timestamptz  not null default now(),
  constraint app_config_singleton check (id = 1)
);

insert into public.app_config (id) values (1) on conflict (id) do nothing;

alter table public.app_config enable row level security;

-- Toda a gente autenticada pode LER a config (precisamos no gate p/ saber
-- se o signup público está aberto). Não há nada sensível aqui.
drop policy if exists "app_config_select_all" on public.app_config;
create policy "app_config_select_all"
  on public.app_config for select
  to authenticated
  using (true);

-- Escrita só via RPC admin. Sem policy de update/insert para authenticated.
revoke insert, update, delete on public.app_config from authenticated, anon;

-- ============================================================
-- 6. allowed_emails — lista de inscritos (paywall allowlist)
-- ------------------------------------------------------------
-- Importada manualmente do Go High Level antes de 11 jul.
-- Quando um destes emails faz signup, o trigger provisiona o trial.
-- ============================================================
create table if not exists public.allowed_emails (
  email        text primary key,
  full_name    text,
  plan         text,                 -- rótulo informativo (ex: 'masterclass')
  cohort       text not null default 'masterclass_2026_07',
  trial_start  date,                 -- override opcional ao app_config
  added_by     uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

create index if not exists allowed_emails_cohort_idx on public.allowed_emails(cohort);

alter table public.allowed_emails enable row level security;

-- Só admin lê. Escrita só via RPC.
drop policy if exists "allowed_emails_select_admin" on public.allowed_emails;
create policy "allowed_emails_select_admin"
  on public.allowed_emails for select
  to authenticated
  using (public.is_admin(auth.uid()));

revoke insert, update, delete on public.allowed_emails from authenticated, anon;

-- Função definer para o gate verificar se um email está na allowlist,
-- sem dar SELECT da tabela toda ao utilizador.
create or replace function public.email_is_allowed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.allowed_emails
    where lower(email) = lower(p_email)
  );
$$;

revoke all on function public.email_is_allowed(text) from public;
grant execute on function public.email_is_allowed(text) to authenticated;

-- ============================================================
-- 7. waitlist — captura de emails de quem não está na lista
-- ============================================================
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  source     text default 'app_gate',
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_uidx on public.waitlist(lower(email));

alter table public.waitlist enable row level security;

-- Só admin lê.
drop policy if exists "waitlist_select_admin" on public.waitlist;
create policy "waitlist_select_admin"
  on public.waitlist for select
  to authenticated
  using (public.is_admin(auth.uid()));

revoke insert, update, delete on public.waitlist from authenticated, anon;

-- Inserção via RPC definer (qualquer utilizador autenticado não-listado
-- pode juntar-se à lista de espera, mas não consegue LER a tabela).
create or replace function public.join_waitlist(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'email inválido';
  end if;
  insert into public.waitlist (email, source)
  values (lower(trim(p_email)), 'app_gate')
  on conflict (lower(email)) do nothing;
end;
$$;

revoke all on function public.join_waitlist(text) from public;
grant execute on function public.join_waitlist(text) to authenticated, anon;

-- ============================================================
-- 8. compute_access() + my_access() — cálculo único de acesso
-- ------------------------------------------------------------
-- Regra final de acesso:
--   suspenso              → SEM acesso (sobrepõe tudo)
--   admin                 → acesso total
--   pago (sub/one-off)    → acesso
--   trial_ends_at > now   → acesso (trial)
--   access_until  > now   → acesso (concedido pelo admin)
-- ============================================================
create or replace function public.compute_access(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pr            public.profiles%rowtype;
  v_paid        boolean := false;
  v_trial       boolean := false;
  v_granted     boolean := false;
  v_has_access  boolean := false;
  v_state       text    := 'none';
  v_days_left   int;
  v_effective_end timestamptz;
begin
  select * into pr from public.profiles where id = p_user;
  if not found then
    return jsonb_build_object('has_access', false, 'state', 'none', 'is_admin', false, 'allowed', false);
  end if;

  -- Pago?
  v_paid := exists(
    select 1 from public.subscriptions s
    where s.user_id = p_user
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  ) or exists(
    select 1 from public.one_time_passes o
    where o.user_id = p_user and o.valid_until > now()
  );

  v_trial   := pr.trial_ends_at is not null and pr.trial_ends_at > now();
  v_granted := pr.access_until  is not null and pr.access_until  > now();

  if pr.is_suspended then
    v_has_access := false;
    v_state := 'suspended';
  elsif pr.is_admin then
    v_has_access := true;
    v_state := 'admin';
  elsif v_paid then
    v_has_access := true;
    v_state := 'active';
  elsif v_trial then
    v_has_access := true;
    v_state := 'trial';
    v_effective_end := pr.trial_ends_at;
  elsif v_granted then
    v_has_access := true;
    v_state := 'granted';
    v_effective_end := pr.access_until;
  else
    v_has_access := false;
    -- distinguir "trial já terminou" de "nunca teve" para a UI
    if pr.trial_ends_at is not null and pr.trial_ends_at <= now() then
      v_state := 'expired';
    elsif not pr.allowed and not (select public_signup_open from public.app_config where id = 1) then
      v_state := 'not_allowed';
    else
      v_state := 'none';
    end if;
  end if;

  if v_effective_end is not null then
    v_days_left := greatest(0, ceil(extract(epoch from (v_effective_end - now())) / 86400.0)::int);
  end if;

  return jsonb_build_object(
    'has_access', v_has_access,
    'state', v_state,
    'is_admin', pr.is_admin,
    'allowed', pr.allowed or (select public_signup_open from public.app_config where id = 1),
    'is_suspended', pr.is_suspended,
    'cohort', pr.cohort,
    'trial_ends_at', pr.trial_ends_at,
    'access_until', pr.access_until,
    'effective_end', v_effective_end,
    'days_left', v_days_left,
    'plan_status', pr.plan_status,
    'plan_kind', pr.plan_kind
  );
end;
$$;

revoke all on function public.compute_access(uuid) from public;
grant execute on function public.compute_access(uuid) to authenticated, service_role;

-- Wrapper que só devolve o acesso do PRÓPRIO utilizador (auth.uid()).
create or replace function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.compute_access(auth.uid());
$$;

revoke all on function public.my_access() from public;
grant execute on function public.my_access() to authenticated;

-- ============================================================
-- 9. TRIGGER handle_new_user — auto-provisão de trial na allowlist
-- ------------------------------------------------------------
-- Quando alguém faz signup:
--   - se o email está em allowed_emails → marca allowed, cohort e
--     trial_ends_at (= trial_start + trial_days).
--   - senão → allowed=false (o gate mostra a lista de espera).
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ae        public.allowed_emails%rowtype;
  cfg       public.app_config%rowtype;
  v_start   date;
  v_trial_ends timestamptz;
  v_allowed boolean := false;
  v_cohort  text;
  v_name    text;
begin
  select * into cfg from public.app_config where id = 1;
  select * into ae from public.allowed_emails where lower(email) = lower(new.email);

  if found then
    v_allowed := true;
    v_cohort  := ae.cohort;
    v_name    := ae.full_name;
    v_start   := coalesce(ae.trial_start, cfg.trial_start_date);
    -- trial conta a partir de hoje se já passámos a data de início global,
    -- senão a partir da data de início — para o trial não começar antes.
    v_trial_ends := (greatest(v_start, current_date) + (coalesce(cfg.trial_days, 30) || ' days')::interval);
  end if;

  insert into public.profiles (id, email, full_name, allowed, cohort, trial_ends_at)
  values (new.id, new.email, v_name, v_allowed, v_cohort, v_trial_ends)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ============================================================
-- 10. RPCs DE ADMIN (todas gated por app.require_admin())
-- ============================================================

-- 10.1 Listar utilizadores (com pesquisa) + estado de acesso calculado
create or replace function public.admin_list_users(p_search text default null, p_limit int default 500)
returns table (
  id uuid, email text, full_name text, phone text, created_at timestamptz,
  is_admin boolean, is_suspended boolean, allowed boolean, cohort text,
  trial_ends_at timestamptz, access_until timestamptz,
  plan_status text, plan_kind text, access jsonb
)
language plpgsql
stable
security definer
set search_path = public, app
as $$
begin
  perform app.require_admin();
  return query
  select p.id, p.email, p.full_name, p.phone, p.created_at,
         p.is_admin, p.is_suspended, p.allowed, p.cohort,
         p.trial_ends_at, p.access_until, p.plan_status, p.plan_kind,
         public.compute_access(p.id) as access
  from public.profiles p
  where p_search is null
     or p.email ilike '%' || p_search || '%'
     or coalesce(p.full_name, '') ilike '%' || p_search || '%'
  order by p.created_at desc
  limit greatest(1, least(p_limit, 2000));
end;
$$;

-- 10.2 Suspender / reativar utilizador (liga/desliga acesso)
create or replace function public.admin_set_suspended(p_user uuid, p_suspended boolean)
returns void
language plpgsql security definer set search_path = public, app as $$
begin
  perform app.require_admin();
  update public.profiles set is_suspended = p_suspended where id = p_user;
end;
$$;

-- 10.3 Dar tempo extra de acesso (exceções pontuais)
-- Estende access_until em p_days a partir do maior entre now() e o atual.
create or replace function public.admin_grant_days(p_user uuid, p_days int)
returns timestamptz
language plpgsql security definer set search_path = public, app as $$
declare v_base timestamptz; v_new timestamptz;
begin
  perform app.require_admin();
  if p_days is null or p_days = 0 then raise exception 'p_days inválido'; end if;
  select greatest(now(), coalesce(access_until, now()), coalesce(trial_ends_at, now()))
    into v_base from public.profiles where id = p_user;
  v_new := v_base + (p_days || ' days')::interval;
  update public.profiles set access_until = v_new where id = p_user;
  return v_new;
end;
$$;

-- 10.4 Definir/ajustar a data de fim de trial de um utilizador
create or replace function public.admin_set_trial(p_user uuid, p_ends timestamptz)
returns void
language plpgsql security definer set search_path = public, app as $$
begin
  perform app.require_admin();
  update public.profiles set trial_ends_at = p_ends where id = p_user;
end;
$$;

-- 10.5 Marcar/desmarcar um utilizador como admin
-- Protege contra ficar sem nenhum admin.
create or replace function public.admin_set_admin(p_user uuid, p_is_admin boolean)
returns void
language plpgsql security definer set search_path = public, app as $$
declare v_count int;
begin
  perform app.require_admin();
  if p_is_admin = false then
    select count(*) into v_count from public.profiles where is_admin = true and id <> p_user;
    if v_count = 0 then raise exception 'não pode remover o último admin'; end if;
  end if;
  update public.profiles set is_admin = p_is_admin where id = p_user;
end;
$$;

-- 10.6 Marcar/desmarcar um utilizador como "allowed" (entra na app)
create or replace function public.admin_set_allowed(p_user uuid, p_allowed boolean)
returns void
language plpgsql security definer set search_path = public, app as $$
begin
  perform app.require_admin();
  update public.profiles set allowed = p_allowed where id = p_user;
end;
$$;

-- 10.7 TRANCAR EM MASSA — suspende todos os utilizadores de um cohort
-- (a Marta usa isto a 28 jul para fechar o trial gratuito da Masterclass)
create or replace function public.admin_mass_lock(p_cohort text)
returns int
language plpgsql security definer set search_path = public, app as $$
declare v_count int;
begin
  perform app.require_admin();
  update public.profiles set is_suspended = true
    where cohort = p_cohort and is_admin = false;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.admin_mass_unlock(p_cohort text)
returns int
language plpgsql security definer set search_path = public, app as $$
declare v_count int;
begin
  perform app.require_admin();
  update public.profiles set is_suspended = false where cohort = p_cohort;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 10.8 Importar inscritos (CSV/Excel parseado no cliente → jsonb)
-- Cada elemento: { email, full_name, plan, cohort?, trial_start? }
-- Faz upsert em allowed_emails E re-provisiona perfis já existentes
-- (caso alguém já tivesse tentado entrar antes de ser importado).
create or replace function public.admin_import_allowed(p_rows jsonb, p_cohort text default 'masterclass_2026_07')
returns int
language plpgsql security definer set search_path = public, app as $$
declare
  r jsonb;
  v_email text;
  v_count int := 0;
  cfg public.app_config%rowtype;
  v_start date;
  v_trial_ends timestamptz;
begin
  perform app.require_admin();
  select * into cfg from public.app_config where id = 1;

  for r in select * from jsonb_array_elements(p_rows)
  loop
    v_email := lower(trim(r->>'email'));
    continue when v_email is null or position('@' in v_email) = 0;

    insert into public.allowed_emails (email, full_name, plan, cohort, trial_start, added_by)
    values (
      v_email,
      nullif(trim(r->>'full_name'), ''),
      nullif(trim(r->>'plan'), ''),
      coalesce(nullif(trim(r->>'cohort'), ''), p_cohort),
      (nullif(trim(r->>'trial_start'), ''))::date,
      auth.uid()
    )
    on conflict (email) do update
      set full_name = coalesce(excluded.full_name, public.allowed_emails.full_name),
          plan      = coalesce(excluded.plan, public.allowed_emails.plan),
          cohort    = excluded.cohort,
          trial_start = coalesce(excluded.trial_start, public.allowed_emails.trial_start);

    -- Re-provisiona perfil já existente com este email
    v_start := coalesce((nullif(trim(r->>'trial_start'), ''))::date, cfg.trial_start_date);
    v_trial_ends := (greatest(v_start, current_date) + (coalesce(cfg.trial_days, 30) || ' days')::interval);

    update public.profiles p
      set allowed = true,
          cohort = coalesce(nullif(trim(r->>'cohort'), ''), p_cohort),
          full_name = coalesce(p.full_name, nullif(trim(r->>'full_name'), '')),
          trial_ends_at = coalesce(p.trial_ends_at, v_trial_ends)
      where lower(p.email) = v_email;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 10.9 Ler / actualizar configuração global
create or replace function public.admin_get_config()
returns public.app_config
language plpgsql stable security definer set search_path = public, app as $$
declare cfg public.app_config%rowtype;
begin
  perform app.require_admin();
  select * into cfg from public.app_config where id = 1;
  return cfg;
end;
$$;

create or replace function public.admin_set_config(
  p_trial_start_date date default null,
  p_trial_days int default null,
  p_public_signup_open boolean default null
)
returns public.app_config
language plpgsql security definer set search_path = public, app as $$
declare cfg public.app_config%rowtype;
begin
  perform app.require_admin();
  update public.app_config set
    trial_start_date   = coalesce(p_trial_start_date, trial_start_date),
    trial_days         = coalesce(p_trial_days, trial_days),
    public_signup_open = coalesce(p_public_signup_open, public_signup_open),
    updated_at = now()
  where id = 1
  returning * into cfg;
  return cfg;
end;
$$;

-- 10.10 Lista de espera (para o admin ver/exportar)
create or replace function public.admin_list_waitlist(p_limit int default 1000)
returns setof public.waitlist
language plpgsql stable security definer set search_path = public, app as $$
begin
  perform app.require_admin();
  return query select * from public.waitlist order by created_at desc limit p_limit;
end;
$$;

-- 10.11 Lista de inscritos importados
create or replace function public.admin_list_allowed(p_limit int default 5000)
returns setof public.allowed_emails
language plpgsql stable security definer set search_path = public, app as $$
begin
  perform app.require_admin();
  return query select * from public.allowed_emails order by created_at desc limit p_limit;
end;
$$;

-- Grants de execução das RPCs admin (a verificação real é dentro de cada uma)
grant execute on function
  public.admin_list_users(text, int),
  public.admin_set_suspended(uuid, boolean),
  public.admin_grant_days(uuid, int),
  public.admin_set_trial(uuid, timestamptz),
  public.admin_set_admin(uuid, boolean),
  public.admin_set_allowed(uuid, boolean),
  public.admin_mass_lock(text),
  public.admin_mass_unlock(text),
  public.admin_import_allowed(jsonb, text),
  public.admin_get_config(),
  public.admin_set_config(date, int, boolean),
  public.admin_list_waitlist(int),
  public.admin_list_allowed(int)
to authenticated;

-- ============================================================
-- 11. ATUALIZAR v_user_access (compat) — agora reflete o novo modelo
-- ============================================================
create or replace view public.v_user_access as
select
  p.id as user_id,
  p.email,
  p.plan_status,
  p.plan_kind,
  p.plan_renews_at,
  (public.compute_access(p.id) ->> 'has_access')::boolean as has_paid_access
from public.profiles p;

grant select on public.v_user_access to authenticated;

-- ============================================================
-- 12. SEED DE ADMINS
-- ------------------------------------------------------------
-- ⚠️ EDITA OS EMAILS ABAIXO antes de correr (ou corre depois isoladamente).
-- Só funciona depois de cada pessoa ter feito login pelo menos uma vez
-- (o profile tem de existir). Se ainda não existir, volta a correr isto
-- depois do primeiro login dela.
-- ============================================================
update public.profiles set is_admin = true, allowed = true
where lower(email) in (
  lower('tomas@digitalplane.pt')
  -- , lower('EMAIL_DA_MARTA@finmed.pt')
  -- , lower('EMAIL_DA_LUISA@finmed.pt')
);

-- ============================================================
-- FIM DA MIGRAÇÃO 4
-- ============================================================
