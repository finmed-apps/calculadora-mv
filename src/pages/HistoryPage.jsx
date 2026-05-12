import { Link } from 'react-router-dom';
import { Trash2, Edit3, FileDown, FileText, Eye } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSimulations } from '../hooks/useSimulations';
import { formatEuro, formatDate } from '../lib/calc';
import { supabase } from '../lib/supabase';

export function HistoryPage() {
  const { user } = useAuth();
  const { items, loading, updateLabel, remove } = useSimulations(user?.id);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  if (loading) {
    return <main className="max-w-5xl mx-auto px-5 py-12 text-fm-text-mute">A carregar histórico…</main>;
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditValue(item.label || '');
  }

  async function saveEdit() {
    if (editingId) await updateLabel(editingId, editValue.trim() || null);
    setEditingId(null);
  }

  async function exportPdf(id) {
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf?id=${id}&token=${session?.access_token}`;
    window.open(url, '_blank');
  }

  return (
    <main className="max-w-5xl mx-auto px-5 py-8 sm:py-12">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-3xl text-fm-green-dark mb-1">As suas simulações</h1>
          <p className="text-fm-text-soft">{items.length} simulações guardadas.</p>
        </div>
        <Link to="/app" className="btn btn-primary">Nova simulação →</Link>
      </div>

      {items.length === 0 ? (
        <div className="bg-fm-paper rounded-2xl border border-fm-border p-10 text-center">
          <FileText className="mx-auto text-fm-text-mute mb-3" size={36} />
          <h2 className="font-bold text-fm-green-dark mb-2">Ainda não tem simulações</h2>
          <p className="text-fm-text-soft text-sm mb-4">Faça a sua primeira simulação para começar.</p>
          <Link to="/app" className="btn btn-primary">Nova simulação →</Link>
        </div>
      ) : (
        <div className="bg-fm-paper rounded-2xl border border-fm-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-fm-ivory border-b border-fm-border">
              <tr className="text-left text-[11px] uppercase tracking-widest text-fm-text-mute font-bold">
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3 hidden sm:table-cell">Cenário</th>
                <th className="px-5 py-3 text-right">IRS estimado</th>
                <th className="px-5 py-3 hidden md:table-cell">Data</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fm-border">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-fm-ivory transition-colors">
                  <td className="px-5 py-4">
                    {editingId === s.id ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        onBlur={saveEdit}
                        className="input py-1.5 text-sm"
                      />
                    ) : (
                      <Link to={`/app?load=${s.id}`} className="font-semibold text-fm-green-dark hover:text-fm-green-soft">
                        {s.label || 'Sem nome'}
                      </Link>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <ScenarioBadge scenario={s.scenario} />
                  </td>
                  <td className="px-5 py-4 text-right font-bold tabular-nums">{formatEuro(s.irs_isolado)}</td>
                  <td className="px-5 py-4 hidden md:table-cell text-sm text-fm-text-soft">{formatDate(s.created_at)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex gap-1">
                      <Link to={`/app?load=${s.id}`} className="p-2 rounded-lg hover:bg-fm-border-soft text-fm-text-soft" title="Abrir">
                        <Eye size={16} />
                      </Link>
                      <button onClick={() => startEdit(s)} className="p-2 rounded-lg hover:bg-fm-border-soft text-fm-text-soft" title="Renomear">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => exportPdf(s.id)} className="p-2 rounded-lg hover:bg-fm-border-soft text-fm-text-soft" title="Exportar PDF">
                        <FileDown size={16} />
                      </button>
                      <button onClick={() => { if (confirm('Apagar esta simulação?')) remove(s.id); }} className="p-2 rounded-lg hover:bg-fm-danger/10 text-fm-danger" title="Apagar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function ScenarioBadge({ scenario }) {
  const map = {
    hpp:     { label: 'HPP',     color: 'bg-fm-yellow/30 text-fm-green-dark' },
    geral:   { label: 'Geral',   color: 'bg-fm-border text-fm-text-soft' },
    pre1989: { label: 'Pré-1989', color: 'bg-fm-success/20 text-fm-success' },
    estado:  { label: 'Estado',  color: 'bg-fm-success/20 text-fm-success' },
  };
  const m = map[scenario] || map.geral;
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${m.color}`}>{m.label}</span>;
}
