// supabase/functions/stripe-webhook/index.ts
//
// Webhook do Stripe. Sincroniza:
//   - checkout.session.completed       → cria subscription ou one_time_pass
//   - customer.subscription.updated    → atualiza subscriptions + profile cache
//   - customer.subscription.deleted    → marca como canceled
//   - invoice.payment_failed           → marca past_due
//
// Configurar no Stripe Dashboard:
//   1. Developers → Webhooks → Add endpoint
//   2. URL: https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook
//   3. Eventos: os 4 acima
//   4. Copiar "Signing secret" para STRIPE_WEBHOOK_SECRET

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@16.5.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Mapa de priceId → plan_kind. Definir env vars no Supabase para cada um.
const PRICE_TO_KIND: Record<string, 'monthly' | 'annual'> = {
  [Deno.env.get('STRIPE_PRICE_MONTHLY')!]: 'monthly',
  [Deno.env.get('STRIPE_PRICE_ANNUAL')!]: 'annual',
};

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('No signature', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  console.log('[webhook] event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await markSubscriptionCanceled(sub);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await updateSubscriptionStatus(invoice.subscription as string, 'past_due');
        }
        break;
      }
      default:
        console.log('[webhook] ignored event:', event.type);
    }
  } catch (err) {
    console.error('Handler error:', err);
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response('ok', { status: 200 });
});

// ============================================================
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error('No user_id in session metadata');
    return;
  }

  if (session.mode === 'payment') {
    // One-off pass (12 meses)
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    await supabase.from('one_time_passes').insert({
      user_id: userId,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      stripe_checkout_session_id: session.id,
      amount: (session.amount_total ?? 0) / 100,
      currency: (session.currency ?? 'eur').toUpperCase(),
      valid_until: validUntil.toISOString(),
    });

    await supabase
      .from('profiles')
      .update({
        plan_status: 'active',
        plan_kind: 'one_off_12m',
        plan_renews_at: validUntil.toISOString(),
      })
      .eq('id', userId);
  }
  // Subscriptions são tratadas no customer.subscription.created
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const userId = await getUserIdFromCustomer(customerId);
  if (!userId) return;

  const priceId = sub.items.data[0]?.price.id;
  const planKind = PRICE_TO_KIND[priceId] ?? 'monthly';

  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      plan_kind: planKind,
      status: sub.status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
    },
    { onConflict: 'stripe_subscription_id' },
  );

  // Atualizar cache no profile
  await supabase
    .from('profiles')
    .update({
      plan_status: sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status,
      plan_kind: planKind,
      plan_renews_at: new Date(sub.current_period_end * 1000).toISOString(),
    })
    .eq('id', userId);
}

async function markSubscriptionCanceled(sub: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', sub.id);

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const userId = await getUserIdFromCustomer(customerId);
  if (userId) {
    await supabase
      .from('profiles')
      .update({ plan_status: 'canceled' })
      .eq('id', userId);
  }
}

async function updateSubscriptionStatus(subscriptionId: string, status: string) {
  await supabase
    .from('subscriptions')
    .update({ status })
    .eq('stripe_subscription_id', subscriptionId);
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.id ?? null;
}
