// supabase/functions/create-checkout-session/index.ts
//
// Cria uma sessão de Stripe Checkout para subscrições (mensal/anual)
// ou pagamento único (one_off_12m). Devolve { url } para o frontend redirecionar.
//
// O utilizador tem de estar autenticado: lemos o JWT do header.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@16.5.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'https://calc.finmed.pt';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Autenticar utilizador
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No auth header' }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

    const { priceId, mode, planKind } = await req.json();
    if (!priceId || !mode) return json({ error: 'Missing priceId or mode' }, 400);
    if (!['subscription', 'payment'].includes(mode)) {
      return json({ error: 'Invalid mode' }, 400);
    }

    // Service role client para escrever na profiles
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // Ver se o user já tem um customer no Stripe
    const { data: profile } = await adminClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await adminClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Criar checkout session
    const session = await stripe.checkout.sessions.create({
      mode: mode as 'subscription' | 'payment',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/conta?checkout=success`,
      cancel_url: `${APP_URL}/upgrade?checkout=canceled`,
      // Metadata: passa o planKind para o webhook saber quantos meses dar
      metadata: {
        user_id: user.id,
        kind: planKind || (mode === 'payment' ? 'one_off_12m' : 'subscription'),
      },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('checkout error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
