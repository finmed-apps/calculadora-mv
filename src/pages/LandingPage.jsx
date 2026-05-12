import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Calculator, Shield, Clock } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/useAuth';

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-fm-cream">
      {/* HEADER */}
      <header className="bg-fm-green text-white">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo variant="white" className="h-6 sm:h-7 w-auto" />
          </Link>
          {user ? (
            <Link to="/app" className="text-sm bg-fm-yellow text-fm-green-dark px-4 py-2 rounded-lg font-bold hover:bg-fm-yellow-dark transition-colors">
              Abrir calculadora →
            </Link>
          ) : (
            <Link to="/login" className="text-sm text-fm-yellow hover:text-white font-semibold">
              Entrar →
            </Link>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="bg-fm-green text-white relative overflow-hidden">
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-fm-yellow/10 rounded-full" />
        <div className="absolute top-32 right-40 w-32 h-32 bg-fm-yellow/5 rounded-full" />

        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24 relative">
          <span className="inline-block bg-fm-yellow text-fm-green-dark px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-5">
            Ferramenta gratuita · FINMED
          </span>
          <h1 className="font-display font-bold leading-[1.05] mb-5 max-w-3xl" style={{ fontSize: 'clamp(34px, 6vw, 60px)' }}>
            Calcula o IRS na venda do teu imóvel em <em className="text-fm-yellow not-italic italic font-medium">1 minuto</em>.
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed mb-8">
            Simulador online da Mais-Valia em Portugal. Identifica isenções, simula o reinvestimento em HPP e gera o relatório FINMED — sem ter de mexer no Excel das Finanças.
          </p>

          <div className="flex gap-3 flex-wrap items-center">
            <Link to={user ? '/app' : '/login'} className="btn btn-primary text-base">
              {user ? 'Abrir calculadora' : 'Começar simulação'} <ArrowRight size={18} />
            </Link>
            <a href="#como-funciona" className="text-fm-yellow hover:text-white font-semibold inline-flex items-center gap-1.5 px-3 py-2">
              Como funciona →
            </a>
          </div>

          <div className="mt-12 flex items-center gap-6 text-white/60 text-sm flex-wrap">
            <span className="flex items-center gap-2"><Clock size={14} /> Demora 1 minuto</span>
            <span className="flex items-center gap-2"><Shield size={14} /> Sem instalações</span>
            <span className="flex items-center gap-2"><FileText size={14} /> Relatório PDF incluído</span>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <span className="inline-block bg-fm-yellow/30 text-fm-green-dark px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-3">
              Como funciona
            </span>
            <h2 className="font-display font-bold text-fm-green-dark text-3xl sm:text-4xl">
              Três passos. Sem complicações.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <Step
              num="1"
              title="Escolhe o cenário"
              desc="HPP, caso geral, imóvel antigo, venda ao Estado. Identificamos automaticamente isenções aplicáveis."
            />
            <Step
              num="2"
              title="Preenche os dados"
              desc="Datas, valores da escritura, despesas dedutíveis. Em formulário guiado, secção a secção."
            />
            <Step
              num="3"
              title="Recebe o resultado"
              desc="IRS estimado, breakdown completo, relatório PDF FINMED para guardar e partilhar."
            />
          </div>
        </div>
      </section>

      {/* O QUE OBTÉM */}
      <section className="py-16 sm:py-24 bg-fm-ivory">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <span className="inline-block bg-fm-yellow/30 text-fm-green-dark px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-3">
              O que vais obter
            </span>
            <h2 className="font-display font-bold text-fm-green-dark text-3xl sm:text-4xl">
              Mais do que um número.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Feature
              icon={Calculator}
              title="Cálculo completo"
              desc="IRS isolado, taxa efetiva, mais-valia bruta e tributável. Tudo discriminado por escalão."
            />
            <Feature
              icon={FileText}
              title="Relatório PDF"
              desc="Documento profissional com branding FINMED, pronto a partilhar com contabilista, advogado ou comprador."
            />
            <Feature
              icon={Clock}
              title="Histórico permanente"
              desc="Guarda as simulações com o nome que quiseres. Volta a abrir, edita, e exporta sempre que precisares."
            />
            <Feature
              icon={Shield}
              title="Cenários completos"
              desc="HPP com reinvestimento, caso geral, imóveis pré-1989, venda ao Estado. A maioria das ferramentas online só faz o caso geral."
            />
            <Feature
              icon={Calculator}
              title="Escalões IRS 2026"
              desc="Tabelas oficiais atualizadas e escalões progressivos. Não é uma estimativa por cima — é o cálculo real."
            />
            <Feature
              icon={FileText}
              title="Apoio FINMED"
              desc="Para casos complexos, agenda consultoria direta com a equipa especialista em fiscalidade imobiliária."
            />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 sm:py-20 bg-fm-green text-white">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="font-display font-bold text-3xl sm:text-4xl mb-4">
            Pronto a saber quanto vais pagar?
          </h2>
          <p className="text-white/80 mb-7 text-lg">
            Demora 1 minuto. Não precisas de instalar nada.
          </p>
          <Link to={user ? '/app' : '/login'} className="btn btn-primary text-base">
            {user ? 'Abrir calculadora' : 'Começar simulação'} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-fm-green-dark text-fm-text-mute py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-5 text-center">
          <div className="flex justify-center mb-4">
            <Logo variant="white" className="h-5 w-auto opacity-75" />
          </div>
          <p className="text-xs mb-2">
            Especialistas em Fiscalidade Imobiliária
          </p>
          <p className="text-xs">
            <a href="https://finmed.pt" className="hover:text-white" target="_blank" rel="noopener">finmed.pt</a>
            <span className="mx-2">·</span>
            <span>Calculadora informativa · Valores estimativos</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Step({ num, title, desc }) {
  return (
    <div className="bg-fm-paper rounded-2xl border border-fm-border p-7 relative">
      <div className="absolute -top-4 left-7 w-9 h-9 bg-fm-yellow text-fm-green-dark rounded-full flex items-center justify-center font-display font-bold text-lg shadow-fm">
        {num}
      </div>
      <h3 className="font-display font-bold text-fm-green-dark text-xl mb-2 mt-2">{title}</h3>
      <p className="text-fm-text-soft text-[15px] leading-relaxed">{desc}</p>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="bg-fm-paper rounded-xl border border-fm-border p-6">
      <div className="w-10 h-10 bg-fm-yellow/30 text-fm-green rounded-lg flex items-center justify-center mb-3">
        <Icon size={20} />
      </div>
      <h3 className="font-bold text-fm-green-dark mb-1.5">{title}</h3>
      <p className="text-sm text-fm-text-soft leading-relaxed">{desc}</p>
    </div>
  );
}
