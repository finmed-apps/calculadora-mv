-- ============================================================
-- FINMED Calculadora — Migração 5 (OPCIONAL)
-- Email automático de aviso de fim de trial — sem CLI, via pg_cron + pg_net
-- ============================================================
--
-- ⚠️ OPCIONAL E INDEPENDENTE. NÃO é preciso para o lançamento de 11 jul:
--    o aviso visual de "faltam X dias" já é feito no frontend a partir de
--    profiles.trial_ends_at. Esta migração acrescenta o email automático.
--
-- O que faz:
--   - Corre 1x/dia (09:00 Europe/Lisbon ≈ 08:00 UTC) via pg_cron.
--   - Encontra utilizadores cujo trial termina daqui a N dias (default 3)
--     e ainda não foram avisados, e envia-lhes um email via Resend (pg_net).
--   - Marca-os para não reenviar.
--
-- PRÉ-REQUISITOS (fazer 1x no Supabase Dashboard, tudo via UI):
--   1. Database → Extensions → ativar `pg_cron` e `pg_net`.
--   2. Guardar a API key do Resend no Vault:
--        Dashboard → Project Settings → Vault → New secret
--        Name: RESEND_API_KEY   Secret: re_xxxxxxxx
--   3. Correr esta migração no SQL Editor.
--
-- Se preferires não usar isto agora, simplesmente NÃO corras este ficheiro.
-- A app funciona à mesma; só não envia o email automático.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Coluna de controlo: quando foi enviado o aviso de fim de trial.
alter table public.profiles
  add column if not exists trial_warning_sent_at timestamptz;

-- ------------------------------------------------------------
-- Função que envia os avisos. SECURITY DEFINER, corre no cron.
-- ------------------------------------------------------------
create or replace function public.send_trial_ending_emails(p_days_before int default 3)
returns int
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  r record;
  v_key text;
  v_count int := 0;
  v_html text;
begin
  -- Lê a API key do Resend do Vault.
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'RESEND_API_KEY' limit 1;
  if v_key is null then
    raise warning 'RESEND_API_KEY não está no Vault — nenhum email enviado';
    return 0;
  end if;

  for r in
    select id, email, full_name, trial_ends_at
    from public.profiles
    where trial_ends_at is not null
      and is_suspended = false
      and trial_warning_sent_at is null
      and trial_ends_at > now()
      and trial_ends_at <= now() + (p_days_before || ' days')::interval
  loop
    v_html :=
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1d2b24">'
      || '<h2 style="color:#0f3d2e">Olá' || coalesce(' ' || split_part(r.full_name, ' ', 1), '') || ',</h2>'
      || '<p>O teu acesso gratuito à <strong>Calculadora de Mais-Valias FINMED</strong> termina a <strong>'
      || to_char(r.trial_ends_at, 'DD/MM/YYYY') || '</strong>.</p>'
      || '<p>Para continuares a simular as tuas mais-valias sem interrupção, escolhe um plano aqui:</p>'
      || '<p><a href="https://calc.finmed.pt/app/upgrade" style="background:#0f3d2e;color:#fff;'
      || 'padding:12px 22px;border-radius:10px;text-decoration:none;display:inline-block">Ver planos →</a></p>'
      || '<p style="color:#6b7c73;font-size:13px">Manténs o acesso às gravações da Masterclass na plataforma. '
      || 'Esta mensagem refere-se apenas ao acesso à calculadora.</p>'
      || '<p style="color:#6b7c73;font-size:13px">— Equipa FINMED</p></div>';

    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'from', 'FINMED <noreply@suite.finmed.pt>',
        'to', array[r.email],
        'subject', 'O teu acesso à Calculadora FINMED termina em breve',
        'html', v_html
      )
    );

    update public.profiles set trial_warning_sent_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.send_trial_ending_emails(int) from public;

-- ------------------------------------------------------------
-- Agendar 1x/dia às 08:00 UTC (≈ 09:00 Lisboa no inverno).
-- ------------------------------------------------------------
select cron.unschedule('finmed_trial_ending_emails')
  where exists (select 1 from cron.job where jobname = 'finmed_trial_ending_emails');

select cron.schedule(
  'finmed_trial_ending_emails',
  '0 8 * * *',
  $cron$ select public.send_trial_ending_emails(3); $cron$
);

-- ============================================================
-- FIM DA MIGRAÇÃO 5 (opcional)
-- ============================================================
