-- ============================================================
-- FINMED Calculadora — Migração 6
-- Ferramentas de admin avançadas (operar sem tocar em SQL)
--
-- Acrescenta:
--   - allowed_emails.grant_days  → conceder N dias a um inscrito antes do signup
--   - handle_new_user            → aplica grant_days na provisão
--   - admin_add_or_grant         → adicionar/conceder acesso a UM email
--   - admin_mass_grant_days      → dar X dias a todo um segmento
--   - admin_mass_set_trial       → definir fim de trial de todo um segmento
--   - admin_stats                → visão geral (totais por estado)
--   - admin_delete_user          → eliminar conta de teste/spam (protegido)
--
-- Idempotente. Aplicar via Supabase → SQL Editor → Run.
-- Requer a migração 20260603000000_access_admin_model.sql aplicada antes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. grant_days na allowlist (concessão pré-signup)
-- ------------------------------------------------------------
alter table public.allowed_emails
  add column if not exists grant_days int;

-- ------------------------------------------------------------
-- 2. handle_new_user — aplica grant_days (acesso concedido) OU trial normal
-- ------------------------------------------------------------
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
  v_access_until timestamptz;
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
    if ae.grant_days is not null then
      -- Concessão direta (VIP / pagamento offline): acesso por N dias, sem trial.
      v_access_until := (greatest(v_start, current_date) + (ae.grant_days || ' days')::interval);
    else
      -- Inscrito normal: trial.
      v_trial_ends := (greatest(v_start, current_date) + (coalesce(cfg.trial_days, 30) || ' days')::interval);
    end if;
  end if;

  insert into public.profiles (id, email, full_name, allowed, cohort, trial_ends_at, access_until)
  values (new.id, new.email, v_name, v_allowed, v_cohort, v_trial_ends, v_access_until)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 3. admin_add_or_grant — adicionar/conceder acesso a UM email
--    p_days null  → adiciona à lista (trial normal no 1.º login)
--    p_days > 0   → concede N dias de acesso já (se a conta existir)
--                   e fica pré-concedido se a conta ainda não existir
-- ------------------------------------------------------------
create or replace function public.admin_add_or_grant(
  p_email text,
  p_full_name text default null,
  p_days int default null,
  p_cohort text default 'masterclass_2026_07'
)
returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare
  v_email text := lower(trim(p_email));
  v_existed boolean := false;
  v_new_until timestamptz;
begin
  perform app.require_admin();
  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'email inválido';
  end if;

  insert into public.allowed_emails (email, full_name, cohort, grant_days, added_by)
  values (v_email, nullif(trim(p_full_name), ''), p_cohort, p_days, auth.uid())
  on conflict (email) do update
    set full_name  = coalesce(excluded.full_name, public.allowed_emails.full_name),
        cohort     = excluded.cohort,
        grant_days = coalesce(excluded.grant_days, public.allowed_emails.grant_days);

  -- Se já existe perfil com este email, aplica já.
  if exists (select 1 from public.profiles where lower(email) = v_email) then
    v_existed := true;
    if p_days is not null then
      update public.profiles p
        set allowed = true,
            cohort = p_cohort,
            full_name = coalesce(p.full_name, nullif(trim(p_full_name), '')),
            access_until = greatest(now(), coalesce(p.access_until, now()), coalesce(p.trial_ends_at, now()))
                           + (p_days || ' days')::interval
        where lower(p.email) = v_email
        returning access_until into v_new_until;
    else
      update public.profiles p
        set allowed = true,
            cohort = p_cohort,
            full_name = coalesce(p.full_name, nullif(trim(p_full_name), '')),
            trial_ends_at = coalesce(p.trial_ends_at,
              (greatest(current_date, (select trial_start_date from public.app_config where id=1))
               + ((select trial_days from public.app_config where id=1) || ' days')::interval))
        where lower(p.email) = v_email
        returning trial_ends_at into v_new_until;
    end if;
  end if;

  return jsonb_build_object('existed', v_existed, 'access_until', v_new_until);
end;
$$;

-- ------------------------------------------------------------
-- 4. admin_mass_grant_days — dar X dias a todo um segmento
-- ------------------------------------------------------------
create or replace function public.admin_mass_grant_days(p_cohort text, p_days int)
returns int
language plpgsql security definer set search_path = public, app as $$
declare v_count int;
begin
  perform app.require_admin();
  if p_days is null or p_days = 0 then raise exception 'p_days inválido'; end if;
  update public.profiles
    set access_until = greatest(now(), coalesce(access_until, now()), coalesce(trial_ends_at, now()))
                       + (p_days || ' days')::interval
    where cohort = p_cohort and is_admin = false;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- 5. admin_mass_set_trial — definir fim de trial de todo um segmento
--    (resolve o caso de mudar a data de início depois de já haver inscritos)
-- ------------------------------------------------------------
create or replace function public.admin_mass_set_trial(p_cohort text, p_ends timestamptz)
returns int
language plpgsql security definer set search_path = public, app as $$
declare v_count int;
begin
  perform app.require_admin();
  update public.profiles
    set trial_ends_at = p_ends
    where cohort = p_cohort and is_admin = false;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- 6. admin_stats — visão geral
-- ------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = public, app as $$
declare v jsonb;
begin
  perform app.require_admin();
  with a as (
    select public.compute_access(id) ac, is_admin from public.profiles
  )
  select jsonb_build_object(
    'total',     (select count(*) from public.profiles),
    'with_access', count(*) filter (where (ac->>'has_access')::boolean),
    'trial',     count(*) filter (where ac->>'state' = 'trial'),
    'active',    count(*) filter (where ac->>'state' = 'active'),
    'granted',   count(*) filter (where ac->>'state' = 'granted'),
    'suspended', count(*) filter (where ac->>'state' = 'suspended'),
    'expired',   count(*) filter (where ac->>'state' = 'expired'),
    'admins',    count(*) filter (where is_admin),
    'waitlist',  (select count(*) from public.waitlist),
    'allowlist', (select count(*) from public.allowed_emails)
  ) into v from a;
  return v;
end;
$$;

-- ------------------------------------------------------------
-- 7. admin_delete_user — eliminar conta (teste/spam). Protegido.
--    Remove o perfil (cascata: simulações, subs, passes) e tira da allowlist.
--    A linha de auth fica órfã; se a pessoa voltar a entrar, fica como
--    "fora da lista" (lista de espera).
-- ------------------------------------------------------------
create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql security definer set search_path = public, app as $$
declare v_email text; v_is_admin boolean;
begin
  perform app.require_admin();
  if p_user = auth.uid() then raise exception 'não te podes eliminar a ti próprio'; end if;
  select email, is_admin into v_email, v_is_admin from public.profiles where id = p_user;
  if v_is_admin then raise exception 'não podes eliminar um administrador (remove o admin primeiro)'; end if;
  delete from public.allowed_emails where lower(email) = lower(v_email);
  delete from public.profiles where id = p_user;
end;
$$;

-- ------------------------------------------------------------
-- 8. Grants de execução
-- ------------------------------------------------------------
grant execute on function
  public.admin_add_or_grant(text, text, int, text),
  public.admin_mass_grant_days(text, int),
  public.admin_mass_set_trial(text, timestamptz),
  public.admin_stats(),
  public.admin_delete_user(uuid)
to authenticated;

-- ============================================================
-- FIM DA MIGRAÇÃO 6
-- ============================================================
