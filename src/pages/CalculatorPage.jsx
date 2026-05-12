import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { FileText, ChevronRight, Clock } from 'lucide-react';
import { ScenarioPicker } from '../components/ScenarioPicker';
import { CalcForm } from '../components/CalcForm';
import { Result } from '../components/Result';
import { calcular, formatEuro, formatDate } from '../lib/calc';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useSimulations, useSimulation } from '../hooks/useSimulations';
import { useAccess } from '../hooks/useAccess';

export function CalculatorPage() {
  const { user } = useAuth();
  const access = useAccess(user?.id);
  const { items: recent, save } = useSimulations(user?.id, { limit: 3 });
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Se vier com ?load=<id>, carrega essa simulação
  const loadId = searchParams.get('load');
  const { sim: loadedSim } = useSimulation(loadId);

  const [scenario, setScenario] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);

  // Ao receber simulação carregada → mostrar resultado dela
  useEffect(() => {
    if (loadedSim) {
      setScenario(loadedSim.inputs?.scenario || null);
      // Reconstruir resultado a partir dos outputs guardados
      const reconstructed = reconstructResult(loadedSim);
      setResult(reconstructed);
      setSavedId(loadedSim.id);
      // Limpa o param para não voltar a recarregar em re-renders
      setSearchParams({}, { replace: true });
    }
  }, [loadedSim, setSearchParams]);

  function handlePick(s) {
    setScenario(s);
    setPrefill(null);
    setResult(null);
    setSavedId(null);
  }

  function handleCalculate(inputs) {
    try {
      const out = calcular(inputs);
      setResult(out);
      setSavedId(null);  // novo cálculo, mesmo se vier de prefill
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    } catch (err) {
      console.error('Calculation error:', err);
      alert('Erro no cálculo:\n\n' + err.message);
    }
  }

  async function handleSave(label) {
    if (!user) {
      nav('/login', { state: { from: '/app' } });
      return;
    }
    setSaving(true);
    try {
      const row = await save({
        label,
        scenario: result.inputs.scenario,
        inputs: result.inputs,
        outputs: extractOutputs(result),
      });
      setSavedId(row.id);
    } catch (err) {
      alert('Erro ao guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    if (!savedId) {
      alert('Guarde a simulação primeiro para poder exportar em PDF.');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf?id=${savedId}&token=${token}`;
    window.open(url, '_blank');
  }

  function handleEdit() {
    // Carregar inputs da simulação para o form
    if (result?.inputs) {
      setPrefill(result.inputs);
      setResult(null);
      setSavedId(null);
    } else {
      setResult(null);
    }
  }

  function handleReset() {
    setScenario(null);
    setPrefill(null);
    setResult(null);
    setSavedId(null);
  }

  // --- RENDER ---
  return (
    <main className="max-w-6xl mx-auto px-5 py-8 sm:py-12 space-y-5">
      {!result && <Hero />}

      {/* Histórico recente — só na home, com user logado e >0 simulações */}
      {user && !scenario && !result && recent.length > 0 && (
        <RecentSimulations items={recent} />
      )}

      {!scenario && !result && <ScenarioPicker onPick={handlePick} />}

      {scenario && !result && (
        <CalcForm
          scenario={scenario}
          prefill={prefill}
          onCancel={handleReset}
          onCalculate={handleCalculate}
        />
      )}

      {result && (
        <Result
          result={result}
          onEdit={handleEdit}
          onReset={handleReset}
          onSave={handleSave}
          onExportPdf={handleExportPdf}
          saving={saving}
          savedId={savedId}
          hasPaidAccess={access.hasPaidAccess}
        />
      )}
    </main>
  );
}

// ============================================================
// Componente: últimas simulações
// ============================================================
function RecentSimulations({ items }) {
  return (
    <section className="bg-fm-paper rounded-2xl border border-fm-border shadow-fm p-6 sm:p-7">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-fm-green-dark flex items-center gap-2">
          <Clock size={18} /> Continuar de onde parou
        </h2>
        <Link to="/app/historico" className="text-sm text-fm-green font-semibold hover:underline whitespace-nowrap">
          Ver todas →
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {items.map((sim) => (
          <Link
            key={sim.id}
            to={`/app?load=${sim.id}`}
            className="group bg-fm-ivory border border-fm-border rounded-xl p-4 hover:border-fm-yellow hover:shadow-fm transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-fm-text-mute">
                {scenarioName(sim.scenario)}
              </span>
              <ChevronRight size={14} className="text-fm-text-mute group-hover:text-fm-yellow flex-shrink-0" />
            </div>
            <div className="font-semibold text-fm-green-dark mb-1 truncate">
              {sim.label || 'Sem nome'}
            </div>
            <div className="font-display text-lg font-bold tabular-nums text-fm-green-dark">
              {formatEuro(sim.irs_isolado)}
            </div>
            <div className="text-xs text-fm-text-mute mt-1">
              {formatDate(sim.created_at)}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function scenarioName(s) {
  const map = { hpp: 'HPP', geral: 'Geral', pre1989: 'Pré-1989', estado: 'Estado' };
  return map[s] || s;
}

function Hero() {
  return (
    <div className="mb-2">
      <h1 className="font-display font-bold text-fm-green-dark mb-3" style={{ fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.1 }}>
        Quanto vai pagar de <em className="text-fm-yellow-dark not-italic font-medium italic">IRS</em> na venda do seu imóvel?
      </h1>
      <p className="text-fm-text-soft text-[17px] max-w-2xl">
        Simulador completo da Mais-Valia em Portugal. Calcula o IRS, identifica isenções aplicáveis e simula o impacto do reinvestimento em nova Habitação Própria Permanente.
      </p>
    </div>
  );
}

// ============================================================
// Helpers para serializar/desserializar resultado
// ============================================================
function extractOutputs(result) {
  return {
    maisValia: result.maisValia,
    tributavel50: result.tributavel50,
    tributavelFinal: result.tributavelFinal,
    irsIsolado: result.irsIsolado,
    taxaEfetiva: result.taxaEfetiva,
    ganhoVenda: result.ganhoVenda,
    valorReinvestido: result.valorReinvestido,
    valorNaoReinvestido: result.valorNaoReinvestido,
    percentNaoReinv: result.percentNaoReinv,
    valorCompraAtual: result.valorCompraAtual,
    totalDespesas: result.totalDespesas,
    escalao: result.escalao,
    alerts: result.alerts,
  };
}

function reconstructResult(sim) {
  // Re-correr o cálculo para ter alerts atualizados (estrutura pode ter mudado)
  // mas usar inputs guardados
  const fresh = calcular(sim.inputs);
  return fresh;
}
