import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Este IRS é o valor final que vou pagar?',
    a: [
      'Não. O valor calculado é o IRS isolado apenas sobre esta mais-valia. O IRS real do teu agregado depende do englobamento com os restantes rendimentos do ano (Categoria A, B, F, etc.). Pode ser superior ou inferior consoante o escalão marginal aplicável.',
      'Por isso o cálculo serve sempre como referência — para decidir se vendes, se reinvestes ou se enquadras de outra forma. Não como cálculo definitivo de declaração.',
    ],
  },
  {
    q: 'Posso reduzir mais este valor?',
    a: [
      'Sim — há várias alavancas. As mais comuns: despesas de valorização (obras dos últimos 12 anos com fatura), reinvestimento em HPP (24 meses antes a 36 meses depois), enquadramento em Categoria B (em vez de G) para investidores com volume.',
      'A decisão certa depende do teu perfil. Para um único imóvel vendido ocasionalmente, Categoria G com aproveitamento de despesas é o caminho. Para quem opera vários imóveis por ano, a análise muda.',
    ],
  },
  {
    q: 'E se tiver herdado o imóvel?',
    a: [
      'Em imóveis recebidos por herança ou doação, o valor de aquisição corresponde ao valor considerado para Imposto do Selo à data da transmissão — não a um valor de mercado. Imóveis recebidos antes de 1989 estão totalmente isentos de IRS sobre a mais-valia.',
      'Esta área tem nuances: usufrutos, partilhas entre herdeiros, datas anteriores a 1989. Quase sempre vale a pena uma análise específica antes da venda.',
    ],
  },
  {
    q: 'Quais os prazos para reinvestir em HPP?',
    a: [
      'Podes reinvestir até 24 meses antes ou até 36 meses depois da data da venda — em aquisição, construção ou ampliação de nova HPP. Para contribuintes com 65+ anos ou reformados, há ainda a hipótese de reinvestir em produtos financeiros específicos (até 6 meses após a venda).',
      'A intenção de reinvestir tem de ser declarada no IRS do ano da venda e comprovada nos anos seguintes. Não basta concretizar — tem de se sinalizar a tempo.',
    ],
  },
  {
    q: 'Vale a pena pedir consultoria antes de vender?',
    a: [
      'Em qualquer operação acima de 100 000 € — sim. Uma sessão de consultoria custa muito menos do que o IRS desnecessariamente pago por má estruturação. Em casos típicos, a poupança identificada cobre 10× a 50× o investimento na consultoria.',
      'A FINMED faz análise prévia, identifica todas as isenções e benefícios aplicáveis ao teu caso, e prepara a melhor forma de declarar a operação. É feito antes da escritura — não depois.',
    ],
  },
];

export function Faq() {
  const [open, setOpen] = useState(null);

  return (
    <section className="bg-fm-paper rounded-2xl border border-fm-border shadow-fm p-8 sm:p-10 mt-5">
      <span className="inline-block bg-fm-green text-fm-yellow px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-3">
        Aprofundar o tema
      </span>
      <h2 className="text-2xl sm:text-3xl font-bold text-fm-green-dark mb-2">
        As 5 perguntas-chave depois deste resultado
      </h2>
      <p className="text-fm-text-soft mb-6 max-w-2xl">
        Cada pergunta tem uma resposta detalhada para que percebas exatamente o que fazer com este número.
      </p>

      <div className="space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className={`border-2 rounded-xl overflow-hidden transition-colors ${isOpen ? 'border-fm-yellow' : 'border-fm-border'}`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-fm-ivory transition-colors"
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm flex-shrink-0 ${isOpen ? 'bg-fm-yellow text-fm-green-dark' : 'bg-fm-border text-fm-text-soft'}`}>
                  {i + 1}
                </span>
                <span className="flex-1 font-bold text-fm-green-dark">{item.q}</span>
                <ChevronDown
                  size={20}
                  className={`text-fm-text-mute flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pl-[68px] space-y-2.5">
                  {item.a.map((p, j) => (
                    <p key={j} className="text-[14.5px] text-fm-text-soft leading-relaxed">{p}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
