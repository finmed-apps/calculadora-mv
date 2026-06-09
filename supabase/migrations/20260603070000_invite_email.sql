-- ============================================================
-- FINMED Calculadora — Migração 11
-- Email de convite ao adicionar UM utilizador novo (botão "Adicionar utilizador")
--
-- Redefine admin_add_or_grant para, quando adiciona um email NOVO à lista,
-- enviar um convite por email com o link para entrar (via pg_net + Resend).
--   - Só envia para pessoas genuinamente novas (não reenvia a quem já estava).
--   - A importação em massa (admin_import_allowed) NÃO envia convites.
--   - Se faltar pg_net / RESEND_API_KEY, o convite é ignorado em silêncio e
--     a adição funciona na mesma (nunca falha por causa do email).
--
-- Pré-requisitos para o email sair: extensão pg_net ativa + secret
-- RESEND_API_KEY no Vault (os mesmos das migrações de email).
-- Idempotente. Requer as migrações 4 e 6 aplicadas antes.
-- ============================================================

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
  v_inserted boolean := false;
  v_new_until timestamptz;
  v_key text;
  v_html text;
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
        grant_days = coalesce(excluded.grant_days, public.allowed_emails.grant_days)
  returning (xmax = 0) into v_inserted;  -- xmax = 0 → foi mesmo um INSERT novo

  -- Aplicar a perfis já existentes
  if exists (select 1 from public.profiles where lower(email) = v_email) then
    v_existed := true;
    if p_days is not null then
      update public.profiles p
        set allowed = true, cohort = p_cohort,
            full_name = coalesce(p.full_name, nullif(trim(p_full_name), '')),
            access_until = greatest(now(), coalesce(p.access_until, now()), coalesce(p.trial_ends_at, now())) + (p_days || ' days')::interval
        where lower(p.email) = v_email
        returning access_until into v_new_until;
    else
      update public.profiles p
        set allowed = true, cohort = p_cohort,
            full_name = coalesce(p.full_name, nullif(trim(p_full_name), '')),
            trial_ends_at = coalesce(p.trial_ends_at,
              (greatest(current_date, (select trial_start_date from public.app_config where id = 1))
               + ((select trial_days from public.app_config where id = 1) || ' days')::interval))
        where lower(p.email) = v_email
        returning trial_ends_at into v_new_until;
    end if;
  end if;

  -- Enviar convite só a pessoas NOVAS (novas na lista e ainda sem conta)
  if v_inserted and not v_existed then
    begin
      select decrypted_secret into v_key
        from vault.decrypted_secrets where name = 'RESEND_API_KEY' limit 1;
      if v_key is not null then
        v_html :=
          '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1d2b24">'
          || '<h2 style="color:#0f3d2e">Tens acesso! 👋</h2>'
          || '<p>A equipa FINMED deu-te acesso à <strong>Calculadora de Mais-Valias FINMED</strong>.</p>'
          || '<p>Para entrares, usa este email:</p>'
          || '<p><a href="https://calc.finmed.pt/login" style="background:#0f3d2e;color:#fff;'
          || 'padding:12px 22px;border-radius:10px;text-decoration:none;display:inline-block">Entrar na calculadora →</a></p>'
          || '<p style="color:#6b7c73;font-size:13px">Na página de entrada, escreve o teu email e recebes um link mágico '
          || 'para aceder — sem password.</p>'
          || '<p style="color:#6b7c73;font-size:13px">— Equipa FINMED</p></div>';

        perform net.http_post(
          url := 'https://api.resend.com/emails',
          headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
          body := jsonb_build_object(
            'from', 'FINMED <noreply@suite.finmed.pt>',
            'to', array[v_email],
            'subject', 'Tens acesso à Calculadora de Mais-Valias FINMED',
            'html', v_html
          )
        );
      end if;
    exception when others then
      -- Nunca deixar o convite por email falhar a adição do utilizador.
      raise warning 'convite por email falhou: %', sqlerrm;
    end;
  end if;

  return jsonb_build_object('existed', v_existed, 'invited', (v_inserted and not v_existed), 'access_until', v_new_until);
end;
$$;

-- ============================================================
-- FIM DA MIGRAÇÃO 11
-- ============================================================
