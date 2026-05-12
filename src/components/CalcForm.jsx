import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const EMPTY = {
  dataCompra: '',
  dataVenda: '',
  valorCompra: '',
  valorVenda: '',
  despesas: { escritura: 0, selo: 0, imt: 0, cert: 0, comissao: 0, melhoria: 0 },
  hpp: { dividaBanco: 0, novaValor: 0, novaPercent: 0 },
};

export function CalcForm({ scenario, onCancel, onCalculate }) {
  const [data, setData] = useState(EMPTY);
  const [phase, setPhase] = useState('A');

  const isHPP = scenario === 'hpp';

  function setField(key, val) { setData((d) => ({ ...d, [key]: val })); }
  function setDespesa(key, val) {
    setData((d) => ({ ...d, despesas: { ...d.despesas, [key]: val } }));
  }
  function setHpp(key, val) {
    setData((d) => ({ ...d, hpp: { ...d.hpp, [key]: val } }));
  }

  function validateA() {
    const missing = [];
    if (!data.dataCompra) missing.push('Data de aquisição');
    if (!data.dataVenda) missing.push('Data de venda');
    if (!data.valorCompra) missing.push('Valor de aquisição');
    if (!data.valorVenda) missing.push('Valor de venda');
    if (missing.length) {
      alert('Faltam dados obrigatórios:\n\n• ' + missing.join('\n• '));
      return false;
    }
    return true;
  }

  function handleCalc() {
    if (!validateA()) { setPhase('A'); return; }
    onCalculate({
      scenario,
      dataCompra: data.dataCompra,
      dataVenda: data.dataVenda,
      valorCompra: Number(data.valorCompra),
      valorVenda: Number(data.valorVenda),
      despesas: data.despesas,
      hpp: data.hpp,
    });
  }

  return (
    <section className="bg-fm-paper rounded-2xl border border-fm-border shadow-fm p-8 sm:p-10">
      <span className="inline-block bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-3">
        Passo 2 · Dados
      </span>
      <h2 className="text-2xl sm:text-3xl font-bold text-fm-green-dark mb-2">
        {isHPP ? 'HPP com reinvestimento' : 'Simulação de Mais-Valia'}
      </h2>
      <p className="text-fm-text-soft mb-6">
        Preencha cada passo. As secções seguintes vão sendo desbloqueadas à medida que preenche.
      </p>

      {/* FASE A */}
      <PhaseBlock
        num="A"
        title="Dados do imóvel vendido"
        sub="Datas e valores da escritura."
        state={phase === 'A' ? 'active' : 'completed'}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Data de aquisição *" type="date" value={data.dataCompra} onChange={(v) => setField('dataCompra', v)} />
          <Field label="Data de venda *" type="date" value={data.dataVenda} onChange={(v) => setField('dataVenda', v)} />
          <Field label="Valor de aquisição *" type="number" suffix="€" placeholder="120 000" value={data.valorCompra} onChange={(v) => setField('valorCompra', v)} help="Valor constante na escritura de compra." />
          <Field label="Valor de venda *" type="number" suffix="€" placeholder="250 000" value={data.valorVenda} onChange={(v) => setField('valorVenda', v)} help="Valor da escritura de venda ou VPT — o mais elevado." />
        </div>
        {phase === 'A' && (
          <div className="flex gap-2 mt-5 flex-wrap">
            <button className="btn btn-ghost" onClick={onCancel}>← Voltar à triagem</button>
            <button className="btn btn-primary" onClick={() => validateA() && setPhase('B')}>Continuar <ArrowRight size={16} /></button>
          </div>
        )}
      </PhaseBlock>

      {/* FASE B */}
      <PhaseBlock
        num="B"
        title="Despesas dedutíveis"
        sub="Reduzem a mais-valia tributável. Deixe a zero o que não tiver."
        state={phase === 'A' ? 'locked' : phase === 'B' ? 'active' : 'completed'}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Escritura e registo" type="number" suffix="€" defaultZero value={data.despesas.escritura} onChange={(v) => setDespesa('escritura', v)} />
          <Field label="Imposto do Selo (na compra)" type="number" suffix="€" defaultZero value={data.despesas.selo} onChange={(v) => setDespesa('selo', v)} />
          <Field label="IMT (na compra)" type="number" suffix="€" defaultZero value={data.despesas.imt} onChange={(v) => setDespesa('imt', v)} />
          <Field label="Certificado energético" type="number" suffix="€" defaultZero value={data.despesas.cert} onChange={(v) => setDespesa('cert', v)} />
          <Field label="Comissão imobiliária (na venda)" type="number" suffix="€" defaultZero value={data.despesas.comissao} onChange={(v) => setDespesa('comissao', v)} />
          <Field label="Obras de valorização" type="number" suffix="€" defaultZero value={data.despesas.melhoria} onChange={(v) => setDespesa('melhoria', v)} help="Apenas obras dos últimos 12 anos com fatura." />
        </div>
        {phase === 'B' && (
          <div className="flex gap-2 mt-5 flex-wrap">
            <button className="btn btn-ghost" onClick={() => setPhase('A')}><ArrowLeft size={16} /> Atrás</button>
            <button className="btn btn-primary" onClick={() => setPhase('C')}>Continuar <ArrowRight size={16} /></button>
          </div>
        )}
      </PhaseBlock>

      {/* FASE C */}
      <PhaseBlock
        num="C"
        title={isHPP ? 'Reinvestimento em nova HPP' : 'Pronto a calcular'}
        sub={isHPP ? 'Dados do empréstimo do imóvel vendido e da nova HPP.' : 'Reveja os dados acima e finalize a simulação.'}
        state={phase === 'C' ? 'active' : 'locked'}
      >
        {isHPP ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field className="sm:col-span-2" label="Capital em dívida ao banco na data da venda" type="number" suffix="€" defaultZero value={data.hpp.dividaBanco} onChange={(v) => setHpp('dividaBanco', v)} help="Apenas capital (sem juros). Será deduzido ao valor de venda para apurar o ganho a reinvestir." />
            <Field label="Valor de compra da nova HPP" type="number" suffix="€" defaultZero placeholder="280 000" value={data.hpp.novaValor} onChange={(v) => setHpp('novaValor', v)} />
            <Field label="% financiada pelo banco" type="number" suffix="%" defaultZero value={data.hpp.novaPercent} onChange={(v) => setHpp('novaPercent', v)} help="Percentagem do valor de compra financiada com crédito habitação." />
          </div>
        ) : (
          <p className="text-fm-text-soft text-sm leading-relaxed">
            Com os dados preenchidos, vamos calcular a mais-valia tributável (50%), o IRS isolado sobre a mais-valia e a taxa efetiva. <strong>Importante:</strong> este valor é uma estimativa isolada — o IRS final depende do englobamento com os restantes rendimentos do seu agregado.
          </p>
        )}
        {phase === 'C' && (
          <div className="flex gap-2 mt-5 flex-wrap">
            <button className="btn btn-ghost" onClick={() => setPhase('B')}><ArrowLeft size={16} /> Atrás</button>
            <button className="btn btn-primary" onClick={handleCalc}>Calcular <ArrowRight size={16} /></button>
          </div>
        )}
      </PhaseBlock>
    </section>
  );
}

// ============================================================
// PhaseBlock
// ============================================================
function PhaseBlock({ num, title, sub, state, children }) {
  const isLocked = state === 'locked';
  const isActive = state === 'active';
  const isCompleted = state === 'completed';

  return (
    <div className={[
      'border-2 rounded-xl p-6 mb-3 transition-all relative',
      isLocked && 'opacity-40 pointer-events-none bg-fm-ivory border-fm-border',
      isActive && 'border-fm-yellow shadow-[0_8px_32px_rgba(244,197,66,0.18)] bg-fm-paper',
      isCompleted && 'bg-gradient-to-r from-fm-ivory to-fm-paper border-fm-border',
    ].filter(Boolean).join(' ')}>
      {isCompleted && (
        <div className="absolute top-5 right-5 w-7 h-7 bg-fm-success text-white rounded-full flex items-center justify-center text-sm font-bold">
          <Check size={14} />
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm flex-shrink-0 ${isLocked ? 'bg-fm-border text-fm-text-mute' : 'bg-fm-yellow text-fm-green-dark'}`}>
          {num}
        </div>
        <div>
          <h3 className="font-bold text-fm-green-dark">{title}</h3>
          <div className="text-fm-text-soft text-[13.5px]">{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

// ============================================================
// Field — input com label, suffix, help, e comportamento "0 limpa ao focar"
// ============================================================
function Field({ label, type = 'text', value, onChange, placeholder, suffix, help, defaultZero, className = '' }) {
  function handleFocus(e) {
    if (defaultZero && (e.target.value === '0' || e.target.value === 0)) {
      e.target.value = '';
      onChange('');
    }
    requestAnimationFrame(() => e.target.select && e.target.select());
  }
  function handleBlur(e) {
    if (defaultZero && e.target.value === '') {
      onChange(0);
    }
  }

  return (
    <div className={className}>
      <label className="label">{label}</label>
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
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fm-text-mute font-semibold text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {help && <div className="help">{help}</div>}
    </div>
  );
}
