import { useState, useEffect } from 'react';
import { Edit2, RefreshCw, Save, FileDown, MessageSquare } from 'lucide-react';
import { formatEuro, formatPct } from '../lib/calc';
import { AnimatedNumber } from './AnimatedNumber';

const euro = (n) => formatEuro(Math.round(n));

// Revelação encadeada: os blocos aparecem um a um e os números contam quando
// entram em cena, guiando o olhar pelo resultado em vez de mostrar tudo de uma vez.
function useResultSequence(result) {
  const [stage, setStage] = useState(0);

  const breakdownCount = 5 + (result?.inputs?.scenario === 'hpp' ? 4 : 0);
  const alertCount = result?.alerts?.length || 0;
  const maxStage = 3 + breakdownCount + alertCount;

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setStage(maxStage); return; }

    setStage(0);
    const schedule = [];
    schedule.push([1, 1000]);   // insight do herói (depois do número contar)
    schedule.push([2, 1280]);   // métricas do herói
    let t = 1600;
    for (let i = 0; i < breakdownCount; i++) { schedule.push([3 + i, t]); t += 200; }
    t += 140;
    for (let j = 0; j < alertCount; j++) { schedule.push([3 + breakdownCount + j, t]); t += 200; }
    schedule.push([maxStage, t + 100]);  // rodapé (guardar/CTA/ações)

    const timers = schedule.map(([s, at]) =>
      setTimeout(() => setStage((cur) => Math.max(cur, s)), at));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return { stage, breakdownCount, alertCount, maxStage };
}

export function Result({ result, onEdit, onReset, onSave, onExportPdf, saving, savedId, hasPaidAccess }) {
  const [label, setLabel] = useState('');
  const isHPP = result.inputs?.scenario === 'hpp';
  const { stage } = useResultSequence(result);

  // Itens do breakdown (com valores em bruto para contarem)
  const breakdown = [
    { label: 'Valor de venda', value: result.inputs?.valorVenda, format: euro },
    { label: 'Valor de aquisição', value: result.valorCompraAtual, format: euro },
    { label: 'Despesas dedutíveis', value: result.totalDespesas, format: euro },
    { label: 'Mais-valia bruta', value: result.maisValia, format: euro, positive: result.maisValia >= 0, negative: result.maisValia < 0, note: 'Venda − Aquisição − Despesas' },
    { label: 'Tributável 50%', value: result.tributavel50, format: euro, note: 'Categoria G — IRS' },
    ...(isHPP ? [
      { label: 'Ganho da venda', value: result.ganhoVenda, format: euro, note: 'Venda − Capital em dívida' },
      { label: 'Reinvestido (próprio)', value: result.valorReinvestido, format: euro, note: 'Nova casa − Novo empréstimo' },
      { label: 'Não reinvestido', value: result.valorNaoReinvestido, format: euro, note: result.ganhoVenda > 0 ? `${formatPct(result.percentNaoReinv)} do ganho` : '' },
      { label: 'Tributável final', value: result.tributavelFinal, format: euro, note: 'Proporcional ao não reinvestido' },
    ] : []),
  ];
  const alerts = result.alerts || [];

  const insightShown = stage >= 1;
  const metasShown = stage >= 2;
  const breakdownShown = Math.max(0, stage - 2);                 // nº de cartões visíveis
  const alertsShown = Math.max(0, stage - 2 - breakdown.length); // nº de alertas visíveis
  const footerShown = stage >= 3 + breakdown.length + alerts.length;

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
          <AnimatedNumber value={result.irsIsolado} format={euro} duration={950} />
        </div>

        {/* Insight só depois do número assentar */}
        <p className={`text-[15px] text-white/80 max-w-xl transition-all duration-500 ${insightShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          {result.maisValia < 0
            ? 'Não há mais-valia a tributar — o valor de venda não cobre o valor de aquisição + despesas. Esta menos-valia pode ser compensada em IRS nos anos seguintes.'
            : isHPP && result.valorNaoReinvestido === 0 && result.ganhoVenda > 0
              ? 'Isenção total — reinvestimento integral do ganho na nova HPP. Requer cumprimento dos requisitos de morada fiscal e prazo de 36 meses.'
              : 'Este valor é o IRS isolado sobre a mais-valia deste imóvel. O imposto real é apurado pelo englobamento com os restantes rendimentos do agregado.'}
        </p>

        {metasShown && (
          <div className="grid grid-cols-3 gap-6 mt-7 pt-5 border-t border-white/10 fm-stagger">
            <Meta lbl="Mais-valia bruta" value={result.maisValia} format={euro} />
            <Meta lbl="Tributável final" value={result.tributavelFinal} format={euro} />
            <Meta lbl="Taxa efetiva" value={result.tributavelFinal > 0 ? result.taxaEfetiva : null} format={formatPct} fallback="—" />
          </div>
        )}
      </div>

      {/* BREAKDOWN — cartões revelados um a um, cada um a contar */}
      {breakdownShown > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {breakdown.slice(0, breakdownShown).map((m, i) => (
            <Metric key={i} {...m} />
          ))}
        </div>
      )}

      {/* ALERTS / insights — só depois de todos os números */}
      {alerts.slice(0, alertsShown).map((a, i) => <Alert key={i} {...a} />)}

      {/* Rodapé: guardar + CTA + ações */}
      <div className={`transition-opacity duration-500 ${footerShown ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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

        <div className="mt-5 bg-fm-yellow rounded-xl p-6 flex items-center justify-between gap-5 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <div className="font-display font-bold text-fm-green-dark text-xl mb-1">
              Quer confirmar este cálculo com um especialista?
            </div>
            <div className="text-sm text-fm-green-dark/80">
              Agende uma consultoria com a equipa FINMED antes da escritura.
            </div>
          </div>
          <a href="https://api.leadconnectorhq.com/widget/survey/db5HCMe4YhWeJdYk969X" target="_blank" rel="noopener" className="btn btn-dark">
            <MessageSquare size={16} /> Agendar consultoria →
          </a>
        </div>

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
      </div>
    </section>
  );
}

function Meta({ lbl, value, format, fallback }) {
  const animate = typeof value === 'number' && isFinite(value);
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-white/60 font-semibold mb-1">{lbl}</div>
      <div className="text-lg font-bold tabular-nums">
        {animate ? <AnimatedNumber value={value} format={format} /> : (fallback ?? '—')}
      </div>
    </div>
  );
}

function Metric({ label, value, format, note, positive, negative }) {
  const valColor = positive ? 'text-fm-success' : negative ? 'text-fm-danger' : 'text-fm-green-dark';
  const animate = typeof value === 'number' && isFinite(value);
  return (
    <div className="bg-fm-paper border border-fm-border rounded-lg p-5 fm-rise fm-lift">
      <div className="text-[11px] uppercase tracking-widest font-bold text-fm-text-mute mb-1">{label}</div>
      <div className={`font-display text-2xl font-bold tabular-nums ${valColor}`}>
        {animate ? <AnimatedNumber value={value} format={format} /> : format(value)}
      </div>
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
    <div className={`rounded-lg p-4 mt-3 text-sm leading-relaxed border-l-4 fm-rise ${colors[level] || colors.info}`}>
      {text}
    </div>
  );
}
