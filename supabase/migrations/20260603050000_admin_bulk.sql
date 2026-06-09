-- ============================================================
-- FINMED Calculadora — Migração 9
-- Ações em massa sobre utilizadores selecionados à mão (não por cohort)
--
-- Recebem uma lista de IDs e aplicam a ação a todos. Cada alteração passa
-- pelos mesmos triggers de auditoria (fica registado quem mexeu em quem).
-- Idempotente. Requer as migrações 4, 6 e 7 aplicadas antes.
-- ============================================================

-- Suspender / reativar vários
create or replace function public.admin_bulk_set_suspended(p_ids uuid[], p_suspended boolean)
returns int language plpgsql security definer set search_path = public, app as $$
declare n int;
begin
  perform app.require_admin();
  update public.profiles set is_suspended = p_suspended
    where id = any(p_ids) and is_admin = false;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Dar X dias de acesso a vários (também serve para "marcar como pago": 180 / 365)
create or replace function public.admin_bulk_grant_days(p_ids uuid[], p_days int)
returns int language plpgsql security definer set search_path = public, app as $$
declare n int;
begin
  perform app.require_admin();
  if p_days is null or p_days = 0 then raise exception 'p_days inválido'; end if;
  update public.profiles
    set access_until = greatest(now(), coalesce(access_until, now()), coalesce(trial_ends_at, now()))
                       + (p_days || ' days')::interval
    where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Definir o fim de trial de vários (ex.: terminar já = agora)
create or replace function public.admin_bulk_set_trial(p_ids uuid[], p_ends timestamptz)
returns int language plpgsql security definer set search_path = public, app as $$
declare n int;
begin
  perform app.require_admin();
  update public.profiles set trial_ends_at = p_ends
    where id = any(p_ids) and is_admin = false;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Pôr / tirar da lista (allowed) vários
create or replace function public.admin_bulk_set_allowed(p_ids uuid[], p_allowed boolean)
returns int language plpgsql security definer set search_path = public, app as $$
declare n int;
begin
  perform app.require_admin();
  update public.profiles set allowed = p_allowed where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Eliminar vários (protege admins e a própria conta de quem executa)
create or replace function public.admin_bulk_delete(p_ids uuid[])
returns int language plpgsql security definer set search_path = public, app as $$
declare n int;
begin
  perform app.require_admin();
  delete from public.allowed_emails
    where lower(email) in (
      select lower(email) from public.profiles
      where id = any(p_ids) and is_admin = false and id <> auth.uid()
    );
  delete from public.profiles
    where id = any(p_ids) and is_admin = false and id <> auth.uid();
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function
  public.admin_bulk_set_suspended(uuid[], boolean),
  public.admin_bulk_grant_days(uuid[], int),
  public.admin_bulk_set_trial(uuid[], timestamptz),
  public.admin_bulk_set_allowed(uuid[], boolean),
  public.admin_bulk_delete(uuid[])
to authenticated;

-- ============================================================
-- FIM DA MIGRAÇÃO 9
-- ============================================================
