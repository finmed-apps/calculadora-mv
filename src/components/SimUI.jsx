import { useState } from 'react';
import { Edit2, RefreshCw, Save, FileDown } from 'lucide-react';
import { formatEuro, formatPct } from '../lib/calc';
import { AnimatedNumber } from './AnimatedNumber';

const euro = (n) => formatEuro(Math.round(n));

// Secção/cartão de formulário com o mesmo estilo dos passos existentes.
export function SimSection({ step, title, subtitle, children }) {
  return (
    <section className="bg-fm-paper rounded-2xl border border-fm-border shadow-fm p-8 sm:p-10 fm-rise">
      <span className="inline-block bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-3">
        {step}
      </span>
      <h2 className="text-2xl sm:text-3xl font-bold text-fm-green-dark mb-2">{title}</h2>
      {subtitle && <p className="text-fm-text-soft mb-6">{subtitle}</p>}
      {children}
    </section>
  );
}

// Campo de input (label, sufixo, ajuda) — comportamento "0 limpa ao focar".
export function Field({ label, type = 'text', value, onChange, placeholder, suffix, help, defaultZero, className = '' }) {
  function handleFocus(e) {
    if (defaultZero && (e.target.value === '0' || e.target.value === 0)) { e.target.value = ''; onChange(''); }
    requestAnimationFrame(() => e.target.select && e.target.select());
  }
  function handleBlur(e) { if (defaultZero && e.target.value === '') onChange(0); }
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`input ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fm-text-mute font-semibold text-sm pointer-events-none">{suffix}</span>}
      </div>
      {help && <div className="help">{help}</div>}
    </div>
  );
}

// Caixa de resultado (mesmo estilo do Result existente).
export function ResultShell({ title, children }) {
  return (
    <section className="bg-fm-paper rounded-2xl border border-fm-border shadow-fm p-8 sm:p-10 fm-rise">
      <span className="inline-block bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-3">
        Resultado
      </span>
      <h2 className="text-2xl sm:text-3xl font-bold text-fm-green-dark mb-6">{title}</h2>
      {children}
    </section>
  );
}

// Herói verde com o número grande (animado + brilho) e linha de métricas.
export function HeroIRS({ label, value, subtitle, metas }) {
  return (
    <div className="bg-gradient-to-br from-fm-green to-fm-green-soft rounded-2xl p-8 sm:p-10 text-white relative overflow-hidden mb-5">
      <div className="absolute -top-12 -right-12 w-56 h-56 bg-fm-yellow/10 rounded-full" />
      <span className="inline-block bg-fm-yellow/20 text-fm-yellow px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-4">
        {label}
      </span>
      <div className="font-display font-bold text-fm-yellow leading-none mb-2 fm-glow" style={{ fontSize: 'clamp(44px, 7.5vw, 78px)' }}>
        <AnimatedNumber value={value} format={euro} duration={950} />
      </div>
      {subtitle && <p className="text-[15px] text-white/80 max-w-xl">{subtitle}</p>}
      {metas && metas.length > 0 && (
        <div className="grid grid-cols-3 gap-6 mt-7 pt-5 border-t border-white/10 fm-stagger">
          {metas.map((m, i) => (
            <div key={i}>
              <div className="text-[11px] uppercase tracking-widest text-white/60 font-semibold mb-1">{m.label}</div>
              <div className="text-lg font-bold tabular-nums">{m.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MetricGrid({ children }) {
  return <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5 fm-stagger">{children}</div>;
}

export function MetricCard({ label, value, note, positive, negative }) {
  const c = positive ? 'text-fm-success' : negative ? 'text-fm-danger' : 'text-fm-green-dark';
  return (
    <div className="bg-fm-paper border border-fm-border rounded-lg p-5 fm-lift">
      <div className="text-[11px] uppercase tracking-widest font-bold text-fm-text-mute mb-1">{label}</div>
      <div className={`font-display text-2xl font-bold tabular-nums ${c}`}>
        {typeof value === 'number' ? <AnimatedNumber value={value} format={euro} /> : value}
      </div>
      {note && <div className="text-[12.5px] text-fm-text-mute mt-1 leading-snug">{note}</div>}
    </div>
  );
}

export function Alerts({ alerts }) {
  const colors = {
    info: 'bg-[#f3f6ec] border-fm-green-soft text-fm-green-dark',
    success: 'bg-[#ebf3e6] border-fm-success text-[#2a4f1d]',
    warning: 'bg-[#fdf3e1] border-fm-warn text-[#6b3f0d]',
    danger: 'bg-[#fbe9e7] border-fm-danger text-[#71281d]',
  };
  return (
    <>
      {(alerts || []).map((a, i) => (
        <div key={i} className={`rounded-lg p-4 mt-3 text-sm leading-relaxed border-l-4 ${colors[a.level] || colors.info}`}>{a.text}</div>
      ))}
    </>
  );
}

export function Disclaimers({ items }) {
  return (
    <div className="mt-6 bg-fm-ivory border border-fm-border rounded-xl p-5">
      <div className="text-xs uppercase tracking-wide font-bold text-fm-text-mute mb-2">Informações importantes</div>
      <ul className="space-y-1.5 text-[13px] text-fm-text-soft leading-relaxed list-disc pl-5">
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
      <a href="https://diariodarepublica.pt/dr/detalhe/portaria/382-2025-945460818" target="_blank" rel="noopener" className="inline-block mt-3 text-xs text-fm-green font-semibold hover:underline">
        Legislação — Portaria 382/2025 (coeficientes) →
      </a>
    </div>
  );
}

export function SaveBox({ savedId, saving, onSave }) {
  const [label, setLabel] = useState('');
  if (!onSave) return null;
  if (savedId) {
    return (
      <div className="mt-6 bg-fm-success/10 border-2 border-fm-success/30 rounded-xl p-4 flex items-center gap-3">
        <Save className="text-fm-success" size={20} />
        <span className="text-fm-success font-semibold text-sm">Simulação guardada no seu histórico.</span>
      </div>
    );
  }
  return (
    <div className="mt-6 bg-fm-ivory border border-fm-border rounded-xl p-5">
      <h3 className="font-bold text-fm-green-dark mb-2">Guardar esta simulação</h3>
      <p className="text-sm text-fm-text-soft mb-3">Atribua-lhe um nome para a encontrar mais tarde (ex: "T2 Graça", "Casa pais").</p>
      <div className="flex gap-2 flex-wrap">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nome da simulação" className="input flex-1 min-w-[200px]" maxLength={80} />
        <button className="btn btn-dark" onClick={() => onSave(label)} disabled={saving}>
          <Save size={16} /> {saving ? 'A guardar…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

export function ResultToolbar({ onEdit, onReset, onExportPdf }) {
  return (
    <div className="flex gap-2 mt-5 flex-wrap">
      {onExportPdf && <button className="btn btn-ghost" onClick={onExportPdf}><FileDown size={16} /> Exportar PDF</button>}
      <button className="btn btn-ghost" onClick={onEdit}><Edit2 size={16} /> Editar dados</button>
      <button className="btn btn-ghost" onClick={onReset}><RefreshCw size={16} /> Nova simulação</button>
    </div>
  );
}

export { euro, formatEuro, formatPct };
