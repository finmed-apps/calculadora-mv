-- ============================================================
-- FINMED Calculadora — Migração 12
-- Gestão da lista de adicionados (allowlist): listagem enriquecida + remover
-- Idempotente. Requer migrações 4 e 6 aplicadas antes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. admin_list_allowed — agora indica se a pessoa já criou conta
--    (RETURNS TABLE muda → DROP antes de recriar)
-- ------------------------------------------------------------
drop function if exists public.admin_list_allowed(int);

create function public.admin_list_allowed(p_limit int default 5000)
returns table (
  email text, full_name text, plan text, cohort text,
  grant_days int, trial_start date, created_at timestamptz,
  registered boolean
)
language plpgsql stable security definer set search_path = public, app as $$
begin
  perform app.require_admin();
  return query
  select a.email, a.full_name, a.plan, a.cohort, a.grant_days, a.trial_start, a.created_at,
         exists(select 1 from public.profiles p where lower(p.email) = lower(a.email)) as registered
  from public.allowed_emails a
  order by a.created_at desc
  limit greatest(1, least(p_limit, 20000));
end;
$$;

grant execute on function public.admin_list_allowed(int) to authenticated;

-- ------------------------------------------------------------
-- 2. admin_remove_allowed — tira emails da lista de adicionados
--    Remove da allowlist E marca o perfil (se existir) como não-autorizado,
--    para que deixe de poder entrar (cai na lista de espera no próximo acesso).
--    NÃO corta um trial/pagamento já ativo — para isso usa o separador
--    Utilizadores (Suspender / Terminar acesso).
-- ------------------------------------------------------------
create or replace function public.admin_remove_allowed(p_emails text[])
returns int
language plpgsql security definer set search_path = public, app as $$
declare n int;
begin
  perform app.require_admin();
  update public.profiles
    set allowed = false
    where lower(email) in (select lower(e) from unnest(p_emails) e);
  delete from public.allowed_emails
    where lower(email) in (select lower(e) from unnest(p_emails) e);
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.admin_remove_allowed(text[]) to authenticated;

-- ============================================================
-- FIM DA MIGRAÇÃO 12
-- ============================================================
