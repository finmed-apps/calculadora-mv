import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useSimulations(userId, opts = {}) {
  const { limit = null } = opts;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from('simulations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) console.error('Fetch simulations error:', error);
    setItems(data || []);
    setLoading(false);
  }, [userId, limit]);

  useEffect(() => { refresh(); }, [refresh]);

  async function save({ label, scenario, inputs, outputs }) {
    if (!userId) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('simulations')
      .insert({
        user_id: userId,
        label: label || null,
        scenario,
        inputs,
        outputs,
        irs_isolado: outputs.irsIsolado,
        mais_valia_bruta: outputs.maisValia,
        tributavel_final: outputs.tributavelFinal,
      })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data;
  }

  async function updateLabel(id, label) {
    const { error } = await supabase
      .from('simulations')
      .update({ label })
      .eq('id', id);
    if (error) throw error;
    await refresh();
  }

  async function remove(id) {
    const { error } = await supabase
      .from('simulations')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await refresh();
  }

  return { items, loading, save, updateLabel, remove, refresh };
}

// Hook separado para carregar UMA simulação por ID (para view/edit)
export function useSimulation(simId) {
  const [sim, setSim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!simId) {
      setSim(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('simulations')
      .select('*')
      .eq('id', simId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Fetch simulation error:', error);
          setError(error);
        } else {
          setSim(data);
        }
        setLoading(false);
      });
  }, [simId]);

  return { sim, loading, error };
}
