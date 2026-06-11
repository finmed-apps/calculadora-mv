import { Building2, Landmark, Home, BarChart3, Scroll, Gift, KeyRound } from 'lucide-react';

const SCENARIOS = [
  {
    id: 'pre1989',
    icon: Building2,
    title: 'Imóvel pré-1989 ou terreno pré-1965',
    desc: 'Imóveis adquiridos antes de 1989 (ou terrenos de construção antes de 1965) estão isentos de IRS sobre mais-valias.',
  },
  {
    id: 'estado',
    icon: Landmark,
    title: 'Venda ao Estado ou entidades públicas',
    desc: 'Vendas a autarquias ou entidades públicas de habitação são isentas de IRS e IRC, com exceções.',
  },
  {
    id: 'hpp',
    icon: Home,
    title: 'HPP com reinvestimento',
    desc: 'Venda de Habitação Própria Permanente com intenção de reinvestir noutra HPP — isenção total ou parcial.',
  },
  {
    id: 'geral',
    icon: BarChart3,
    title: 'Caso geral (tributável)',
    desc: 'Segunda habitação, arrendamento, terrenos. 50% da mais-valia entra em IRS pelas taxas do escalão.',
  },
  {
    id: 'heranca',
    icon: Scroll,
    title: 'Imóvel recebido por herança',
    desc: 'Venda de imóvel herdado, com os dois momentos de aquisição (1.º e 2.º óbito). Apura a mais-valia por momento e o IRS estimado.',
  },
  {
    id: 'doacao',
    icon: Gift,
    title: 'Imóvel recebido por doação',
    desc: 'Venda de imóvel recebido por doação direta ou indireta. Determina o VPT de aquisição e o IRS sobre a mais-valia.',
  },
  {
    id: 'hs_novo',
    icon: KeyRound,
    title: 'Habitação secundária com reinvestimento',
    desc: 'Regime "Novo Pacote" (2026-2029): exclusão de mais-valias se reinvestires o produto da venda em arrendamento acessível.',
  },
];

export function ScenarioPicker({ onPick }) {
  return (
    <section className="bg-fm-paper rounded-2xl border border-fm-border shadow-fm p-8 sm:p-10">
      <span className="inline-block bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-3">
        Passo 1 · Cenário
      </span>
      <h2 className="text-2xl sm:text-3xl font-bold text-fm-green-dark mb-2">
        A sua situação enquadra-se em alguma isenção?
      </h2>
      <p className="text-fm-text-soft mb-6 max-w-2xl">
        Antes de calcular, vamos perceber se a venda pode estar isenta de IRS. Escolha o cenário que melhor descreve o caso.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 fm-stagger">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => onPick(s.id)}
              className="group text-left bg-fm-ivory border-2 border-fm-border rounded-xl p-5 hover:border-fm-yellow hover:-translate-y-1 hover:shadow-fm transition-all duration-200 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-fm-yellow opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-10 h-10 bg-fm-yellow rounded-lg flex items-center justify-center mb-3 text-fm-green-dark transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3">
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-fm-green-dark mb-1">{s.title}</h3>
              <p className="text-sm text-fm-text-soft leading-snug">{s.desc}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
