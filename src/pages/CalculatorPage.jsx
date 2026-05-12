import { useState } from 'react';
import { ScenarioPicker } from '../components/ScenarioPicker';
import { CalcForm } from '../components/CalcForm';
import { Result } from '../components/Result';
import { calcular } from '../lib/calc';
import { useAuth } from '../hooks/useAuth';
import { useSimulations } from '../hooks/useSimulations';
import { useAccess } from '../hooks/useAccess';
import { useNavigate } from 'react-router-dom';

export function CalculatorPage() {
  const { user } = useAuth();
  const access = useAccess(user?.id);
  const { save } = useSimulations(user?.id);
  const nav = useNavigate();

  const [scenario, setScenario] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);

  function handlePick(s) {
    if (s === 'pre1989' || s === 'estado') {
      // cenários só-informativos: leva para uma página dedicada ou abre alerta
      // por agora, só seguimos para o form mas o engine de cálculo trata o caso
      setScenario(s);
    } else {
      setScenario(s);
    }
    setResult(null);
    setSavedId(null);
  }

  function handleCalculate(inputs) {
    try {
      const out = calcular(inputs);
      setResult(out);
      // scroll suave para o resultado depois do render
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } catch (err) {
      console.error('Calculation error:', err);
      alert('Erro no cálculo:\n\n' + err.message);
    }
  }

  async function handleSave(label) {
    if (!user) {
      // user não logado: redireciona para login com state para voltar
      nav('/login', { state: { from: '/' } });
      return;
    }
    setSaving(true);
    try {
      const row = await save({
        label,
        scenario: result.inputs.scenario,
        inputs: result.inputs,
        outputs: {
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
        },
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
    // chama edge function para gerar o PDF
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf?id=${savedId}`;
    window.open(url, '_blank');
  }

  function handleReset() {
    setScenario(null);
    setResult(null);
    setSavedId(null);
  }

  // --- RENDER ---
  return (
    <main className="max-w-6xl mx-auto px-5 py-8 sm:py-12 space-y-5">
      <Hero />

      {!scenario && <ScenarioPicker onPick={handlePick} />}

      {scenario && !result && (
        <CalcForm
          scenario={scenario}
          onCancel={handleReset}
          onCalculate={handleCalculate}
        />
      )}

      {result && (
        <Result
          result={result}
          onEdit={() => setResult(null)}
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

function Hero() {
  return (
    <div className="text-center sm:text-left mb-2">
      <h1 className="font-display font-bold text-fm-green-dark mb-3" style={{ fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.1 }}>
        Quanto vai pagar de <em className="text-fm-yellow-dark not-italic font-medium italic">IRS</em> na venda do seu imóvel?
      </h1>
      <p className="text-fm-text-soft text-[17px] max-w-2xl">
        Simulador completo da Mais-Valia em Portugal. Calcula o IRS, identifica isenções aplicáveis e simula o impacto do reinvestimento em nova Habitação Própria Permanente.
      </p>
    </div>
  );
}
