-- ============================================================
-- FINMED Calculadora — Migração 7
-- Preparação para o lançamento público:
--   1. "Trancar em massa" passa a TERMINAR O TRIAL (não suspender),
--      para que quem pagar a seguir mantenha o acesso (a suspensão é
--      um kill-switch manual que se sobrepõe a tudo, incl. pagamentos).
--   2. Registo de auditoria — quem alterou o quê no acesso e quando.
--
-- Idempotente. Requer as migrações 4 e 6 aplicadas antes.
-- ============================================================

-- ============================================================
-- 1. SEMÂNTICA DE TRANCAR EM MASSA = TERMINAR TRIAL
-- ------------------------------------------------------------
-- Antes: suspendia o cohort (is_suspended=true). Problema: a suspensão
-- sobrepõe-se ao pagamento, por isso um inscrito que pagasse depois do
-- dia 28 jul ficaria bloqueado.
-- Agora: termina o trial (trial_ends_at = now()). Quem tiver pago
-- (one_time_pass / subscrição) ou tiver acesso concedido (access_until)
-- mantém o acesso; os restantes caem na paywall e podem pagar.
-- ============================================================
create or replace function public.admin_mass_lock(p_cohort text)
returns int
language plpgsql security definer set search_path = public, app as $$
declare v_count int;
begin
  perform app.require_admin();
  update public.profiles
    set trial_ends_at = now()
    where cohort = p_cohort
      and is_admin = false
      and trial_ends_at is not null
      and trial_ends_at > now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Reabrir = voltar a dar trial a partir de agora (duração do app_config).
create or replace function public.admin_mass_unlock(p_cohort text)
returns int
language plpgsql security definer set search_path = public, app as $$
declare v_count int; v_days int;
begin
  perform app.require_admin();
  select trial_days into v_days from public.app_config where id = 1;
  update public.profiles
    set trial_ends_at = now() + (coalesce(v_days, 30) || ' days')::interval,
        is_suspended = false
    where cohort = p_cohort and is_admin = false;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ============================================================
-- 2. REGISTO DE AUDITORIA
-- ============================================================
create table if not exists public.admin_audit (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  actor_email  text,
  action       text not null,
  target_user  uuid,
  target_email text,
  detail       jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit(created_at desc);
create index if not exists admin_audit_target_idx on public.admin_audit(target_user);

alter table public.admin_audit enable row level security;

-- Só admin lê. Ninguém escreve diretamente (só os triggers, via definer).
drop policy if exists "admin_audit_select_admin" on public.admin_audit;
create policy "admin_audit_select_admin"
  on public.admin_audit for select
  to authenticated
  using (public.is_admin(auth.uid()));

revoke insert, update, delete on public.admin_audit from authenticated, anon;

-- ------------------------------------------------------------
-- 2.1 Trigger: regista alterações às colunas de acesso de profiles
-- ------------------------------------------------------------
create or replace function app.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_email text;
  v_detail jsonb := '{}'::jsonb;
  v_action text;
begin
  if tg_op = 'DELETE' then
    select email into v_actor_email from public.profiles where id = v_actor;
    insert into public.admin_audit(actor_id, actor_email, action, target_user, target_email, detail)
    values (v_actor, v_actor_email, 'delete_user', old.id, old.email, jsonb_build_object('cohort', old.cohort));
    return old;
  end if;

  -- UPDATE: só regista se mudou alguma coluna de acesso.
  if new.is_suspended is distinct from old.is_suspended then
    v_detail := v_detail || jsonb_build_object('is_suspended', jsonb_build_object('de', old.is_suspended, 'para', new.is_suspended));
  end if;
  if new.is_admin is distinct from old.is_admin then
    v_detail := v_detail || jsonb_build_object('is_admin', jsonb_build_object('de', old.is_admin, 'para', new.is_admin));
  end if;
  if new.allowed is distinct from old.allowed then
    v_detail := v_detail || jsonb_build_object('allowed', jsonb_build_object('de', old.allowed, 'para', new.allowed));
  end if;
  if new.trial_ends_at is distinct from old.trial_ends_at then
    v_detail := v_detail || jsonb_build_object('trial_ends_at', jsonb_build_object('de', old.trial_ends_at, 'para', new.trial_ends_at));
  end if;
  if new.access_until is distinct from old.access_until then
    v_detail := v_detail || jsonb_build_object('access_until', jsonb_build_object('de', old.access_until, 'para', new.access_until));
  end if;
  if new.cohort is distinct from old.cohort then
    v_detail := v_detail || jsonb_build_object('cohort', jsonb_build_object('de', old.cohort, 'para', new.cohort));
  end if;

  if v_detail = '{}'::jsonb then
    return new;  -- nada de acesso mudou (ex.: alteração de nome) → não regista
  end if;

  -- Determina uma ação legível
  v_action := case
    when new.is_suspended is distinct from old.is_suspended then (case when new.is_suspended then 'suspend' else 'reactivate' end)
    when new.is_admin is distinct from old.is_admin then (case when new.is_admin then 'grant_admin' else 'revoke_admin' end)
    when new.trial_ends_at is distinct from old.trial_ends_at then 'set_trial'
    when new.access_until is distinct from old.access_until then 'grant_access'
    when new.allowed is distinct from old.allowed then 'set_allowed'
    else 'update_access'
  end;

  select email into v_actor_email from public.profiles where id = v_actor;
  insert into public.admin_audit(actor_id, actor_email, action, target_user, target_email, detail)
  values (v_actor, v_actor_email, v_action, new.id, new.email, v_detail);
  return new;
end;
$$;

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
  after update or delete on public.profiles
  for each row execute function app.audit_profile_change();

-- ------------------------------------------------------------
-- 2.2 Trigger: regista alterações à configuração global
-- ------------------------------------------------------------
create or replace function app.audit_config_change()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare v_actor uuid := auth.uid(); v_actor_email text;
begin
  select email into v_actor_email from public.profiles where id = v_actor;
  insert into public.admin_audit(actor_id, actor_email, action, detail)
  values (v_actor, v_actor_email, 'update_config', jsonb_build_object(
    'trial_start_date', jsonb_build_object('de', old.trial_start_date, 'para', new.trial_start_date),
    'trial_days', jsonb_build_object('de', old.trial_days, 'para', new.trial_days),
    'public_signup_open', jsonb_build_object('de', old.public_signup_open, 'para', new.public_signup_open)
  ));
  return new;
end;
$$;

drop trigger if exists app_config_audit on public.app_config;
create trigger app_config_audit
  after update on public.app_config
  for each row execute function app.audit_config_change();

-- ------------------------------------------------------------
-- 2.3 RPC para o painel ler o registo
-- ------------------------------------------------------------
create or replace function public.admin_list_audit(p_limit int default 200)
returns setof public.admin_audit
language plpgsql stable security definer set search_path = public, app as $$
begin
  perform app.require_admin();
  return query select * from public.admin_audit order by created_at desc limit greatest(1, least(p_limit, 2000));
end;
$$;

grant execute on function public.admin_list_audit(int) to authenticated;

-- ============================================================
-- FIM DA MIGRAÇÃO 7
-- ============================================================
