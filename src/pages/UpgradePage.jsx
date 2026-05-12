import { Check, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';

// Os benefícios mensais equivalentes:
// 6 meses por 65€  →  10,83 €/mês
// Anual    por 100€ →  8,33 €/mês

const PLANS = [
  {
    id: 'one_off_6m',
    name: '6 meses',
    price: '65 €',
    cadence: 'pagamento único',
    equivalent: '≈ 10,83 €/mês',
    priceEnv: 'VITE_STRIPE_PRICE_ONE_OFF_6M',
    mode: 'payment',
    features: [
      'Simulações ilimitadas durante 6 meses',
      'Histórico completo de simulações',
      'Relatórios PDF com branding FINMED',
      'Suporte por email',
    ],
  },
  {
    id: 'one_off_12m',
    name: 'Anual',
    price: '100 €',
    cadence: 'pagamento único',
    equivalent: '≈ 8,33 €/mês',
    priceEnv: 'VITE_STRIPE_PRICE_ONE_OFF_12M',
    mode: 'payment',
    badge: 'POUPA ~23%',
    highlight: true,
    features: [
      'Simulações ilimitadas durante 12 meses',
      'Histórico completo de simulações',
      'Relatórios PDF com branding FINMED',
      'Suporte prioritário por email e telefone',
      'Acesso a webinars trimestrais sobre fiscalidade imobiliária',
      'Análise gratuita de 1 caso real pela equipa FINMED',
    ],
  },
];

export function UpgradePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);

  async function handleCheckout(plan) {
    if (!user) {
      window.location.href = '/login?from=/app/upgrade';
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
        body: { priceId, mode: plan.mode, planKind: plan.id },
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

      <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`bg-fm-paper rounded-2xl border-2 p-7 sm:p-8 relative ${p.highlight ? 'border-fm-yellow shadow-fm-yellow' : 'border-fm-border'}`}
          >
            {p.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase whitespace-nowrap">
                {p.badge}
              </span>
            )}

            <h3 className="font-bold text-fm-green-dark text-lg mb-1">{p.name}</h3>
            <div className="mt-3 mb-1">
              <span className="font-display font-bold text-4xl text-fm-green-dark">{p.price}</span>
            </div>
            <p className="text-sm text-fm-text-soft mb-1">{p.cadence}</p>
            <p className="text-xs text-fm-text-mute mb-5">{p.equivalent}</p>

            <button
              onClick={() => handleCheckout(p)}
              disabled={loading === p.id}
              className={`btn w-full justify-center mb-6 ${p.highlight ? 'btn-primary' : 'btn-dark'} disabled:opacity-50`}
            >
              {loading === p.id ? 'A redirecionar…' : 'Subscrever →'}
            </button>

            <ul className="space-y-2.5 pt-5 border-t border-fm-border">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-fm-text-soft">
                  <Check size={16} className="text-fm-success mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-center text-fm-text-mute text-xs mt-10">
        Pagamento seguro processado pela Stripe. Sem renovação automática — paga apenas uma vez pelo período escolhido.
      </p>
    </main>
  );
}
