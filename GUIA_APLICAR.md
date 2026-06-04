# Guia de aplicação — Lançamento Masterclass (sem terminal)

Tudo o que se segue faz-se no **browser**: Supabase Dashboard, GitHub web e Vercel.
Não é preciso CLI. Segue a ordem.

---

## Passo 1 — Aplicar a migração de segurança no Supabase

1. Abre o **Supabase Dashboard** → projeto `tlfoseohmaxnoqbfrymm` → **SQL Editor** → **New query**.
2. Abre o ficheiro `supabase/migrations/20260603000000_access_admin_model.sql`, copia **tudo**, cola no editor.
3. **Antes de correr**, vai ao fim do ficheiro (secção `12. SEED DE ADMINS`) e mete os emails certos:

   ```sql
   update public.profiles set is_admin = true, allowed = true
   where lower(email) in (
     lower('tomas@digitalplane.pt'),
     lower('EMAIL_DA_MARTA@finmed.pt'),
     lower('EMAIL_DA_LUISA@finmed.pt')
   );
   ```

   > Cada pessoa só fica admin **depois de ter feito login pelo menos uma vez** (o perfil tem de existir). Se ainda não entraram, corre só este `update` outra vez mais tarde.
4. Carrega em **Run**. Deve dizer *Success*. Pode correr-se mais que uma vez sem partir nada.

Esta migração foi testada contra Postgres real (30 testes): um utilizador normal **não consegue** promover-se a admin, prolongar o próprio trial, dar-se acesso, nem ver dados de outros. Todas as ações de admin são verificadas no servidor.

---

## Passo 2 — (Opcional) Email automático de fim de trial

Só se quiseres o email automático já agora. **Não bloqueia o lançamento** — o aviso "faltam X dias" aparece sempre na app.

1. Supabase → **Database → Extensions** → ativar `pg_cron` e `pg_net`.
2. Supabase → **Project Settings → Vault → New secret**: nome `RESEND_API_KEY`, valor `re_...`.
3. **SQL Editor** → cola e corre `supabase/migrations/20260603010000_trial_email_cron.sql`.

---

## Passo 3 — Publicar o código novo (GitHub web → Vercel)

O Vercel faz deploy automático a cada commit no repo `finmed-calc`. Pelo GitHub web:

1. Abre o repo no github.com.
2. Para cada ficheiro novo/alterado abaixo, usa **Add file → Create new file** (ou abre o ficheiro → ✏️ Edit) e cola o conteúdo da pasta local.

**Ficheiros novos:**
- `src/components/AccessGate.jsx`
- `src/components/RequireAdmin.jsx`
- `src/pages/WaitlistPage.jsx`
- `src/pages/AdminPage.jsx`
- `src/hooks/useAdmin.js`
- `supabase/migrations/20260603000000_access_admin_model.sql`
- `supabase/migrations/20260603010000_trial_email_cron.sql`

**Ficheiros alterados:**
- `src/App.jsx`
- `src/components/Header.jsx`
- `src/hooks/useAccess.js`
- `src/pages/AccountPage.jsx`
- `vite.config.js`
- `package.json` (versão → 1.0.0)

3. Faz **Commit**. O Vercel reconstrói sozinho (~1-2 min). Confirma em vercel.com que o deploy ficou verde.

> Dica: é mais simples arrastar a pasta inteira para o GitHub Desktop, mas se preferires 100% web, edita ficheiro a ficheiro como acima.

---

## Passo 4 — Importar os inscritos da Masterclass

1. Exporta a lista do Go High Level para **CSV ou Excel** com (pelo menos) uma coluna `email`. Opcional: `nome`, `plano`.
2. Entra em `calc.finmed.pt/app/admin` (com a tua conta admin) → separador **Importar inscritos** → escolhe o ficheiro → confere a pré-visualização → **Importar**.

A partir daqui, quem fizer login com um email da lista entra direto em trial. Quem não estiver na lista vê a página "Ainda não abrimos ao público".

---

## Passo 5 — Configurar a data de início do trial

`calc.finmed.pt/app/admin` → **Definições**:
- **Data de início do trial**: 11 jul (ou 18 jul, a Marta decide).
- **Duração**: 30 dias.
- **Abrir ao público**: deixar **DESLIGADO** até abrires oficialmente.

---

## Passo 6 — Dia 28 jul: trancar o trial em massa

`calc.finmed.pt/app/admin` → **Utilizadores** → botão **Trancar tudo**.
Suspende de uma vez todos os inscritos da Masterclass (segmento `masterclass_2026_07`).
Há também **Reabrir** caso seja preciso desfazer.

---

## O que a Marta precisa de saber (call de 5 min)

- **/app/admin** é a área dela.
- **Utilizadores**: pesquisar, ver estado, e em **Gerir** → suspender/reativar, dar dias extra, ajustar fim de trial.
- **Importar inscritos**: carregar o CSV/Excel do GHL.
- **Lista de espera**: ver/exportar quem tentou entrar sem estar na lista.
- **Definições**: data de início do trial e abrir/fechar ao público.
- **Trancar tudo**: o botão grande para fechar o trial a 28 jul.

---

## Notas de segurança (porque é que isto é seguro)

- As colunas de acesso (`is_admin`, `is_suspended`, `trial_ends_at`, `access_until`, `allowed`) **não têm permissão de escrita** para utilizadores normais — só funções de servidor verificadas (`SECURITY DEFINER` + `is_admin`) ou o `service_role` (webhooks) lhes mexem.
- Mesmo que alguém force o URL `/app/admin`, todas as operações falham no servidor se não for admin.
- Cada utilizador só vê o seu próprio perfil e as suas simulações (RLS). O admin **não** vê as simulações de ninguém — só gere acessos.
- O cálculo de acesso vive num único sítio (`compute_access`), por isso não há caminhos inconsistentes.
