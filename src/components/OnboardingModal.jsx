import { useState } from 'react';
import { Calculator, Layers, FileDown, X, ArrowRight, Check } from 'lucide-react';

const SLIDES = [
  {
    icon: Calculator,
    title: 'Bem-vindo à Calculadora FINMED',
    body: 'Descobre em menos de um minuto quanto vais pagar de IRS na venda de um imóvel em Portugal. Sem folhas de Excel, sem complicações.',
  },
  {
    icon: Layers,
    title: '4 cenários cobertos',
    body: 'Caso geral, Habitação Própria Permanente com reinvestimento, imóveis anteriores a 1989 e venda ao Estado. A ferramenta aplica automaticamente os coeficientes de desvalorização e as isenções.',
  },
  {
    icon: FileDown,
    title: 'Guarda e exporta',
    body: 'Guarda cada simulação no teu histórico e gera um relatório PDF com a marca FINMED para partilhar. Tens acesso completo durante o período da Masterclass.',
  },
];

// Modal de introdução, mostrado no primeiro acesso à calculadora.
export function OnboardingModal({ open, onClose }) {
  const [i, setI] = useState(0);
  if (!open) return null;
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];
  const Icon = s.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-fm-paper w-full max-w-md rounded-2xl shadow-fm-lg p-7 sm:p-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-fm-ivory text-fm-text-mute" title="Fechar">
          <X size={18} />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-fm-green/10 flex items-center justify-center mb-5">
          <Icon className="text-fm-green" size={26} />
        </div>

        <h2 className="font-display font-bold text-2xl text-fm-green-dark mb-2">{s.title}</h2>
        <p className="text-fm-text-soft leading-relaxed mb-6">{s.body}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {SLIDES.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-6 bg-fm-green' : 'w-1.5 bg-fm-border'}`} />
            ))}
          </div>
          {last ? (
            <button onClick={onClose} className="btn btn-primary"><Check size={16} /> Começar</button>
          ) : (
            <button onClick={() => setI(i + 1)} className="btn btn-primary">Seguinte <ArrowRight size={16} /></button>
          )}
        </div>

        {!last && (
          <button onClick={onClose} className="block mx-auto mt-4 text-xs text-fm-text-mute hover:text-fm-green font-semibold">
            Saltar introdução
          </button>
        )}
      </div>
    </div>
  );
}

// Helpers de persistência (localStorage, tolerante a modo privado).
const KEY = 'fm_onboarded_v1';
export function hasSeenOnboarding() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
export function markOnboardingSeen() {
  try { localStorage.setItem(KEY, '1'); } catch { /* ignora */ }
}
export function resetOnboarding() {
  try { localStorage.removeItem(KEY); } catch { /* ignora */ }
}
