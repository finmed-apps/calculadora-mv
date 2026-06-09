# Pagamentos (Stripe) — guia sem terminal

Este guia liga os pagamentos reais de ponta a ponta, **tudo via browser**.
Não precisas do dia 11 jul (durante o trial não se cobra), mas tens ~1 mês até
os primeiros trials terminarem (~10 ago). Faz isto com calma antes dessa data.

---

## Como funciona (visão geral)

1. O cliente cai na página de planos (só depois do trial terminar) e carrega em **Subscrever**.
2. A app chama uma **Edge Function** (`create-checkout-session`) que cria uma sessão de **Stripe Checkout** e devolve o link.
3. O cliente paga no Stripe (página segura do Stripe, fora da tua app).
4. O Stripe chama a tua **Edge Function** (`stripe-webhook`), que escreve na base de dados que o cliente pagou (cria um `one_time_pass` válido 6 ou 12 meses) e marca o acesso como ativo.
5. O cliente volta a `/app/conta?checkout=success`, a app confirma e o acesso fica PRO.

São **2 Edge Functions** já escritas no teu projeto (`supabase/functions/`).
Só faltam: criar os produtos no Stripe, fazer deploy das funções e meter as chaves.

---

## Passo 1 — Produtos e preços no Stripe

1. Entra no [Stripe Dashboard](https://dashboard.stripe.com). Começa em **modo Test** (canto sup. direito).
2. **Products → Add product** — cria dois:
   - **FINMED Calc — 6 meses**: preço **65 €**, *One-off* (pagamento único). Copia o **Price ID** (`price_...`).
   - **FINMED Calc — Anual**: preço **100 €**, *One-off*. Copia o **Price ID**.
3. **Developers → API keys** — copia:
   - **Publishable key** (`pk_test_...`)
   - **Secret key** (`sk_test_...`)

---

## Passo 2 — Deploy das Edge Functions pelo dashboard (sem CLI)

O Supabase já permite criar/deployar funções pelo painel — sem terminal nem Docker.

1. Supabase Dashboard → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nome: `create-checkout-session`. Apaga o código de exemplo e cola o conteúdo de
   `supabase/functions/create-checkout-session/index.ts` deste projeto. **Deploy**.
3. Repete: **Deploy a new function** → nome `stripe-webhook` → cola o conteúdo de
   `supabase/functions/stripe-webhook/index.ts`. **Deploy**.

> Nota: o editor do dashboard não tem versionamento/rollback — o teu código-fonte
> fica no GitHub, por isso o histórico está guardado à mesma. Se um dia editares a
> função, edita primeiro no GitHub e volta a colar, para não dessincronizar.

---

## Passo 3 — Secrets das Edge Functions

Supabase → **Project Settings → Edge Functions → Secrets** (ou **Manage secrets**).
Adiciona:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...        (preenches no passo 4)
APP_URL=https://calc.finmed.pt
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem por defeito.

> O `stripe-webhook` usa apenas o `metadata.kind` da sessão (`one_off_6m`/`one_off_12m`)
> para decidir 6 ou 12 meses, por isso **não** precisas de `STRIPE_PRICE_*` nas secrets
> para o modelo one-off. (As variáveis `STRIPE_PRICE_MONTHLY/ANNUAL` no código só seriam
> usadas se um dia vendesses subscrições recorrentes.)

---

## Passo 4 — Webhook no Stripe

1. Stripe → **Developers → Webhooks → Add endpoint**.
2. URL: `https://tlfoseohmaxnoqbfrymm.supabase.co/functions/v1/stripe-webhook`
3. Eventos a ouvir (mínimo para one-off): **`checkout.session.completed`**.
   (Podes adicionar também `customer.subscription.*` e `invoice.payment_failed` — o
   código já os trata, mas não são usados no modelo one-off.)
4. Cria. Copia o **Signing secret** (`whsec_...`) e mete-o na secret
   `STRIPE_WEBHOOK_SECRET` (Passo 3). Volta a fazer deploy do `stripe-webhook` se já o tinhas.

> Importante: o `stripe-webhook` tem de aceitar pedidos **sem JWT** (o Stripe não envia).
> Na lista de Edge Functions, abre `stripe-webhook` → **Details/Settings** → desliga
> **"Enforce JWT verification"** (a função valida a assinatura própria do Stripe).

---

## Passo 5 — Variáveis no Vercel (frontend)

Vercel → projeto `finmed-calc` → **Settings → Environment Variables**. Adiciona:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PRICE_ONE_OFF_6M=price_...   (o Price ID dos 6 meses)
VITE_STRIPE_PRICE_ONE_OFF_12M=price_...  (o Price ID do anual)
```

Faz **Redeploy** para as variáveis entrarem.
(Enquanto estas não existirem, a app mostra uma mensagem amigável a encaminhar
para a equipa FINMED em vez de dar erro — por isso nada parte se ainda não ligaste.)

---

## Passo 6 — Testar de ponta a ponta (modo Test)

1. Numa conta cujo trial já terminou (ou usa o painel admin → "Terminar acesso agora"
   na tua própria conta de teste), vai a `/app/upgrade`.
2. Carrega em **Subscrever** num plano. Deves ir para o Stripe Checkout.
3. Cartão de teste: **4242 4242 4242 4242**, validade futura qualquer, CVC qualquer, país Portugal.
4. Paga. Voltas a `/app/conta?checkout=success` → aparece "Pagamento recebido".
5. Em segundos o estado passa a **ATIVO** (PRO). Confirma no painel admin que o
   utilizador aparece como "Pago" e com data de validade.

Se o estado não mudar:
- Stripe → Webhooks → vê se o evento `checkout.session.completed` foi entregue (200).
- Supabase → Edge Functions → `stripe-webhook` → **Logs** para ver erros.
- Confirma que `STRIPE_WEBHOOK_SECRET` está correto e o JWT está desligado nessa função.

---

## Passo 7 — Passar a produção (live)

Quando o teste correr bem, repete com as chaves **live** do Stripe:
- Troca o toggle do Stripe para **Live**, recria os 2 produtos (ou ativa-os), copia os
  `price_...` live e a `sk_live_...`/`pk_live_...`.
- Cria um **novo webhook** com a mesma URL em modo Live e copia o novo `whsec_...`.
- Atualiza as secrets do Supabase (live) e as env vars do Vercel (live) → Redeploy.

---

## Resumo do que falta para cobrar de verdade

| # | Tarefa | Onde | Feito? |
|---|--------|------|--------|
| 1 | Criar 2 produtos one-off (65€/100€) | Stripe | ☐ |
| 2 | Deploy `create-checkout-session` + `stripe-webhook` | Supabase (Via Editor) | ☐ |
| 3 | Secrets `STRIPE_SECRET_KEY`, `APP_URL` | Supabase | ☐ |
| 4 | Webhook + `STRIPE_WEBHOOK_SECRET` + desligar JWT | Stripe + Supabase | ☐ |
| 5 | Env vars `VITE_STRIPE_*` | Vercel | ☐ |
| 6 | Teste com cartão 4242 | — | ☐ |
| 7 | Repetir em modo Live | Stripe/Supabase/Vercel | ☐ |

O código da app já está todo do lado certo: success/cancel URLs corrigidos, confirmação
pós-pagamento, e o acesso pago a sobrepor-se ao fecho do trial em massa.
