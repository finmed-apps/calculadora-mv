# FINMED · Calculadora de Mais-Valias

Web app para cálculo de mais-valias imobiliárias em Portugal, com sistema de contas, histórico permanente, exportação PDF FINMED-branded, e modelo de subscrição/pagamento único via Stripe.

**Stack:** Vite + React 18 + Tailwind + Supabase (Postgres + Auth + Edge Functions) + Stripe + Vercel

---

## Setup passo-a-passo

### 1. Supabase

1. Criar projeto novo em [supabase.com](https://supabase.com) (regiao `eu-west-1` ou `eu-central-1`).
2. **SQL Editor** → cola o conteúdo de `supabase/migrations/20260512000000_initial_schema.sql` e corre.
3. **Settings → API** → copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`
   - `service_role key` → usar nas Edge Functions (não no frontend)
4. **Authentication → Email Templates** → personalizar o template do magic link com branding FinMed (mais tarde).
5. **Authentication → URL Configuration** → adicionar `https://calc.finmed.pt` aos `Site URL` e `Redirect URLs`.

### 2. Stripe (modo TEST por agora)

1. Login no [Stripe Dashboard](https://dashboard.stripe.com) em **modo Test** (toggle no canto superior direito).
2. **Products** → criar 3 produtos:
   - **Mensal** → recurring, 12 €/mês → copiar `price_id` → `VITE_STRIPE_PRICE_MONTHLY`
   - **Anual** → recurring, 99 €/ano → copiar `price_id` → `VITE_STRIPE_PRICE_ANNUAL`
   - **12 meses (one-off)** → one-off, 89 € → copiar `price_id` → `VITE_STRIPE_PRICE_ONE_OFF_12M`
3. **Developers → API keys** → copiar:
   - `Publishable key` → `VITE_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY` (vai nas Edge Functions)
4. **Developers → Webhooks** → criar endpoint:
   - URL: `https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook`
   - Eventos:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copiar **Signing secret** (começa por `whsec_...`) → `STRIPE_WEBHOOK_SECRET`

### 3. Edge Functions — variáveis de ambiente

No Supabase, **Project Settings → Edge Functions → Secrets**, adicionar:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
APP_URL=https://calc.finmed.pt
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` já existem por defeito.

### 4. Deploy das Edge Functions

```bash
# instalar CLI
npm install -g supabase

# login
supabase login

# linkar ao projeto
supabase link --project-ref YOUR-PROJECT-REF

# deploy
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy generate-pdf
```

> `stripe-webhook` precisa de `--no-verify-jwt` porque o Stripe não envia JWT, mas a função verifica a assinatura própria do Stripe.

### 5. Frontend — local

```bash
npm install
cp .env.example .env
# edita .env com os valores acima
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

### 6. Deploy no Vercel

1. Push do código para um repo GitHub.
2. Em [vercel.com](https://vercel.com) → **New Project** → import do repo.
3. **Environment Variables** → adicionar todas as `VITE_*` do `.env`.
4. **Domains** → adicionar `calc.finmed.pt`.
5. No DNS da `finmed.pt`, adicionar **CNAME**:
   ```
   calc.finmed.pt → cname.vercel-dns.com
   ```
6. Aguardar propagação DNS (geralmente <10 min).

### 7. Testar fluxo end-to-end

1. Abrir `calc.finmed.pt`.
2. Fazer uma simulação anónima — sem login.
3. Clicar **Guardar** → redireciona para login.
4. Inserir email → magic link chega → entrar.
5. Voltar à calculadora, guardar.
6. **Histórico** → ver a simulação guardada.
7. **Upgrade** → escolher plano Mensal → checkout → cartão de teste:
   - Nº: `4242 4242 4242 4242`
   - Validade: qualquer futura
   - CVC: qualquer
   - Country: PT
8. Voltar à app → header mostra "PRO".

---

## Estrutura do projeto

```
finmed-calc/
├── src/
│   ├── components/        # Header, Logo, ScenarioPicker, CalcForm, Result, RequireAuth
│   ├── pages/             # CalculatorPage, LoginPage, HistoryPage, AccountPage, UpgradePage
│   ├── hooks/             # useAuth, useSimulations, useAccess
│   ├── lib/
│   │   ├── calc.js        # Engine de cálculo (puro, testável)
│   │   └── supabase.js    # Cliente Supabase
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/
│   ├── migrations/
│   │   └── 20260512000000_initial_schema.sql
│   └── functions/
│       ├── create-checkout-session/  # Stripe Checkout
│       ├── stripe-webhook/           # Stripe webhook handler
│       └── generate-pdf/             # PDF do relatório
└── ...
```

## Modelo de dados

- **profiles** — perfil de cada utilizador (1:1 com `auth.users`). Cache do plano.
- **simulations** — cada cálculo guardado. Histórico permanente.
- **subscriptions** — cache local das subscrições Stripe.
- **one_time_passes** — pagamentos únicos com validade temporal.
- **v_user_access** — view que computa `has_paid_access` (subscription ativa OU one-off válido).

RLS está ativo em todas as tabelas. Utilizadores só veem os seus próprios dados.

## Decisões de produto

- **Coeficiente de desvalorização:** assumido = 1 (não pedido ao utilizador). Margem de erro aceitável para simulação; consultoria refina.
- **Free tier:** todas as features ativas, com histórico. A monetização funciona pela proposta de valor (relatórios PDF profissionais, suporte, branding) em vez de limites artificiais.
- **PDF:** renderizado como HTML para impressão (browser print-to-PDF). Funciona sem custo de infra. Para PDFs server-side reais, substituir por chamada ao Browserless.io ou similar — está documentado na própria Edge Function.

## Próximos passos (v1.1+)

- [ ] SMTP custom (Resend) para magic links com domínio `@finmed.pt`
- [ ] Personalização de relatórios para consultores (logo próprio, cores)
- [ ] Integração com GoHighLevel (lead automaticamente criada com opt-in)
- [ ] Cenário **pre1989** e **estado** dedicados (são informativos, não passam pelo calculador)
- [ ] Réplica para Heranças
- [ ] Análise / dashboard para admin (Luísa) ver utilizadores e simulações
- [ ] Email de boas-vindas + onboarding via Resend
