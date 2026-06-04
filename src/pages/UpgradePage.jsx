import { Check, Crown, Clock, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useAccess } from '../hooks/useAccess';
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

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

export function UpgradePage() {
  const { user } = useAuth();
  const access = useAccess(user?.id);
  const [loading, setLoading] = useState(null);
  const [notice, setNotice] = useState('');

  async function handleCheckout(plan) {
    if (!user) {
      window.location.href = '/login?from=/app/upgrade';
      return;
    }
    setLoading(plan.id);
    setNotice('');
    try {
      const priceId = import.meta.env[plan.priceEnv];
      if (!priceId) {
        // Stripe ainda não está ligado — degrada com elegância (sem erro feio).
        setNotice('Os pagamentos online vão estar disponíveis muito em breve. Para ativares já o teu acesso, fala com a equipa FINMED: suporte@finmed.pt');
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
      setNotice('Não foi possível iniciar o pagamento online neste momento. Tenta novamente daqui a pouco ou fala connosco: suporte@finmed.pt');
      setLoading(null);
    }
  }

  if (access.loading) {
    return (
      <main className="max-w-5xl mx-auto px-5 py-16 text-center text-fm-text-mute text-sm">A carregar…</main>
    );
  }

  // DECISÃO DA LUÍSA: durante o trial NÃO se mostram preços.
  // Só quando o trial termina é que aparece a tabela de planos.
  const trialActive = access.state === 'trial';
  const alreadyPro = access.state === 'active' || access.state === 'granted' || access.state === 'admin';

  if (trialActive) {
    return (
      <main className="max-w-xl mx-auto px-5 py-16 text-center">
        <span className="inline-flex items-center gap-1.5 bg-fm-yellow/30 text-fm-green-dark px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4">
          <Clock size={12} /> Acesso ativo
        </span>
        <h1 className="font-display font-bold text-fm-green-dark text-3xl mb-3">
          Tens acesso completo à calculadora
        </h1>
        <p className="text-fm-text-soft mb-2">
          Aproveita todas as simulações que precisares — sem limites.
        </p>
        {access.effectiveEnd && (
          <p className="text-fm-text-mute text-sm mb-8">
            O teu acesso está garantido até <strong>{fmtDate(access.effectiveEnd)}</strong>.
            Perto dessa data avisamos-te com as opções para continuares.
          </p>
        )}
        <a href="/app" className="btn btn-primary">← Voltar à calculadora</a>
      </main>
    );
  }

  if (alreadyPro) {
    return (
      <main className="max-w-xl mx-auto px-5 py-16 text-center">
        <span className="inline-flex items-center gap-1.5 bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4">
          <Crown size={12} /> Acesso Premium ativo
        </span>
        <h1 className="font-display font-bold text-fm-green-dark text-3xl mb-3">Já tens acesso PRO</h1>
        {access.effectiveEnd && (
          <p className="text-fm-text-soft mb-8">Válido até <strong>{fmtDate(access.effectiveEnd)}</strong>.</p>
        )}
        <a href="/app" className="btn btn-primary">← Voltar à calculadora</a>
      </main>
    );
  }

  // Trial terminado (expired) ou sem acesso (none) → mostrar planos.
  return (
    <main className="max-w-5xl mx-auto px-5 py-10 sm:py-16">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4">
          <Crown size={12} /> Continua a usar a calculadora
        </span>
        <h1 className="font-display font-bold text-fm-green-dark text-3xl sm:text-4xl mb-3">
          {access.state === 'expired' ? 'O teu período de acesso terminou' : 'Desbloqueia a Calculadora FINMED'}
        </h1>
        <p className="text-fm-text-soft max-w-2xl mx-auto">
          Escolhe um plano para continuares com simulações ilimitadas, histórico e
          relatórios PDF profissionais com o apoio da equipa FINMED.
        </p>
      </div>

      {notice && (
        <div className="max-w-2xl mx-auto mb-8 bg-fm-yellow/15 border border-fm-yellow/40 text-fm-green-dark text-sm rounded-xl px-5 py-4 flex items-start gap-3">
          <ShieldCheck size={18} className="flex-shrink-0 mt-0.5 text-fm-green" />
          <span>{notice}</span>
        </div>
      )}

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
        Pagamento seguro processado pela Stripe. Sem renovação automática — pagas apenas uma vez pelo período escolhido.
      </p>
    </main>
  );
}
