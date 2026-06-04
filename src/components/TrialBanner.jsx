import { useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAccess } from '../hooks/useAccess';

// Aviso subtil no topo da app quando o trial está perto de terminar.
// Só aparece em trial com <= 7 dias. Sem preços (decisão da Luísa) —
// apenas informa e encaminha para a conta.
export function TrialBanner() {
  const { user } = useAuth();
  const access = useAccess(user?.id);
  const [hidden, setHidden] = useState(false);

  if (hidden || access.loading) return null;
  if (access.state !== 'trial') return null;
  const d = access.daysLeft;
  if (typeof d !== 'number' || d > 7) return null;

  const quando = d <= 0 ? 'hoje' : d === 1 ? 'amanhã' : `daqui a ${d} dias`;

  return (
    <div className="bg-fm-yellow/20 border-b border-fm-yellow/40">
      <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center gap-3 text-sm text-fm-green-dark">
        <Clock size={15} className="flex-shrink-0" />
        <span className="flex-1">
          O teu acesso à calculadora termina <strong>{quando}</strong>. Perto do fim
          mostramos-te as opções para continuares sem interrupção.
        </span>
        <button onClick={() => setHidden(true)} className="p-1 rounded hover:bg-fm-yellow/30" title="Fechar">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
