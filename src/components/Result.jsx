import { useState } from 'react';
import { Edit2, RefreshCw, Save, FileDown, MessageSquare } from 'lucide-react';
import { formatEuro, formatPct } from '../lib/calc';
import { AnimatedNumber } from './AnimatedNumber';

export function Result({ result, onEdit, onReset, onSave, onExportPdf, saving, savedId, hasPaidAccess }) {
  const [label, setLabel] = useState('');
  const isHPP = result.inputs?.scenario === 'hpp';

  return (
    <section className="bg-fm-paper rounded-2xl border border-fm-border shadow-fm p-8 sm:p-10 fm-rise">
      <span className="inline-block bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-3">
        Passo 3 · Resultado
      </span>
      <h2 className="text-2xl sm:text-3xl font-bold text-fm-green-dark mb-6">A sua simulação está pronta</h2>

      {/* HERO */}
      <div className="bg-gradient-to-br from-fm-green to-fm-green-soft rounded-2xl p-8 sm:p-10 text-white relative overflow-hidden mb-5">
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-fm-yellow/10 rounded-full" />
        <span className="inline-block bg-fm-yellow/20 text-fm-yellow px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-4">
          IRS estimado sobre a mais-valia
        </span>
        <div className="font-display font-bold text-fm-yellow leading-none mb-2 fm-glow" style={{ fontSize: 'clamp(48px, 8vw, 84px)' }}>
          <AnimatedNumber value={result.irsIsolado} format={(n) => formatEuro(Math.round(n))} />
        </div>
        <p className="text-[15px] text-white/80 max-w-xl">
          {result.maisValia < 0
            ? 'Não há mais-valia a tributar — o valor de venda não cobre o valor de aquisição + despesas. Esta menos-valia pode ser compensada em IRS nos anos seguintes.'
            : isHPP && result.valorNaoReinvestido === 0 && result.ganhoVenda > 0
              ? 'Isenção total — reinvestimento integral do ganho na nova HPP. Requer cumprimento dos requisitos de morada fiscal e prazo de 36 meses.'
              : 'Este valor é o IRS isolado sobre a mais-valia deste imóvel. O imposto real é apurado pelo englobamento com os restantes rendimentos do agregado.'}
        </p>

        <div className="grid grid-cols-3 gap-6 mt-7 pt-5 border-t border-white/10 fm-stagger">
          <Meta lbl="Mais-valia bruta" val={formatEuro(result.maisValia)} />
          <Meta lbl="Tributável final" val={formatEuro(result.tributavelFinal)} />
          <Meta lbl="Taxa efetiva" val={result.tributavelFinal > 0 ? formatPct(result.taxaEfetiva) : '—'} />
        </div>
      </div>

      {/* BREAKDOWN */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5 fm-stagger">
        <Metric label="Valor de venda" value={formatEuro(result.inputs?.valorVenda)} />
        <Metric label="Valor de aquisição" value={formatEuro(result.valorCompraAtual)} />
        <Metric label="Despesas dedutíveis" value={formatEuro(result.totalDespesas)} />
        <Metric label="Mais-valia bruta" value={formatEuro(result.maisValia)} positive={result.maisValia >= 0} negative={result.maisValia < 0} note="Venda − Aquisição − Despesas" />
        <Metric label="Tributável 50%" value={formatEuro(result.tributavel50)} note="Categoria G — IRS" />
        {isHPP && <Metric label="Ganho da venda" value={formatEuro(result.ganhoVenda)} note="Venda − Capital em dívida" />}
        {isHPP && <Metric label="Reinvestido (próprio)" value={formatEuro(result.valorReinvestido)} note="Nova casa − Novo empréstimo" />}
        {isHPP && <Metric label="Não reinvestido" value={formatEuro(result.valorNaoReinvestido)} note={result.ganhoVenda > 0 ? `${formatPct(result.percentNaoReinv)} do ganho` : ''} />}
        {isHPP && <Metric label="Tributável final" value={formatEuro(result.tributavelFinal)} note="Proporcional ao não reinvestido" />}
      </div>

      {/* ALERTS */}
      {result.alerts.map((a, i) => <Alert key={i} {...a} />)}

      {/* Guardar simulação */}
      {!savedId && (
        <div className="mt-6 bg-fm-ivory border border-fm-border rounded-xl p-5">
          <h3 className="font-bold text-fm-green-dark mb-2">Guardar esta simulação</h3>
          <p className="text-sm text-fm-text-soft mb-3">Atribua-lhe um nome para a encontrar mais tarde (ex: "T2 Graça", "Casa pais").</p>
          <div className="flex gap-2 flex-wrap">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nome da simulação"
              className="input flex-1 min-w-[200px]"
              maxLength={80}
            />
            <button className="btn btn-dark" onClick={() => onSave(label)} disabled={saving}>
              <Save size={16} /> {saving ? 'A guardar…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
      {savedId && (
        <div className="mt-6 bg-fm-success/10 border-2 border-fm-success/30 rounded-xl p-4 flex items-center gap-3">
          <Save className="text-fm-success" size={20} />
          <span className="text-fm-success font-semibold text-sm">Simulação guardada no seu histórico.</span>
        </div>
      )}

      {/* CTA bar */}
      <div className="mt-5 bg-fm-yellow rounded-xl p-6 flex items-center justify-between gap-5 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <div className="font-display font-bold text-fm-green-dark text-xl mb-1">
            Quer confirmar este cálculo com um especialista?
          </div>
          <div className="text-sm text-fm-green-dark/80">
            Agende uma consultoria com a equipa FINMED antes da escritura.
          </div>
        </div>
        <a href="https://finmed.pt/consultoria" target="_blank" rel="noopener" className="btn btn-dark">
          <MessageSquare size={16} /> Agendar consultoria →
        </a>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 mt-4 flex-wrap">
        <button className="btn btn-ghost" onClick={onExportPdf}>
          <FileDown size={16} /> Exportar PDF
        </button>
        <button className="btn btn-ghost" onClick={onEdit}>
          <Edit2 size={16} /> Editar dados
        </button>
        <button className="btn btn-ghost" onClick={onReset}>
          <RefreshCw size={16} /> Nova simulação
        </button>
      </div>
    </section>
  );
}

function Meta({ lbl, val }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-white/60 font-semibold mb-1">{lbl}</div>
      <div className="text-lg font-bold tabular-nums">{val}</div>
    </div>
  );
}

function Metric({ label, value, note, positive, negative }) {
  const valColor = positive ? 'text-fm-success' : negative ? 'text-fm-danger' : 'text-fm-green-dark';
  return (
    <div className="bg-fm-paper border border-fm-border rounded-lg p-5 fm-lift">
      <div className="text-[11px] uppercase tracking-widest font-bold text-fm-text-mute mb-1">{label}</div>
      <div className={`font-display text-2xl font-bold tabular-nums ${valColor}`}>{value}</div>
      {note && <div className="text-[12.5px] text-fm-text-mute mt-1 leading-snug">{note}</div>}
    </div>
  );
}

function Alert({ level, text }) {
  const colors = {
    info:    'bg-[#f3f6ec] border-fm-green-soft text-fm-green-dark',
    success: 'bg-[#ebf3e6] border-fm-success text-[#2a4f1d]',
    warning: 'bg-[#fdf3e1] border-fm-warn text-[#6b3f0d]',
    danger:  'bg-[#fbe9e7] border-fm-danger text-[#71281d]',
  };
  return (
    <div className={`rounded-lg p-4 mt-3 text-sm leading-relaxed border-l-4 ${colors[level] || colors.info}`}>
      {text}
    </div>
  );
}
