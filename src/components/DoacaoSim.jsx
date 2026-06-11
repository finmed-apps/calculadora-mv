import { useState } from 'react';
import { ArrowRight, Gift } from 'lucide-react';
import { calcularDoacao } from '../lib/calc';
import { SimSection, Field, ResultShell, HeroIRS, MetricGrid, MetricCard, Alerts, Disclaimers, ResultToolbar, SaveBox, euro, formatPct } from './SimUI';

const DISCLAIMERS = [
  'As mais-valias de imóveis são tributadas em IRS em 50% do valor apurado.',
  'Em doação direta (pais→filhos, avós→netos), o valor de aquisição é o VPT da caderneta predial 2 anos antes da data da doação.',
  'Em doação indireta, o valor de aquisição é o VPT da caderneta predial na data da doação.',
  'O IRS apresentado é uma estimativa apenas sobre a mais-valia. O total pode ser superior consoante os restantes rendimentos.',
];

export function DoacaoForm({ prefill, onCancel, onCalculate }) {
  const [d, setD] = useState(() => ({
    tipo: prefill?.tipoDoacao || 'direta',
    dataDoacao: prefill?.dataDoacao || '',
    vptDireta: prefill?.vptDireta ?? '',
    vptIndireta: prefill?.vptIndireta ?? '',
    valorVenda: prefill?.valorVenda ?? '',
    comissao: prefill?.comissao ?? '',
    melhoria: prefill?.melhoria ?? 0,
  }));
  const [comissaoEdited, setComissaoEdited] = useState(prefill?.comissao != null);
  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));

  const suggested = d.valorVenda ? Math.round(Number(d.valorVenda) * 0.05 * 1.23) : '';
  const comissao = comissaoEdited ? d.comissao : suggested;

  function submit() {
    const miss = [];
    if (!d.dataDoacao) miss.push('Data da doação');
    if (d.dataDoacao && new Date(d.dataDoacao) > new Date()) miss.push('A data da doação não pode ser futura');
    if (d.tipo === 'direta' && !(Number(d.vptDireta) > 0)) miss.push('VPT 2 anos antes da doação');
    if (d.tipo === 'indireta' && !(Number(d.vptIndireta) > 0)) miss.push('VPT na data da doação');
    if (!(Number(d.valorVenda) > 0)) miss.push('Valor de venda');
    if (miss.length) { alert('Verifique:\n\n• ' + miss.join('\n• ')); return; }
    onCalculate({
      tipoDoacao: d.tipo, dataDoacao: d.dataDoacao,
      vptDireta: Number(d.vptDireta) || 0, vptIndireta: Number(d.vptIndireta) || 0,
      valorVenda: Number(d.valorVenda) || 0, comissao: Number(comissao) || 0, melhoria: Number(d.melhoria) || 0,
    });
  }

  return (
    <SimSection step="Doações · Dados" title="Venda de imóvel recebido por doação"
      subtitle="Escolhe primeiro o tipo de doação — determina qual o VPT a usar como valor de aquisição.">
      <label className="label">Tipo de doação</label>
      <div className="grid sm:grid-cols-2 gap-2 mb-1">
        {[['direta', 'Doação direta', 'Pais → filhos, ou avós → netos'], ['indireta', 'Doação indireta', 'Qualquer outra relação']].map(([id, t, sub]) => (
          <button key={id} onClick={() => set('tipo', id)}
            className={`text-left rounded-xl border-2 p-4 transition-all ${d.tipo === id ? 'border-fm-yellow bg-fm-yellow/10' : 'border-fm-border hover:border-fm-green-soft'}`}>
            <div className="font-bold text-fm-green-dark text-sm">{t}</div>
            <div className="text-xs text-fm-text-soft">{sub}</div>
          </button>
        ))}
      </div>
      <p className="help mb-6">Doação direta: entre pais e filhos, ou avós e netos. Doação indireta: qualquer outra relação.</p>

      <div className="grid sm:grid-cols-2 gap-4 fm-stagger">
        <Field label="Data da doação" type="date" value={d.dataDoacao} onChange={(v) => set('dataDoacao', v)} />
        {d.tipo === 'direta'
          ? <Field label="VPT 2 anos antes da doação" type="number" suffix="€" placeholder="40 000" value={d.vptDireta} onChange={(v) => set('vptDireta', v)} help="VPT da caderneta predial 2 anos antes da data da doação." />
          : <Field label="VPT na data da doação" type="number" suffix="€" placeholder="45 000" value={d.vptIndireta} onChange={(v) => set('vptIndireta', v)} help="VPT da caderneta predial à data da doação." />}
        <Field label="Valor de venda" type="number" suffix="€" placeholder="200 000" value={d.valorVenda} onChange={(v) => set('valorVenda', v)} />
        <Field label="Comissão imobiliária" type="number" suffix="€" value={comissao} onChange={(v) => { setComissaoEdited(true); set('comissao', v); }} help="Sugestão: 5% do valor de venda + IVA. Editável." />
        <Field label="Despesas de melhoria" type="number" suffix="€" defaultZero value={d.melhoria} onChange={(v) => set('melhoria', v)} help="Obras/melhorias documentadas dos últimos 12 anos." />
      </div>

      <div className="flex gap-2 mt-6 flex-wrap">
        <button className="btn btn-ghost" onClick={onCancel}>← Voltar à triagem</button>
        <button className="btn btn-primary" onClick={submit}>Calcular <ArrowRight size={16} /></button>
      </div>
    </SimSection>
  );
}

export function DoacaoResult({ result, onEdit, onReset, onSave, onExportPdf, saving, savedId }) {
  const r = result;
  const isDireta = r.tipoDoacao === 'direta';
  return (
    <ResultShell title="A sua simulação está pronta">
      <HeroIRS
        label="IRS estimado sobre a mais-valia"
        value={r.irs}
        subtitle={r.maisValiaBruta < 0
          ? 'Não existem mais-valias a declarar nesta venda.'
          : `Estimativa de IRS sobre a mais-valia da venda do imóvel recebido por doação ${isDireta ? 'direta' : 'indireta'}.`}
        metas={[
          { label: 'Mais-valia bruta', value: euro(Math.max(r.maisValiaBruta, 0)) },
          { label: 'A englobar (50%)', value: euro(r.mvEnglobada) },
          { label: 'Taxa efetiva', value: r.mvEnglobada > 0 ? formatPct(r.taxaEfetiva) : '—' },
        ]}
      />
      <MetricGrid>
        <MetricCard label="Tipo de doação" value={isDireta ? 'Direta' : 'Indireta'} />
        <MetricCard label="Valor de aquisição (VPT)" value={r.valorAquisicao} note={isDireta ? 'VPT 2 anos antes' : 'VPT na data da doação'} />
        <MetricCard label="Coeficiente aplicado" value={String(r.coef).replace('.', ',')} note={`ano da doação · ${r.coefInfo?.portaria || ''}`} />
        <MetricCard label="Total despesas" value={r.totalDespesas} note="Comissão + melhorias" />
        <MetricCard label="Mais-valia apurada" value={r.maisValiaBruta} positive={r.maisValiaBruta >= 0} negative={r.maisValiaBruta < 0} note="Venda − (Aquisição × coef.) − despesas" />
        <MetricCard label="Valor a englobar (50%)" value={r.mvEnglobada} note="Mais-valia × 50%" />
      </MetricGrid>
      <Alerts alerts={r.alerts} />
      <SaveBox savedId={savedId} saving={saving} onSave={onSave} />
      <Disclaimers items={DISCLAIMERS} />
      <ResultToolbar onEdit={onEdit} onReset={onReset} onExportPdf={onExportPdf} />
    </ResultShell>
  );
}
