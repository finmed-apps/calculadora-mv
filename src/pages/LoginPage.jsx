import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Logo';

export function LoginPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [err, setErr] = useState('');

  // Se já está logado, redireciona
  useEffect(() => {
    if (user) {
      const queryFrom = new URLSearchParams(location.search).get('from');
      const dest = location.state?.from || queryFrom || '/app';
      nav(dest, { replace: true });
    }
  }, [user, nav, location]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setStatus('sending');
    setErr('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/app',
      },
    });
    if (error) {
      setStatus('error');
      setErr(error.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <div className="min-h-screen bg-fm-green flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-fm-paper rounded-2xl shadow-fm-lg p-8 sm:p-10">
        <div className="flex justify-center mb-8">
          <Logo variant="dark" className="h-7" />
        </div>

        {status === 'sent' ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 text-fm-success" size={48} />
            <h1 className="text-2xl font-bold mb-2">Verifique o seu email</h1>
            <p className="text-fm-text-soft text-sm">
              Enviámos um link para <strong>{email}</strong>.<br />
              Clique no link para entrar na sua conta.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 text-sm text-fm-green font-semibold hover:underline"
            >
              Usar outro email
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Entrar</h1>
            <p className="text-fm-text-soft text-sm mb-6">
              Indique o seu email. Receberá um link mágico para entrar — sem necessidade de password.
            </p>

            <form onSubmit={handleSubmit}>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-fm-text-mute" size={18} />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="o.seu@email.pt"
                  className="input pl-10"
                />
              </div>
              {err && <div className="text-fm-danger text-sm mt-2">{err}</div>}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="btn btn-primary w-full justify-center mt-5 disabled:opacity-50"
              >
                {status === 'sending' ? 'A enviar…' : 'Enviar link mágico →'}
              </button>
            </form>

            <p className="text-xs text-fm-text-mute mt-6 text-center">
              Ao entrar concorda com a recolha do seu email para envio de atualizações sobre a ferramenta.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
