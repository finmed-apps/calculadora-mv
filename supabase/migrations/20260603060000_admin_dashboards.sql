-- ============================================================
-- FINMED Calculadora — Migração 10
-- Dados para dashboards: último acesso + nº de simulações na listagem,
-- e RPCs admin_usage() (utilização) e admin_billing() (faturação).
-- Idempotente. Requer migrações 4, 6, 7 aplicadas antes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. admin_list_users — agora com último acesso e nº de simulações
--    (RETURNS TABLE muda → é preciso DROP antes de recriar)
-- ------------------------------------------------------------
drop function if exists public.admin_list_users(text, int);

create function public.admin_list_users(p_search text default null, p_limit int default 500)
returns table (
  id uuid, email text, full_name text, phone text, created_at timestamptz,
  is_admin boolean, is_suspended boolean, allowed boolean, cohort text,
  trial_ends_at timestamptz, access_until timestamptz,
  plan_status text, plan_kind text,
  last_sign_in_at timestamptz, simulations_count int,
  access jsonb
)
language plpgsql stable security definer set search_path = public, app, auth as $$
begin
  perform app.require_admin();
  return query
  select p.id, p.email, p.full_name, p.phone, p.created_at,
         p.is_admin, p.is_suspended, p.allowed, p.cohort,
         p.trial_ends_at, p.access_until, p.plan_status, p.plan_kind,
         u.last_sign_in_at,
         (select count(*)::int from public.simulations s where s.user_id = p.id) as simulations_count,
         public.compute_access(p.id) as access
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p_search is null
     or p.email ilike '%' || p_search || '%'
     or coalesce(p.full_name, '') ilike '%' || p_search || '%'
  order by p.created_at desc
  limit greatest(1, least(p_limit, 2000));
end;
$$;

grant execute on function public.admin_list_users(text, int) to authenticated;

-- ------------------------------------------------------------
-- 2. admin_usage — métricas de utilização
-- ------------------------------------------------------------
create or replace function public.admin_usage()
returns jsonb language plpgsql stable security definer set search_path = public, app, auth as $$
declare v jsonb; v_series jsonb; v_scen jsonb;
begin
  perform app.require_admin();

  -- Série dos últimos 14 dias: inscrições e simulações por dia
  select jsonb_agg(jsonb_build_object(
    'd', to_char(d, 'DD/MM'),
    'signups', (select count(*) from public.profiles p where p.created_at::date = d),
    'sims', (select count(*) from public.simulations s where s.created_at::date = d)
  ) order by d)
  into v_series
  from generate_series((current_date - interval '13 days')::date, current_date, interval '1 day') d;

  -- Distribuição por cenário
  select coalesce(jsonb_object_agg(scenario, c), '{}'::jsonb) into v_scen
  from (select scenario, count(*) c from public.simulations group by scenario) t;

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_7d',   (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'active_30d',  (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'total_sims',  (select count(*) from public.simulations),
    'sims_7d',     (select count(*) from public.simulations where created_at > now() - interval '7 days'),
    'sims_30d',    (select count(*) from public.simulations where created_at > now() - interval '30 days'),
    'signups_7d',  (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'by_scenario', v_scen,
    'series',      coalesce(v_series, '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

grant execute on function public.admin_usage() to authenticated;

-- ------------------------------------------------------------
-- 3. admin_billing — faturação (modelo one-off: 65€ / 100€)
-- ------------------------------------------------------------
create or replace function public.admin_billing()
returns jsonb language plpgsql stable security definer set search_path = public, app as $$
declare v jsonb; v_months jsonb; v_recent jsonb;
begin
  perform app.require_admin();

  -- Receita e nº de compras por mês (últimos 6 meses)
  select jsonb_agg(jsonb_build_object(
    'm', to_char(m, 'MM/YY'),
    'revenue', (select coalesce(sum(amount), 0) from public.one_time_passes o where date_trunc('month', o.created_at) = m),
    'count',   (select count(*) from public.one_time_passes o where date_trunc('month', o.created_at) = m)
  ) order by m)
  into v_months
  from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m;

  -- Pagamentos recentes
  select coalesce(jsonb_agg(j order by ca desc), '[]'::jsonb) into v_recent
  from (
    select o.created_at ca,
           jsonb_build_object('amount', o.amount, 'currency', o.currency,
                              'created_at', o.created_at, 'email', p.email, 'name', p.full_name) j
    from public.one_time_passes o
    left join public.profiles p on p.id = o.user_id
    order by o.created_at desc
    limit 12
  ) t;

  select jsonb_build_object(
    'total_revenue', (select coalesce(sum(amount), 0) from public.one_time_passes),
    'paid_count',    (select count(*) from public.one_time_passes),
    'revenue_30d',   (select coalesce(sum(amount), 0) from public.one_time_passes where created_at > now() - interval '30 days'),
    'count_30d',     (select count(*) from public.one_time_passes where created_at > now() - interval '30 days'),
    'rev_6m',        (select coalesce(sum(amount), 0) from public.one_time_passes where amount < 80),
    'count_6m',      (select count(*) from public.one_time_passes where amount < 80),
    'rev_12m',       (select coalesce(sum(amount), 0) from public.one_time_passes where amount >= 80),
    'count_12m',     (select count(*) from public.one_time_passes where amount >= 80),
    'active_subs',   (select count(*) from public.subscriptions where status in ('active', 'trialing')),
    'by_month',      coalesce(v_months, '[]'::jsonb),
    'recent',        v_recent
  ) into v;
  return v;
end;
$$;

grant execute on function public.admin_billing() to authenticated;

-- ============================================================
-- FIM DA MIGRAÇÃO 10
-- ============================================================
