# Guia de aplicação — Lançamento da Masterclass (100% browser, sem terminal)

Ordem recomendada. Faz de cima para baixo. Nada aqui precisa de CLI.

Resumo do que vais fazer:
1. Aplicar 3 migrações SQL no Supabase (obrigatórias).
2. (Opcional) Aplicar 2 migrações de email automático.
3. Publicar o código novo (GitHub → Vercel faz deploy sozinho).
4. Marcar os admins.
5. Importar inscritos e configurar o trial.
6. Mais tarde: ligar os pagamentos (ver `PAGAMENTOS.md`).

---

## Passo 1 — Migrações SQL obrigatórias (Supabase → SQL Editor)

Corre estas **três**, por esta ordem. Cada uma: **New query** → colar o ficheiro todo → **Run**. São idempotentes (podes correr outra vez sem estragar nada).

1. `supabase/migrations/20260603000000_access_admin_model.sql`
   → modelo de acesso (trial + paywall), RLS endurecido, RPCs de admin, lista de espera.
   **Antes de correr**, na secção final "12. SEED DE ADMINS", mete os emails certos (ver Passo 4).

2. `supabase/migrations/20260603020000_admin_tools.sql`
   → adicionar utilizador, conceder/estender em massa, estatísticas, eliminar conta.

3. `supabase/migrations/20260603030000_launch_prep.sql`
   → "fechar trial" em massa (o pagamento mantém o acesso) + registo de auditoria.

Testadas contra PostgreSQL real (30 + 15 + 11 testes), incluindo os ataques de
escalada de privilégios — um utilizador normal não consegue dar-se acesso nem ver
dados de outros.

---

## Passo 2 — (Opcional) Emails automáticos

Só se quiseres os emails automáticos. **Não são precisos para lançar.**

Pré-requisitos (uma vez):
- Supabase → **Database → Extensions** → ativar `pg_net` (e `pg_cron` para o de fim de trial).
- Supabase → **Project Settings → Vault → New secret**: `RESEND_API_KEY` = `re_...`.

Depois, no SQL Editor:
- `supabase/migrations/20260603010000_trial_email_cron.sql` → aviso de fim de trial.
- `supabase/migrations/20260603040000_welcome_email.sql` → email de boas-vindas no 1.º login.

Ambas são seguras: se faltar a chave/extensão, não enviam e não partem o login.

---

## Passo 3 — Publicar o código (GitHub web → Vercel)

O Vercel faz deploy automático a cada commit no repo `finmed-calc`. Pelo GitHub web,
cria/edita cada ficheiro abaixo com o conteúdo da pasta local e faz **Commit**.

**Ficheiros NOVOS:**
- `src/components/AccessGate.jsx`
- `src/components/RequireAdmin.jsx`
- `src/components/TrialBanner.jsx`
- `src/components/OnboardingModal.jsx`
- `src/components/AdminGuide.jsx`
- `src/pages/WaitlistPage.jsx`
- `src/pages/AdminPage.jsx`
- `src/hooks/useAdmin.js`
- `supabase/migrations/20260603000000_access_admin_model.sql`
- `supabase/migrations/20260603020000_admin_tools.sql`
- `supabase/migrations/20260603030000_launch_prep.sql`
- `supabase/migrations/20260603010000_trial_email_cron.sql` (opcional)
- `supabase/migrations/20260603040000_welcome_email.sql` (opcional)

**Ficheiros ALTERADOS:**
- `src/App.jsx`
- `src/components/Header.jsx`
- `src/hooks/useAccess.js`
- `src/pages/AccountPage.jsx`
- `src/pages/UpgradePage.jsx`
- `src/pages/CalculatorPage.jsx`
- `src/pages/LandingPage.jsx`
- `vite.config.js`
- `package.json` (versão → 1.0.0)
- `supabase/functions/create-checkout-session/index.ts` (só relevante quando ligares o Stripe)

Confirma em vercel.com que o deploy ficou verde (~1-2 min).

---

## Passo 4 — Marcar os admins

Cada pessoa tem de ter **entrado uma vez** (para o perfil existir). Depois, no SQL Editor:

```sql
update public.profiles set is_admin = true, allowed = true
where lower(email) in (
  lower('tomas@digitalplane.pt'),
  lower('EMAIL_DA_MARTA@finmed.pt'),
  lower('EMAIL_DA_LUISA@finmed.pt')
);
```

(Já vai no seed da migração 1 — basta editares os emails lá, ou correres isto à parte.)

---

## Passo 5 — Importar inscritos e configurar o trial

1. `calc.finmed.pt/app/admin` → **Importar inscritos** → carrega o CSV/Excel do Go High Level.
2. **Definições** → confirma a **data de início do trial** (11 ou 18 jul) e mantém **"Abrir ao público" DESLIGADO**.
3. Dia 28 jul → **Utilizadores → Ferramentas de segmento → Fechar trial**.

> Na primeira vez que entrarem em `/app/admin`, a Marta e a Luísa vêem um guia. Podem
> reabri-lo no botão **Ajuda** a qualquer momento.

---

## Passo 6 — Pagamentos (mais tarde, antes de ~10 ago)

Ver **`PAGAMENTOS.md`** — criar produtos no Stripe, fazer deploy das 2 Edge Functions
pelo dashboard do Supabase (sem CLI), webhook, variáveis no Vercel, e teste com cartão.
Não bloqueia o 11 jul: durante o trial não se cobra.

---

## Notas de segurança

- As colunas de acesso (`is_admin`, `is_suspended`, `trial_ends_at`, `access_until`, `allowed`)
  não têm permissão de escrita para utilizadores normais — só funções de servidor
  verificadas (admin) ou o `service_role` (webhooks).
- `/app/admin` é protegido no servidor: mesmo forçando o URL, as operações falham se não fores admin.
- Cada utilizador só vê o seu perfil e as suas simulações. O admin gere acessos mas não vê simulações alheias.
- Tudo o que mexe em acessos fica registado no separador **Registo** (quem, sobre quem, quando).
