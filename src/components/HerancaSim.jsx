import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { SimSection, Field, ResultShell, HeroIRS, MetricGrid, MetricCard, Alerts, Disclaimers, ResultToolbar, SaveBox, euro, formatPct } from './SimUI';

const DISCLAIMERS = [
  'Em caso de herança, o valor de aquisição é o VPT que consta da caderneta predial na data do óbito.',
  'As mais-valias de imóveis são tributadas em IRS em 50% do valor apurado.',
  'As despesas e o valor de venda são repartidos proporcionalmente pela % adquirida em cada óbito.',
  'O IRS apresentado é uma estimativa apenas sobre a mais-valia. O total pode ser superior consoante os restantes rendimentos.',
];

export function HerancaForm({ prefill, onCancel, onCalculate }) {
  const [d, setD] = useState(() => ({
    data1: prefill?.data1 || '', data2: prefill?.data2 || '',
    vpt1: prefill?.vpt1 ?? '', vpt2: prefill?.vpt2 ?? '',
    pct1: prefill?.pct1 != null ? Math.round(prefill.pct1 * 100) : 50,
    valorVenda: prefill?.valorVenda ?? '', melhoria: prefill?.melhoria ?? 0,
  }));
  const [comissaoEdited, setComissaoEdited] = useState(prefill?.comissao != null);
  const [comissaoVal, setComissaoVal] = useState(prefill?.comissao ?? '');
  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));

  const pct1 = Math.min(100, Math.max(0, Number(d.pct1) || 0));
  const pct2 = 100 - pct1;
  const suggested = d.valorVenda ? Math.round(Number(d.valorVenda) * 0.05 * 1.23) : '';
  const comissao = comissaoEdited ? comissaoVal : suggested;

  function submit() {
    const miss = [];
    if (!d.data1) miss.push('Data do 1.º óbito');
    if (!d.data2) miss.push('Data do 2.º óbito');
    if (d.data1 && d.data2 && new Date(d.data1) >= new Date(d.data2)) miss.push('A data do 1.º óbito deve ser anterior à do 2.º óbito');
    if (!(Number(d.vpt1) > 0)) miss.push('VPT na data do 1.º óbito');
    if (!(Number(d.vpt2) > 0)) miss.push('VPT na data do 2.º óbito');
    if (!(Number(d.valorVenda) > 0)) miss.push('Valor de venda');
    if (miss.length) { alert('Verifique:\n\n• ' + miss.join('\n• ')); return; }
    onCalculate({
      data1: d.data1, data2: d.data2,
      vpt1: Number(d.vpt1) || 0, pct1: pct1 / 100, vpt2: Number(d.vpt2) || 0, pct2: pct2 / 100,
      valorVenda: Number(d.valorVenda) || 0, comissao: Number(comissao) || 0, melhoria: Number(d.melhoria) || 0,
    });
  }

  return (
    <SimSection step="Heranças · Dados" title="Venda de imóvel adquirido por herança"
      subtitle="Cobre os dois momentos de aquisição (1.º e 2.º óbito). A % de cada óbito soma sempre 100%.">
      <div className="grid sm:grid-cols-2 gap-4 fm-stagger">
        <Field label="Data do 1.º óbito" type="date" value={d.data1} onChange={(v) => set('data1', v)} />
        <Field label="Data do 2.º óbito" type="date" value={d.data2} onChange={(v) => set('data2', v)} />
        <Field label="VPT na data do 1.º óbito" type="number" suffix="€" placeholder="40 000" value={d.vpt1} onChange={(v) => set('vpt1', v)} />
        <Field label="VPT na data do 2.º óbito" type="number" suffix="€" placeholder="55 000" value={d.vpt2} onChange={(v) => set('vpt2', v)} />
        <div>
          <Field label="% adquirida no 1.º óbito" type="number" suffix="%" value={d.pct1} onChange={(v) => set('pct1', v)} />
          <div className="help">No 2.º óbito: <strong>{pct2}%</strong> (calculado automaticamente).</div>
        </div>
        <Field label="Valor de venda" type="number" suffix="€" placeholder="200 000" value={d.valorVenda} onChange={(v) => set('valorVenda', v)} />
        <Field label="Comissão imobiliária" type="number" suffix="€" value={comissao} onChange={(v) => { setComissaoEdited(true); setComissaoVal(v); }} help="Sugestão: 5% do valor de venda + IVA. Editável." />
        <Field label="Despesas de melhoria" type="number" suffix="€" defaultZero value={d.melhoria} onChange={(v) => set('melhoria', v)} />
      </div>
      <div className="flex gap-2 mt-6 flex-wrap">
        <button className="btn btn-ghost" onClick={onCancel}>← Voltar à triagem</button>
        <button className="btn btn-primary" onClick={submit}>Calcular <ArrowRight size={16} /></button>
      </div>
    </SimSection>
  );
}

export function HerancaResult({ result, onEdit, onReset, onSave, onExportPdf, saving, savedId }) {
  const r = result;
  return (
    <ResultShell title="A sua simulação está pronta">
      <HeroIRS
        label="IRS estimado sobre a mais-valia"
        value={r.irs}
        subtitle={r.totalMV <= 0
          ? 'Não existem mais-valias a declarar nesta venda.'
          : 'Estimativa de IRS sobre a mais-valia total apurada nos dois momentos de aquisição.'}
        metas={[
          { label: 'Total mais-valias', value: euro(Math.max(r.totalMV, 0)) },
          { label: 'A englobar (50%)', value: euro(r.mvEnglobada) },
          { label: 'Taxa efetiva', value: r.mvEnglobada > 0 ? formatPct(r.taxaEfetiva) : '—' },
        ]}
      />
      <MetricGrid>
        <MetricCard label="Aquisição — 1.º óbito" value={r.aq1} note={`VPT × % · coef. ${String(r.coef1).replace('.', ',')}`} />
        <MetricCard label="Mais-valia — 1.º momento" value={r.mv1} positive={r.mv1 >= 0} negative={r.mv1 < 0} />
        <MetricCard label="Aquisição — 2.º óbito" value={r.aq2} note={`VPT × % · coef. ${String(r.coef2).replace('.', ',')}`} />
        <MetricCard label="Mais-valia — 2.º momento" value={r.mv2} positive={r.mv2 >= 0} negative={r.mv2 < 0} />
        <MetricCard label="Total despesas" value={r.totalDespesas} note="Comissão + melhorias" />
        <MetricCard label="Total mais-valias" value={r.totalMV} positive={r.totalMV >= 0} negative={r.totalMV < 0} />
        <MetricCard label="Valor a englobar (50%)" value={r.mvEnglobada} note="Total mais-valias × 50%" />
      </MetricGrid>
      <Alerts alerts={r.alerts} />
      <SaveBox savedId={savedId} saving={saving} onSave={onSave} />
      <Disclaimers items={DISCLAIMERS} />
      <ResultToolbar onEdit={onEdit} onReset={onReset} onExportPdf={onExportPdf} />
    </ResultShell>
  );
}
