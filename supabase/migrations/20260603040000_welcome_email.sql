-- ============================================================
-- FINMED Calculadora — Migração 8 (OPCIONAL)
-- Email de boas-vindas no primeiro login (sem CLI, via pg_net + Resend)
-- ============================================================
--
-- ⚠️ OPCIONAL. A app funciona sem isto. Só envia o email automático de
--    boas-vindas quando um inscrito entra pela primeira vez.
--
-- PRÉ-REQUISITOS (os mesmos da migração do email de fim de trial):
--   1. Database → Extensions → ativar `pg_net`.
--   2. Vault → secret `RESEND_API_KEY` = re_xxxx (se já o fizeste, está feito).
--   3. Correr esta migração no SQL Editor.
--
-- Seguro: se faltar a extensão ou a chave, o envio é ignorado em silêncio
-- e o registo/login do utilizador NUNCA falha por causa disto.
-- ============================================================

create extension if not exists pg_net;

create or replace function public.send_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_key  text;
  v_html text;
begin
  -- Só a inscritos (allowed). Quem cai na lista de espera não recebe.
  if new.allowed is not true then
    return new;
  end if;

  begin
    select decrypted_secret into v_key
      from vault.decrypted_secrets where name = 'RESEND_API_KEY' limit 1;
    if v_key is null then
      return new;  -- sem chave → não envia, mas não parte nada
    end if;

    v_html :=
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1d2b24">'
      || '<h2 style="color:#0f3d2e">Bem-vindo' || coalesce(' ' || split_part(new.full_name,' ',1),'') || '! 👋</h2>'
      || '<p>A tua conta na <strong>Calculadora de Mais-Valias FINMED</strong> está pronta.</p>'
      || '<p>Em menos de um minuto calculas o IRS sobre a venda de um imóvel, identificas '
      || 'isenções aplicáveis e geras um relatório PDF com a marca FINMED.</p>'
      || '<p><a href="https://calc.finmed.pt/app" style="background:#0f3d2e;color:#fff;'
      || 'padding:12px 22px;border-radius:10px;text-decoration:none;display:inline-block">Abrir a calculadora →</a></p>'
      || '<p style="color:#6b7c73;font-size:13px">Tens acesso completo durante o período da Masterclass. '
      || 'Qualquer dúvida, responde a este email.</p>'
      || '<p style="color:#6b7c73;font-size:13px">— Equipa FINMED</p></div>';

    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization','Bearer ' || v_key, 'Content-Type','application/json'),
      body := jsonb_build_object(
        'from','FINMED <noreply@suite.finmed.pt>',
        'to', array[new.email],
        'subject','A tua Calculadora FINMED está pronta',
        'html', v_html
      )
    );
  exception when others then
    -- Nunca deixar o erro de email afetar a criação da conta.
    raise warning 'welcome email falhou: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists profiles_welcome_email on public.profiles;
create trigger profiles_welcome_email
  after insert on public.profiles
  for each row execute function public.send_welcome_email();

-- ============================================================
-- FIM DA MIGRAÇÃO 8 (opcional)
-- ============================================================
