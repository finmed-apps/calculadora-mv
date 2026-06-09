import { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';

const STEPS = [
  'A reunir os dados da escritura…',
  'A aplicar os coeficientes de desvalorização…',
  'A calcular a mais-valia tributável…',
  'A apurar o IRS sobre a mais-valia…',
];

// Mostrado durante uma fração de segundo antes de o resultado ser revelado,
// para dar a sensação de que o valor está a ser apurado passo a passo.
export function CalculatingOverlay() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % STEPS.length), 360);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="bg-fm-paper rounded-2xl border border-fm-border shadow-fm p-10 sm:p-14 fm-rise">
      <div className="flex flex-col items-center text-center">
        <div className="relative w-24 h-24 mb-7 flex items-center justify-center">
          <span className="fm-ring" />
          <span className="fm-ring" style={{ animationDelay: '.5s' }} />
          <div className="relative w-16 h-16 rounded-2xl bg-fm-green text-fm-yellow flex items-center justify-center shadow-fm">
            <Calculator size={28} className="fm-tick" />
          </div>
        </div>

        <div className="font-display font-bold text-fm-green-dark text-2xl mb-2">
          A apurar a sua simulação
        </div>
        <div className="text-fm-text-soft text-sm h-5 mb-6">{STEPS[i]}</div>

        <div className="w-full max-w-xs h-1.5 bg-fm-border rounded-full overflow-hidden">
          <div className="h-full bg-fm-yellow fm-progress" />
        </div>
      </div>
    </section>
  );
}
