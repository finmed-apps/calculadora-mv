import { CheckCircle2, AlertTriangle, ArrowLeft, MessageSquare } from 'lucide-react';

const SCENARIOS = {
  pre1989: {
    title: 'Imóvel pré-1989 ou terreno pré-1965',
    chip: 'Isenção total',
    intro: 'Os imóveis adquiridos antes de 1 de janeiro de 1989 (ou terrenos para construção antes de 1965) estão isentos de IRS sobre as mais-valias geradas na venda.',
    good: {
      title: 'Não tens IRS a pagar.',
      desc: 'Mesmo com ganho elevado, neste cenário não há IRS a pagar sobre a mais-valia.',
    },
    warnings: [
      'A venda tem de ser declarada no IRS do ano da operação, mesmo estando isenta.',
      'A isenção aplica-se à parte do imóvel adquirida antes de 1989. Se houve obras de ampliação registadas depois, essa parte pode ser tributável.',
      'Em heranças, conta a data em que o imóvel entrou no património do falecido — não a data da partilha.',
    ],
  },
  estado: {
    title: 'Venda ao Estado ou entidades públicas',
    chip: 'Isenção aplicável',
    intro: 'A venda direta ao Estado, autarquias ou entidades públicas de habitação (IHRU, por exemplo) está isenta de IRS e IRC sobre a mais-valia.',
    good: {
      title: 'Mais-valia isenta de IRS.',
      desc: 'A operação não é tributada em IRS, dentro das condições previstas na lei.',
    },
    warnings: [
      'A isenção não se aplica a vendedores residentes em paraísos fiscais.',
      'Se a venda for feita por exercício do direito de preferência da entidade pública, pode haver tributação parcial.',
      'O imóvel tem de ser declarado na declaração de IRS do ano da venda, mesmo estando isento.',
    ],
  },
};

export function InfoScreen({ scenario, onBack }) {
  const info = SCENARIOS[scenario];
  if (!info) return null;

  return (
    <section className="bg-fm-paper rounded-2xl border border-fm-border shadow-fm p-8 sm:p-10">
      <span className="inline-block bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-3">
        {info.chip}
      </span>
      <h2 className="text-2xl sm:text-3xl font-bold text-fm-green-dark mb-3">{info.title}</h2>
      <p className="text-fm-text-soft mb-6 max-w-3xl leading-relaxed">{info.intro}</p>

      {/* Caixa verde — boa notícia */}
      <div className="bg-fm-success/10 border-l-4 border-fm-success rounded-lg p-5 mb-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-fm-success flex-shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-bold text-[#2a4f1d] mb-1">{info.good.title}</h3>
            <p className="text-sm text-[#2a4f1d]/90">{info.good.desc}</p>
          </div>
        </div>
      </div>

      {/* Caixa laranja — atenção a estes pontos */}
      <div className="bg-[#fdf3e1] border-l-4 border-fm-warn rounded-lg p-5 mb-7">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-fm-warn flex-shrink-0 mt-0.5" size={22} />
          <div className="flex-1">
            <h3 className="font-bold text-[#6b3f0d] mb-2">Antes de seguir, valida o seguinte:</h3>
            <ul className="space-y-1.5 text-sm text-[#6b3f0d]">
              {info.warnings.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-fm-warn">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-fm-ivory rounded-xl p-6 mb-5">
        <h3 className="font-bold text-fm-green-dark mb-1.5">Confirmar com a equipa FINMED</h3>
        <p className="text-sm text-fm-text-soft mb-4">
          As regras de isenção têm nuances que dependem do caso concreto (data exata de aquisição, herança vs compra, obras posteriores). Antes de declarar a operação no IRS, vale a pena uma confirmação técnica.
        </p>
        <a href="https://api.leadconnectorhq.com/widget/survey/db5HCMe4YhWeJdYk969X" target="_blank" rel="noopener" className="btn btn-dark">
          <MessageSquare size={16} /> Agendar consultoria FINMED →
        </a>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Voltar à triagem
        </button>
      </div>
    </section>
  );
}
