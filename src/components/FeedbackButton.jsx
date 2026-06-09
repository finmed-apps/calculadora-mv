import { useState } from 'react';
import { MessageSquarePlus, X, Check, Bug, Lightbulb } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const KINDS = [
  { id: 'bug', label: 'Erro', icon: Bug },
  { id: 'sugestao', label: 'Sugestão', icon: Lightbulb },
  { id: 'outro', label: 'Outro', icon: MessageSquarePlus },
];

// Botão flutuante de report de erro / feedback. Guarda no servidor e
// encaminha por email para a equipa FINMED.
export function FeedbackButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('bug');
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [err, setErr] = useState('');

  if (!user) return null; // só para sessões autenticadas

  function close() {
    setOpen(false);
    setTimeout(() => { setStatus('idle'); setErr(''); setMsg(''); }, 200);
  }

  async function submit() {
    if (msg.trim().length < 2) return;
    setStatus('sending'); setErr('');
    const { error } = await supabase.rpc('submit_feedback', {
      p_kind: kind, p_message: msg.trim(), p_page: window.location.pathname,
    });
    if (error) { setStatus('error'); setErr(error.message); }
    else { setStatus('done'); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 bg-fm-green text-white rounded-full shadow-fm-lg px-4 py-3 flex items-center gap-2 text-sm font-semibold hover:bg-fm-green-dark hover:-translate-y-0.5 transition-all"
        title="Reportar erro ou enviar feedback"
      >
        <MessageSquarePlus size={18} />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/30" onClick={close} />
          <div className="relative bg-fm-paper w-full max-w-md rounded-2xl shadow-fm-lg p-6 fm-rise">
            <button onClick={close} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-fm-ivory text-fm-text-mute"><X size={18} /></button>

            {status === 'done' ? (
              <div className="text-center py-4">
                <Check className="mx-auto text-fm-success mb-3" size={42} />
                <h3 className="font-display font-bold text-xl text-fm-green-dark mb-1">Obrigado!</h3>
                <p className="text-fm-text-soft text-sm">Recebemos a tua mensagem. A equipa FINMED vai analisar.</p>
                <button onClick={close} className="btn btn-primary mt-5">Fechar</button>
              </div>
            ) : (
              <>
                <h3 className="font-display font-bold text-xl text-fm-green-dark mb-1">Reportar / Feedback</h3>
                <p className="text-fm-text-soft text-sm mb-4">Encontraste um erro ou tens uma sugestão? Conta-nos — vai direto para a equipa.</p>

                <div className="flex gap-2 mb-3">
                  {KINDS.map((k) => {
                    const I = k.icon;
                    return (
                      <button key={k.id} onClick={() => setKind(k.id)} className={`btn flex-1 justify-center text-xs ${kind === k.id ? 'btn-primary' : 'btn-ghost'}`}>
                        <I size={14} /> {k.label}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="Descreve o que aconteceu ou a tua ideia…"
                  className="input resize-none"
                  autoFocus
                />
                {err && <div className="text-fm-danger text-sm mt-2">{err}</div>}

                <button
                  onClick={submit}
                  disabled={status === 'sending' || msg.trim().length < 2}
                  className="btn btn-primary w-full justify-center mt-4 disabled:opacity-50"
                >
                  {status === 'sending' ? 'A enviar…' : 'Enviar'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
