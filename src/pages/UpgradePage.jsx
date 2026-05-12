import { Check, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';

const PLANS = [
  {
    id: 'monthly',
    name: 'Mensal',
    price: '12 €',
    cadence: '/mês',
    priceEnv: 'VITE_STRIPE_PRICE_MONTHLY',
    mode: 'subscription',
    sub: 'Cancele a qualquer momento.',
  },
  {
    id: 'annual',
    name: 'Anual',
    price: '99 €',
    cadence: '/ano',
    priceEnv: 'VITE_STRIPE_PRICE_ANNUAL',
    mode: 'subscription',
    sub: 'Equivalente a 8,25 €/mês.',
    badge: 'POUPA ~30%',
    highlight: true,
  },
  {
    id: 'one_off_12m',
    name: '12 meses (pagamento único)',
    price: '89 €',
    cadence: 'únicos',
    priceEnv: 'VITE_STRIPE_PRICE_ONE_OFF_12M',
    mode: 'payment',
    sub: 'Sem renovação automática.',
  },
];

const FEATURES = [
  'Simulações ilimitadas',
  'Histórico permanente',
  'Exportação de relatórios PDF',
  'Relatórios com branding FINMED',
  'Suporte prioritário',
];

export function UpgradePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);

  async function handleCheckout(plan) {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setLoading(plan.id);
    try {
      const priceId = import.meta.env[plan.priceEnv];
      if (!priceId) {
        alert(`Price ID em falta para o plano ${plan.id}. Defina ${plan.priceEnv} nas variáveis de ambiente.`);
        setLoading(null);
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, mode: plan.mode },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Resposta sem URL de checkout');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao iniciar checkout: ' + err.message);
      setLoading(null);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-5 py-10 sm:py-16">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4">
          <Crown size={12} /> Acesso Premium
        </span>
        <h1 className="font-display font-bold text-fm-green-dark text-3xl sm:text-4xl mb-3">
          Desbloqueie todo o potencial da Calculadora FINMED
        </h1>
        <p className="text-fm-text-soft max-w-2xl mx-auto">
          Histórico ilimitado, relatórios PDF profissionais e suporte da equipa FINMED para confirmar cada simulação.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {PLANS.map((p) => (
          <div key={p.id} className={`bg-fm-paper rounded-2xl border-2 p-6 relative ${p.highlight ? 'border-fm-yellow shadow-fm-yellow' : 'border-fm-border'}`}>
            {p.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase">
                {p.badge}
              </span>
            )}
            <h3 className="font-bold text-fm-green-dark mb-1">{p.name}</h3>
            <div className="my-3">
              <span className="font-display font-bold text-4xl text-fm-green-dark">{p.price}</span>
              <span className="text-fm-text-mute text-sm ml-1">{p.cadence}</span>
            </div>
            <p className="text-sm text-fm-text-soft mb-5">{p.sub}</p>
            <button
              onClick={() => handleCheckout(p)}
              disabled={loading === p.id}
              className={`btn w-full justify-center ${p.highlight ? 'btn-primary' : 'btn-dark'} disabled:opacity-50`}
            >
              {loading === p.id ? 'A redirecionar…' : 'Subscrever →'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-fm-ivory rounded-2xl border border-fm-border p-7">
        <h2 className="font-bold text-fm-green-dark mb-4">Tudo o que está incluído:</h2>
        <ul className="grid sm:grid-cols-2 gap-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-fm-text-soft">
              <Check size={16} className="text-fm-success mt-0.5 flex-shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-fm-text-mute text-xs mt-8">
        Pagamento seguro processado pela Stripe. Cancele a qualquer momento na sua conta.
      </p>
    </main>
  );
}
