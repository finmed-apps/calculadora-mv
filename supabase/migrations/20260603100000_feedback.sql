-- ============================================================
-- FINMED Calculadora — Migração 13
-- Feedback / report de bugs → guarda em tabela + envia email
-- Idempotente. Requer migrações 4 e (para o admin) 6/7 aplicadas antes.
--
-- O email vai para finmedapps@gmail.com (precisa de pg_net + RESEND_API_KEY;
-- se não estiverem ativos, a mensagem fica guardada na tabela à mesma).
-- ============================================================

create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles(id) on delete set null,
  email       text,
  kind        text not null default 'outro' check (kind in ('bug', 'sugestao', 'outro')),
  message     text not null,
  page        text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback(created_at desc);

alter table public.feedback enable row level security;

-- Só admin lê. Ninguém escreve diretamente (só via RPC definer).
drop policy if exists "feedback_select_admin" on public.feedback;
create policy "feedback_select_admin"
  on public.feedback for select to authenticated
  using (public.is_admin(auth.uid()));

revoke insert, update, delete on public.feedback from authenticated, anon;

-- ------------------------------------------------------------
-- submit_feedback — qualquer utilizador autenticado envia
-- ------------------------------------------------------------
create or replace function public.submit_feedback(p_kind text, p_message text, p_page text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_key text;
  v_html text;
  v_kind text := coalesce(nullif(p_kind, ''), 'outro');
begin
  if v_uid is null then raise exception 'precisa de sessão'; end if;
  if p_message is null or length(trim(p_message)) < 2 then raise exception 'mensagem vazia'; end if;
  if v_kind not in ('bug', 'sugestao', 'outro') then v_kind := 'outro'; end if;

  select email into v_email from public.profiles where id = v_uid;

  insert into public.feedback (user_id, email, kind, message, page)
  values (v_uid, v_email, v_kind, left(p_message, 5000), left(coalesce(p_page, ''), 200));

  -- Encaminhar por email (best-effort)
  begin
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'RESEND_API_KEY' limit 1;
    if v_key is not null then
      v_html :=
        '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1d2b24">'
        || '<h3 style="color:#0f3d2e">Novo ' || v_kind || ' — Calculadora FINMED</h3>'
        || '<p><strong>De:</strong> ' || coalesce(v_email, '(desconhecido)') || '</p>'
        || '<p><strong>Página:</strong> ' || coalesce(p_page, '—') || '</p>'
        || '<p style="white-space:pre-wrap;background:#f7f4ec;padding:14px;border-radius:10px">'
        || replace(replace(left(p_message, 5000), '<', '&lt;'), '>', '&gt;') || '</p>'
        || '<p style="color:#6b7c73;font-size:12px">Calculadora FINMED · feedback automático</p></div>';

      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
        body := jsonb_build_object(
          'from', 'FINMED Calc <noreply@suite.finmed.pt>',
          'to', array['finmedapps@gmail.com'],
          'reply_to', coalesce(v_email, 'noreply@suite.finmed.pt'),
          'subject', '[' || upper(v_kind) || '] Feedback da Calculadora FINMED',
          'html', v_html
        )
      );
    end if;
  exception when others then
    raise warning 'feedback email falhou: %', sqlerrm;
  end;
end;
$$;

revoke all on function public.submit_feedback(text, text, text) from public;
grant execute on function public.submit_feedback(text, text, text) to authenticated;

-- ------------------------------------------------------------
-- Admin: listar / marcar resolvido
-- ------------------------------------------------------------
create or replace function public.admin_list_feedback(p_limit int default 300)
returns setof public.feedback
language plpgsql stable security definer set search_path = public, app as $$
begin
  perform app.require_admin();
  return query select * from public.feedback order by created_at desc limit greatest(1, least(p_limit, 2000));
end;
$$;

create or replace function public.admin_resolve_feedback(p_id bigint, p_resolved boolean)
returns void
language plpgsql security definer set search_path = public, app as $$
begin
  perform app.require_admin();
  update public.feedback set resolved = p_resolved where id = p_id;
end;
$$;

grant execute on function public.admin_list_feedback(int) to authenticated;
grant execute on function public.admin_resolve_feedback(bigint, boolean) to authenticated;

-- ============================================================
-- FIM DA MIGRAÇÃO 13
-- ============================================================
