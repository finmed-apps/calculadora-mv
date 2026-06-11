# Pagamentos (Stripe) — guia detalhado, passo a passo, sem terminal

Guia pensado para seguir ao vivo, mesmo por quem nunca mexeu nisto.
Tudo se faz no **browser**, em 3 sítios: **Stripe**, **Supabase** e **Vercel**.

> Não é preciso ter isto pronto no dia 11 jul (durante o trial não se cobra).
> Mas convém deixar pronto e testado antes de ~10 ago, quando terminam os primeiros trials.

---

## 0. Glossário (lê isto primeiro — 1 minuto)

- **Stripe** — a empresa que processa os pagamentos com cartão. É lá que o dinheiro entra.
- **Supabase** — a "base de dados + servidor" da app. Guarda os utilizadores e os acessos.
- **Vercel** — onde a app (o site `calc.finmed.pt`) está alojada.
- **API key (chave de API)** — uma palavra-passe longa que liga dois sistemas. Há de dois tipos:
  - **Publishable key** (`pk_...`) — pública, pode estar no site. Identifica a conta Stripe.
  - **Secret key** (`sk_...`) — **secreta**, nunca pode estar no site. Fica guardada no servidor (Supabase).
- **Secret** — no Supabase, é uma "gaveta fechada" onde guardas valores sensíveis (como a `sk_...`).
  A app lê de lá sem nunca os expor ao público.
- **Edge Function** — um pequeno programa que corre no servidor do Supabase. Temos 2:
  - `create-checkout-session` — cria o link de pagamento quando o cliente carrega em "Subscrever".
  - `stripe-webhook` — recebe do Stripe a confirmação "este cliente pagou" e ativa o acesso.
- **Webhook** — um "telefonema automático" que o Stripe faz à nossa app a avisar que houve um pagamento.
- **Webhook signing secret** (`whsec_...`) — a senha que prova que esse telefonema vem mesmo do Stripe.
- **Modo de teste (Test mode / Sandbox)** — o Stripe tem um modo de faz-de-conta para testar com
  cartões falsos, sem cobrar dinheiro a sério. As chaves de teste começam por `pk_test_` / `sk_test_`.
  No fim, repete-se tudo em **modo real (Live)**, com chaves `pk_live_` / `sk_live_`.

**Regra de ouro:** chaves `sk_...` e `whsec_...` são SEGREDOS — só entram no Supabase. A `pk_...`
e os "Price ID" não são segredos — vão no Vercel (no site).

---

## 1. Como funciona o pagamento (o fluxo todo)

1. O cliente, depois de o trial terminar, vê a página de planos e carrega em **Subscrever**.
2. O site chama a Edge Function `create-checkout-session`, que pede ao Stripe um link de pagamento.
3. O cliente é levado para uma página segura do **Stripe** e paga com cartão.
4. O Stripe faz o **webhook** (telefonema) para a Edge Function `stripe-webhook`.
5. Essa função escreve na base de dados "este cliente pagou" e dá-lhe acesso (6 ou 12 meses).
6. O cliente volta ao site (`/app/conta`), vê "Pagamento recebido" e fica com acesso **PRO**.

As 2 Edge Functions **já estão escritas** (na pasta `supabase/functions/`). Só falta: criar os
produtos no Stripe, pôr as funções no ar, e colar as chaves nos sítios certos.

---

## 2. Antes de começar — fica em MODO DE TESTE

No Stripe, no topo, confirma que estás em **Test mode** (interruptor "Test mode", normalmente
ao cima à direita; nalgumas contas chama-se "Sandbox"). Vais ver a palavra **TEST** algures no ecrã.
Só passamos a real (Live) no fim, depois de tudo testado (Passo 8).

---

## 3. STRIPE — criar os 2 produtos (6 meses e anual)

Onde: menu lateral esquerdo → **Product catalog** (em contas mais antigas chama-se **Products**).

1. Carrega em **+ Add product** (ou **Create product**).
2. Produto 1:
   - **Name**: `FINMED Calc — 6 meses`
   - **Pricing**: escolhe **One-off** (pagamento único, NÃO recorrente).
   - **Price (amount)**: `65.00`  **Currency**: `EUR`
   - **Save product**.
3. Repete para o Produto 2:
   - **Name**: `FINMED Calc — Anual`
   - **One-off**, **Price**: `100.00`, **EUR**. **Save**.
4. Agora vais buscar o **Price ID** de cada um (precisas deles no Passo 7):
   - Abre cada produto → na secção **Pricing** vês uma linha de preço com um ID que começa por **`price_...`**.
   - Carrega no `...` ao lado ou no preço → **Copy** o `price_...`. Guarda os dois (aponta num bloco de notas):
     - 6 meses → `price_________________` (chama-lhe "PRICE 6M")
     - Anual   → `price_________________` (chama-lhe "PRICE 12M")

---

## 4. STRIPE — copiar as chaves de API

Onde: menu **Developers** (no canto **inferior esquerdo** do Stripe). Clica para abrir o submenu →
**API keys**. (Se a tua conta já usa o **Workbench**, é o mesmo: Workbench → separador **API keys**.)

Confirma outra vez que estás em **Test mode**. Copia e guarda no bloco de notas:
- **Publishable key** → começa por **`pk_test_...`** (carrega em "Reveal"/copiar).
- **Secret key** → começa por **`sk_test_...`** (carrega em "Reveal test key" para a veres; copia logo).

> A **secret key** é um SEGREDO. Não a metas no site nem a partilhes em chats. Só vai para o Supabase.

---

## 5. SUPABASE — pôr as 2 Edge Functions no ar (sem terminal)

Onde: no Supabase, projeto `tlfoseohmaxnoqbfrymm`, menu lateral esquerdo → **Edge Functions**
(ícone de função/raio).

1. Carrega em **Deploy a new function** → escolhe **Via Editor** (editor no próprio browser).
2. **Name**: escreve exatamente `create-checkout-session`.
3. Apaga o código de exemplo que aparece. Abre o ficheiro local
   `supabase/functions/create-checkout-session/index.ts`, **copia tudo** e **cola** no editor.
4. Carrega em **Deploy**. Espera a confirmação.
5. Repete para a segunda função: **Deploy a new function** → **Via Editor** →
   **Name**: `stripe-webhook` → cola o conteúdo de `supabase/functions/stripe-webhook/index.ts` → **Deploy**.

> Importante (passo fácil de esquecer): a função `stripe-webhook` tem de aceitar chamadas **sem login**,
> porque quem liga é o Stripe, não um utilizador. Abre a função `stripe-webhook` na lista → procura a
> definição **"Verify JWT"** / **"Enforce JWT verification"** e **DESLIGA-A** (toggle off).
> A função `create-checkout-session` deixa ficar como está (precisa do login do utilizador).

---

## 6. SUPABASE — guardar os segredos das funções

Onde: ainda em **Edge Functions**, procura o separador/botão **Secrets** (ou
**Manage secrets**). Em alguns layouts está em **Project Settings → Edge Functions → Secrets**.

É uma tabela de **Key** (nome) e **Value** (valor). Adiciona estes (o `whsec_...` só o tens no Passo 7,
podes voltar aqui depois):

| Key (nome exato)        | Value (o que colar)                          |
|-------------------------|----------------------------------------------|
| `STRIPE_SECRET_KEY`     | a tua `sk_test_...` (do Passo 4)             |
| `APP_URL`               | `https://calc.finmed.pt`                     |
| `STRIPE_WEBHOOK_SECRET` | a tua `whsec_...` (preenches no Passo 7)     |

Carrega em **Save**.

> Não precisas de mexer em `SUPABASE_URL` nem `SUPABASE_SERVICE_ROLE_KEY` — o Supabase já os fornece sozinho.
> Também NÃO precisas de `STRIPE_PRICE_*` aqui (o nosso modelo de pagamento único não usa isso no servidor).

---

## 7. STRIPE — criar o webhook (o telefonema de confirmação)

Onde: menu **Developers** (canto inferior esquerdo) → **Webhooks** → **+ Add endpoint**
(ou **Add destination**).

1. **Endpoint URL** (cola exatamente):
   ```
   https://tlfoseohmaxnoqbfrymm.supabase.co/functions/v1/stripe-webhook
   ```
2. **Select events to listen to** → procura e marca: **`checkout.session.completed`**.
   (Chega este. O código também aguenta outros, mas este é o essencial.)
3. **Add endpoint** / guardar.
4. Abre o endpoint que acabaste de criar. Procura **Signing secret** → **Reveal** → copia o valor que
   começa por **`whsec_...`**.
5. Volta ao Supabase (Passo 6) e mete esse `whsec_...` na secret **`STRIPE_WEBHOOK_SECRET`**. Save.

---

## 8. VERCEL — variáveis do site

Onde: [vercel.com](https://vercel.com) → projeto **finmed-calc** → separador **Settings** (no topo) →
no menu lateral **Environment Variables**.

Adiciona estas três (campo **Key** = nome, campo **Value** = valor; deixa "Production" marcado):

| Key (nome exato)                  | Value                                  |
|-----------------------------------|----------------------------------------|
| `VITE_STRIPE_PUBLISHABLE_KEY`     | a tua `pk_test_...` (Passo 4)          |
| `VITE_STRIPE_PRICE_ONE_OFF_6M`    | o `price_...` dos 6 meses (Passo 3)    |
| `VITE_STRIPE_PRICE_ONE_OFF_12M`   | o `price_...` do anual (Passo 3)       |

Depois de gravar, vai ao separador **Deployments** → no último deployment, menu `...` → **Redeploy**
(para o site apanhar as novas variáveis).

> Enquanto estas variáveis não existirem, o botão de pagamento mostra uma mensagem simpática a
> encaminhar para o suporte, em vez de dar erro. Por isso nada parte se ainda não ligaste.

---

## 9. TESTE de ponta a ponta (com cartão falso)

1. Precisas de uma conta cujo trial já tenha terminado. Truque rápido: no painel admin
   (`/app/admin` → Utilizadores → Gerir na tua conta de teste) → **Terminar acesso agora**.
2. Entra nessa conta → `/app/upgrade` → carrega em **Subscrever** num plano.
3. Vais para o Stripe. Usa o cartão de teste:
   - Número: **4242 4242 4242 4242**
   - Validade: qualquer data futura (ex.: 12/30) · CVC: **123** · País: **Portugal** · Código postal: qualquer
4. Confirma o pagamento. Voltas a `/app/conta` e vês **"Pagamento recebido"**.
5. Em segundos o estado passa a **ATIVO (PRO)**. Confirma no painel admin que essa conta aparece
   como **Pago** com data de validade.

**Se o acesso não mudar:**
- Stripe → Developers → Webhooks → abre o endpoint → vê em **Events**/"Recent deliveries" se o
  `checkout.session.completed` foi entregue com **200** (sucesso). Se deu erro 401, faltou desligar o
  "Verify JWT" da função (Passo 5).
- Supabase → Edge Functions → `stripe-webhook` → **Logs** para ver a mensagem de erro.
- Confirma que a secret `STRIPE_WEBHOOK_SECRET` no Supabase é exatamente a do endpoint que usaste.

---

## 10. PASSAR A REAL (Live) — só depois do teste correr bem

Repete o essencial em **modo Live**:
1. No Stripe, desliga o **Test mode** (passa a Live).
2. Os produtos podem precisar de ser recriados/ativados em Live → copia os novos `price_...` (Live).
3. Developers → API keys (Live) → copia `pk_live_...` e `sk_live_...`.
4. Developers → Webhooks (Live) → cria um novo endpoint com a **mesma URL** → copia o novo `whsec_...`.
5. Atualiza no Supabase: `STRIPE_SECRET_KEY` (sk_live) e `STRIPE_WEBHOOK_SECRET` (whsec live).
6. Atualiza no Vercel: `VITE_STRIPE_PUBLISHABLE_KEY` (pk_live) e os 2 `price_...` (live) → **Redeploy**.
7. (Opcional, recomendado) faz 1 compra real de 1€ com um cartão verdadeiro e reembolsa no Stripe, só para confirmar.

---

## 11. Papéis durante a Masterclass — quem faz o quê

Os pagamentos só "entram em cena" no fim do trial (~10 ago). Durante a Masterclass, o trabalho
da equipa FINMED é **gerir acessos** no painel `/app/admin` (não é mexer no Stripe):

| Quando | Quem | O quê | Onde |
|--------|------|-------|------|
| Antes de 11 jul | Marta | Importar a lista de inscritos | /app/admin → Importar inscritos |
| Antes de 11 jul | Marta/Luísa | Confirmar data de início do trial | /app/admin → Definições |
| Durante | Marta | Casos pontuais: dar dias extra, suspender, adicionar alguém | /app/admin → Utilizadores |
| **28 jul** | Marta | **Fechar o trial gratuito** de toda a Masterclass | /app/admin → Utilizadores → Ferramentas de segmento → **Fechar trial** |
| Depois do trial | (automático) | Quem quiser continuar paga na página de planos | o cliente faz sozinho |

A primeira vez que a Marta e a Luísa entram em `/app/admin` aparece-lhes um **guia**; têm sempre um
botão **Ajuda** para o reabrir.

---

## 12. Checklist para imprimir

**Stripe (modo teste)**
- [ ] 2 produtos one-off criados (65€ / 100€) e `price_...` copiados
- [ ] `pk_test_...` e `sk_test_...` copiados (Developers → API keys)
- [ ] Webhook criado para `.../functions/v1/stripe-webhook` com evento `checkout.session.completed`
- [ ] `whsec_...` do webhook copiado

**Supabase**
- [ ] Função `create-checkout-session` deployada (Via Editor)
- [ ] Função `stripe-webhook` deployada **e com "Verify JWT" DESLIGADO**
- [ ] Secrets: `STRIPE_SECRET_KEY`, `APP_URL`, `STRIPE_WEBHOOK_SECRET`

**Vercel**
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_STRIPE_PRICE_ONE_OFF_6M`, `VITE_STRIPE_PRICE_ONE_OFF_12M`
- [ ] Redeploy feito

**Teste**
- [ ] Compra de teste com 4242 → acesso fica PRO
- [ ] (Mais tarde) repetido em modo Live

---

### Onde vai cada chave (resumo anti-confusão)

| Chave | Começa por | Vai para |
|-------|-----------|----------|
| Secret key | `sk_` | Supabase (secret `STRIPE_SECRET_KEY`) |
| Webhook secret | `whsec_` | Supabase (secret `STRIPE_WEBHOOK_SECRET`) |
| Publishable key | `pk_` | Vercel (`VITE_STRIPE_PUBLISHABLE_KEY`) |
| Price ID 6 meses | `price_` | Vercel (`VITE_STRIPE_PRICE_ONE_OFF_6M`) |
| Price ID anual | `price_` | Vercel (`VITE_STRIPE_PRICE_ONE_OFF_12M`) |

Segredos (`sk_`, `whsec_`) → **Supabase**. Públicos (`pk_`, `price_`) → **Vercel**.
