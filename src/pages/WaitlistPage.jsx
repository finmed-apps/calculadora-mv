import { useState } from 'react';
import { Clock, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Logo';

// Mostrada a utilizadores autenticados cujo email NÃO está na lista de
// inscritos (paywall fechada). Captura o email para a lista de espera.
export function WaitlistPage() {
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [err, setErr] = useState('');

  async function join() {
    setStatus('sending');
    setErr('');
    const { error } = await supabase.rpc('join_waitlist', { p_email: user?.email });
    if (error) {
      setStatus('error');
      setErr(error.message);
    } else {
      setStatus('done');
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-fm-paper rounded-2xl shadow-fm-lg border border-fm-border p-8 sm:p-10 text-center">
        <div className="flex justify-center mb-6"><Logo variant="dark" className="h-7" /></div>

        {status === 'done' ? (
          <>
            <Check className="mx-auto mb-4 text-fm-success" size={44} />
            <h1 className="font-display text-2xl text-fm-green-dark mb-2">Estás na lista</h1>
            <p className="text-fm-text-soft text-sm">
              Assim que abrirmos o acesso público à calculadora, avisamos-te
              em <strong>{user?.email}</strong>.
            </p>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4">
              <Clock size={12} /> Brevemente
            </span>
            <h1 className="font-display text-2xl text-fm-green-dark mb-2">
              Ainda não abrimos ao público
            </h1>
            <p className="text-fm-text-soft text-sm mb-6">
              De momento a Calculadora FINMED está disponível apenas para os
              participantes da Masterclass. Junta-te à lista de espera e avisamos-te
              mal abra ao público.
            </p>
            {err && <div className="text-fm-danger text-sm mb-3">{err}</div>}
            <button
              onClick={join}
              disabled={status === 'sending'}
              className="btn btn-primary w-full justify-center disabled:opacity-50"
            >
              {status === 'sending' ? 'A juntar…' : 'Juntar-me à lista de espera'}
            </button>
          </>
        )}

        <button
          onClick={async () => { await signOut(); window.location.href = '/'; }}
          className="mt-6 text-sm text-fm-text-mute hover:text-fm-green font-semibold"
        >
          Terminar sessão
        </button>
      </div>
    </div>
  );
}
