import { useState } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { SimSection, Field, ResultShell, HeroIRS, MetricGrid, MetricCard, Alerts, Disclaimers, ResultToolbar, SaveBox, euro, formatEuro, formatPct } from './SimUI';

const CONDICOES = [
  'O imóvel foi (ou será) vendido entre 01/01/2026 e 31/12/2029.',
  'O produto da venda é reinvestido numa nova habitação para o mercado de arrendamento acessível.',
  'O contrato de arrendamento é celebrado no prazo máximo de 6 meses após a compra.',
  'Mínimo de 36 meses de contrato (seguidos ou interpolados) durante 5 anos.',
  'O imóvel não é vendido nos primeiros 5 anos.',
];

const DISCLAIMERS = [
  'Regra geral, as mais-valias de habitações secundárias são sempre tributadas.',
  'A exclusão só se aplica a vendas entre 01/01/2026 e 31/12/2029 e se todas as condições do regime forem cumpridas.',
  'Para beneficiar da exclusão, o financiamento bancário da nova habitação não pode exceder 70% do seu valor de compra.',
  'As mais-valias de imóveis são tributadas em IRS em 50% do valor apurado.',
  'O IRS apresentado é uma estimativa apenas sobre a mais-valia. O total pode ser superior consoante os restantes rendimentos.',
];

export function HSForm({ prefill, onCancel, onCalculate }) {
  const dp = prefill?.despesas || {};
  const [d, setD] = useState(() => ({
    dataCompra: prefill?.dataCompra || '', dataVenda: prefill?.dataVenda || '',
    vptCompra: prefill?.vptCompra ?? '', valorCompra: prefill?.valorCompra ?? '', valorVenda: prefill?.valorVenda ?? '',
    dividaBanco: prefill?.dividaBanco ?? 0,
    escritura: dp.escritura ?? 0, selo: dp.selo ?? 0, cert: dp.cert ?? 0, imt: dp.imt ?? 0, melhoria: dp.melhoria ?? 0,
    valorNovaCasa: prefill?.valorNovaCasa ?? '',
  }));
  const [comissaoEdited, setComissaoEdited] = useState(dp.comissao != null);
  const [comissaoVal, setComissaoVal] = useState(dp.comissao ?? '');
  const [confirma, setConfirma] = useState(false);
  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));

  const suggested = d.valorVenda ? Math.round(Number(d.valorVenda) * 0.05 * 1.23) : '';
  const comissao = comissaoEdited ? comissaoVal : suggested;

  function submit() {
    const miss = [];
    if (!(Number(d.valorCompra) > 0)) miss.push('Valor de compra');
    if (!(Number(d.valorVenda) > 0)) miss.push('Valor de venda');
    if (d.dataCompra && d.dataVenda && new Date(d.dataCompra) >= new Date(d.dataVenda)) miss.push('A data de compra deve ser anterior à data de venda');
    if (Number(d.dividaBanco) > Number(d.valorVenda)) miss.push('O valor em dívida não pode ser superior ao valor de venda');
    if (!confirma) miss.push('Confirma que pretende cumprir os requisitos do regime');
    if (miss.length) { alert('Verifique:\n\n• ' + miss.join('\n• ')); return; }
    onCalculate({
      dataCompra: d.dataCompra, dataVenda: d.dataVenda, vptCompra: Number(d.vptCompra) || 0,
      valorCompra: Number(d.valorCompra) || 0, valorVenda: Number(d.valorVenda) || 0, dividaBanco: Number(d.dividaBanco) || 0,
      despesas: {
        escritura: Number(d.escritura) || 0, selo: Number(d.selo) || 0, cert: Number(d.cert) || 0,
        imt: Number(d.imt) || 0, comissao: Number(comissao) || 0, melhoria: Number(d.melhoria) || 0,
      },
      valorNovaCasa: Number(d.valorNovaCasa) || 0,
    });
  }

  return (
    <SimSection step="Habitação secundária · Novo Pacote" title="Venda de HS com reinvestimento em arrendamento"
      subtitle="Regime especial que pode excluir as mais-valias de tributação se o produto da venda for reinvestido em arrendamento acessível.">

      {/* Checklist do regime */}
      <div className="bg-fm-ivory border border-fm-border rounded-xl p-5 mb-6">
        <div className="text-xs uppercase tracking-wide font-bold text-fm-text-mute mb-3">Condições do regime de exclusão</div>
        <ul className="space-y-2 mb-4">
          {CONDICOES.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-fm-text-soft">
              <Check size={16} className="text-fm-success mt-0.5 flex-shrink-0" /> <span>{c}</span>
            </li>
          ))}
        </ul>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={confirma} onChange={(e) => setConfirma(e.target.checked)} className="mt-0.5 accent-fm-green w-4 h-4" />
          <span className="text-sm text-fm-green-dark">
            Confirmo que cumpro (ou pretendo cumprir) todos os requisitos. <span className="text-fm-text-mute">Se não cumprir todas as condições, as mais-valias serão tributadas na totalidade.</span>
          </span>
        </label>
      </div>

      <h3 className="font-bold text-fm-green-dark mb-3">Imóvel vendido</h3>
      <div className="grid sm:grid-cols-2 gap-4 mb-6 fm-stagger">
        <Field label="Data de compra" type="date" value={d.dataCompra} onChange={(v) => set('dataCompra', v)} help="Usada para o coeficiente de desvalorização." />
        <Field label="Data de venda" type="date" value={d.dataVenda} onChange={(v) => set('dataVenda', v)} help="Deve estar entre 01/01/2026 e 31/12/2029." />
        <Field label="Valor de compra" type="number" suffix="€" placeholder="200 000" value={d.valorCompra} onChange={(v) => set('valorCompra', v)} />
        <Field label="Valor de venda" type="number" suffix="€" placeholder="500 000" value={d.valorVenda} onChange={(v) => set('valorVenda', v)} />
        <Field label="Valor em dívida ao banco" type="number" suffix="€" defaultZero value={d.dividaBanco} onChange={(v) => set('dividaBanco', v)} help="Montante do crédito hipotecário ainda por pagar." />
        <Field label="VPT na compra (opcional)" type="number" suffix="€" defaultZero value={d.vptCompra} onChange={(v) => set('vptCompra', v)} help="Informativo; não entra no cálculo." />
      </div>

      <h3 className="font-bold text-fm-green-dark mb-3">Despesas da venda <span className="font-normal text-fm-text-mute text-sm">(opcionais)</span></h3>
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Field label="Escritura" type="number" suffix="€" defaultZero value={d.escritura} onChange={(v) => set('escritura', v)} />
        <Field label="Imposto de Selo" type="number" suffix="€" defaultZero value={d.selo} onChange={(v) => set('selo', v)} />
        <Field label="Certificado energético" type="number" suffix="€" defaultZero value={d.cert} onChange={(v) => set('cert', v)} />
        <Field label="IMT" type="number" suffix="€" defaultZero value={d.imt} onChange={(v) => set('imt', v)} />
        <Field label="Comissão imobiliária" type="number" suffix="€" value={comissao} onChange={(v) => { setComissaoEdited(true); setComissaoVal(v); }} help="Sugestão: 5% + IVA. Editável." />
        <Field label="Despesas de melhoria" type="number" suffix="€" defaultZero value={d.melhoria} onChange={(v) => set('melhoria', v)} />
      </div>

      <h3 className="font-bold text-fm-green-dark mb-3">Reinvestimento</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Valor de compra da nova casa (opcional)" type="number" suffix="€" placeholder="700 000" value={d.valorNovaCasa} onChange={(v) => set('valorNovaCasa', v)} help="Deixa em branco para ver apenas o valor mínimo a reinvestir." />
      </div>

      <div className="flex gap-2 mt-6 flex-wrap">
        <button className="btn btn-ghost" onClick={onCancel}>← Voltar à triagem</button>
        <button className="btn btn-primary" onClick={submit}>Calcular <ArrowRight size={16} /></button>
      </div>
    </SimSection>
  );
}

export function HSResult({ result, onEdit, onReset, onSave, onExportPdf, saving, savedId }) {
  const r = result;
  const parcial = r.estado === 'parcial';

  const heroValue = parcial ? r.ganho : r.irs;
  const heroLabel = parcial ? 'Valor a reinvestir para não pagar IRS' : 'IRS estimado sobre a mais-valia';
  const heroSub = (() => {
    if (parcial) return `Reinveste pelo menos este valor (sem financiamento acima de ${formatPct(0.70)} na nova casa) para excluir totalmente as mais-valias. Preenche o valor da nova casa para simular um reinvestimento parcial.`;
    if (r.estado === 'excluido') return 'Com este reinvestimento, as suas mais-valias ficam totalmente excluídas de tributação.';
    if (r.estado === 'menosvalia' || r.maisValiaBruta < 0) return 'Não existem mais-valias a declarar nesta venda.';
    if (r.estado === 'foraJanela') return 'Venda fora da janela do regime — a mais-valia é tributada na totalidade.';
    return 'Estimativa de IRS sobre a parte da mais-valia não excluída pelo reinvestimento.';
  })();

  return (
    <ResultShell title="A sua simulação está pronta">
      <HeroIRS
        label={heroLabel}
        value={heroValue}
        subtitle={heroSub}
        metas={[
          { label: 'Mais-valia bruta', value: euro(Math.max(r.maisValiaBruta, 0)) },
          { label: 'Tributável (50%)', value: euro(r.mvTributavelBase) },
          { label: 'Ganho da venda', value: euro(r.ganho) },
        ]}
      />

      {/* As 4 questões */}
      <div className="grid sm:grid-cols-2 gap-3 mb-5 fm-stagger">
        <QA n="1" q="Valor mínimo a reinvestir para excluir todo o IRS" a={euro(r.ganho)} />
        <QA n="2" q="Mais-valia tributável (com este reinvestimento)" a={r.mvTributavelFinal == null ? 'Preenche a nova casa' : euro(r.mvTributavelFinal)} />
        <QA n="3" q="Valor a englobar nos rendimentos (IRS)" a={r.mvTributavelFinal == null ? '—' : euro(r.mvTributavelFinal)} />
        <QA n="4" q="Estimativa de IRS sobre a mais-valia" a={euro(r.irs)} highlight />
      </div>

      <MetricGrid>
        <MetricCard label="Coeficiente aplicado" value={String(r.coef).replace('.', ',')} note={`ano da compra · ${r.coefInfo?.portaria || ''}`} />
        <MetricCard label="Total despesas" value={r.totalDespesas} />
        <MetricCard label="Mais-valia apurada" value={r.maisValiaBruta} positive={r.maisValiaBruta >= 0} negative={r.maisValiaBruta < 0} note="Venda − (Compra × coef.) − despesas" />
        <MetricCard label="Mais-valia tributável (50%)" value={r.mvTributavelBase} />
        {r.temNovaCasa && <MetricCard label="Financiamento máximo (70%)" value={r.finMax} note="Valor da nova casa × 70%" />}
        {r.temNovaCasa && <MetricCard label="Valor não reinvestido" value={Math.max(r.valorNaoReinvestido, 0)} note={`${formatPct(r.proporcaoNaoReinv)} do ganho`} />}
        {r.mvTributavelFinal != null && <MetricCard label="Mais-valia tributável final" value={r.mvTributavelFinal} note="Proporção não reinvestida × tributável 50%" />}
      </MetricGrid>

      <Alerts alerts={r.alerts} />
      <SaveBox savedId={savedId} saving={saving} onSave={onSave} />
      <Disclaimers items={DISCLAIMERS} />
      <ResultToolbar onEdit={onEdit} onReset={onReset} onExportPdf={onExportPdf} />
    </ResultShell>
  );
}

function QA({ n, q, a, highlight }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'bg-fm-green text-white border-fm-green' : 'bg-fm-ivory border-fm-border'}`}>
      <div className="flex items-start gap-2.5">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${highlight ? 'bg-fm-yellow text-fm-green-dark' : 'bg-fm-yellow text-fm-green-dark'}`}>{n}</span>
        <div>
          <div className={`text-xs ${highlight ? 'text-white/80' : 'text-fm-text-soft'} leading-snug mb-1`}>{q}</div>
          <div className={`font-display font-bold text-lg tabular-nums ${highlight ? 'text-fm-yellow' : 'text-fm-green-dark'}`}>{a}</div>
        </div>
      </div>
    </div>
  );
}
