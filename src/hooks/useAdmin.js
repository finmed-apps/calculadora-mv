import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Wrappers das RPCs admin. Toda a autorização é feita no servidor
// (cada RPC corre app.require_admin()). Aqui só orquestramos chamadas.
export function useAdmin() {
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState(null);
  const [waitlist, setWaitlist] = useState([]);
  const [allowed, setAllowed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const wrap = async (promise) => {
    const { data, error } = await promise;
    if (error) throw new Error(error.message);
    return data;
  };

  const loadUsers = useCallback(async (search = null) => {
    setLoading(true); setError('');
    try {
      const data = await wrap(supabase.rpc('admin_list_users', { p_search: search || null }));
      setUsers(data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const loadConfig = useCallback(async () => {
    try { setConfig(await wrap(supabase.rpc('admin_get_config'))); }
    catch (e) { setError(e.message); }
  }, []);

  const loadWaitlist = useCallback(async () => {
    try { setWaitlist(await wrap(supabase.rpc('admin_list_waitlist', { p_limit: 1000 })) || []); }
    catch (e) { setError(e.message); }
  }, []);

  const loadAllowed = useCallback(async () => {
    try { setAllowed(await wrap(supabase.rpc('admin_list_allowed', { p_limit: 5000 })) || []); }
    catch (e) { setError(e.message); }
  }, []);

  // Mutações
  const setSuspended = (userId, val) =>
    wrap(supabase.rpc('admin_set_suspended', { p_user: userId, p_suspended: val }));

  const grantDays = (userId, days) =>
    wrap(supabase.rpc('admin_grant_days', { p_user: userId, p_days: days }));

  const setTrial = (userId, endsAtISO) =>
    wrap(supabase.rpc('admin_set_trial', { p_user: userId, p_ends: endsAtISO }));

  const setAdmin = (userId, val) =>
    wrap(supabase.rpc('admin_set_admin', { p_user: userId, p_is_admin: val }));

  const setAllowedFlag = (userId, val) =>
    wrap(supabase.rpc('admin_set_allowed', { p_user: userId, p_allowed: val }));

  const massLock = (cohort) =>
    wrap(supabase.rpc('admin_mass_lock', { p_cohort: cohort }));

  const massUnlock = (cohort) =>
    wrap(supabase.rpc('admin_mass_unlock', { p_cohort: cohort }));

  const importAllowed = (rows, cohort) =>
    wrap(supabase.rpc('admin_import_allowed', { p_rows: rows, p_cohort: cohort }));

  const saveConfig = async (fields) => {
    const cfg = await wrap(supabase.rpc('admin_set_config', {
      p_trial_start_date: fields.trial_start_date ?? null,
      p_trial_days: fields.trial_days ?? null,
      p_public_signup_open: fields.public_signup_open ?? null,
    }));
    setConfig(cfg);
    return cfg;
  };

  return {
    users, config, waitlist, allowed, loading, error,
    loadUsers, loadConfig, loadWaitlist, loadAllowed,
    setSuspended, grantDays, setTrial, setAdmin, setAllowedFlag,
    massLock, massUnlock, importAllowed, saveConfig,
  };
}

// ------------------------------------------------------------
// Parsing de ficheiro de inscritos (CSV nativo; XLSX via SheetJS on-demand)
// Aceita colunas: email, nome/full_name/name, plano/plan, cohort, trial_start
// ------------------------------------------------------------
const COL_MAP = {
  email: 'email', 'e-mail': 'email',
  nome: 'full_name', name: 'full_name', full_name: 'full_name', 'nome completo': 'full_name',
  plano: 'plan', plan: 'plan',
  cohort: 'cohort', segmento: 'cohort',
  trial_start: 'trial_start', 'inicio': 'trial_start', 'início': 'trial_start',
  'data de inicio': 'trial_start', 'data de início': 'trial_start', 'data_inicio': 'trial_start',
};

function normHeader(h) {
  const k = String(h || '').trim().toLowerCase();
  return COL_MAP[k] || null;
}

function rowsFromMatrix(matrix) {
  if (!matrix.length) return [];
  const headers = matrix[0].map(normHeader);
  const out = [];
  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i];
    if (!cells || cells.every((c) => c === '' || c == null)) continue;
    const obj = {};
    headers.forEach((key, idx) => {
      if (key) obj[key] = cells[idx] != null ? String(cells[idx]).trim() : '';
    });
    if (obj.email) out.push(obj);
  }
  return out;
}

function parseCsv(text) {
  // Parser CSV simples com suporte a aspas e separador , ou ;
  const sep = (text.split('\n')[0].match(/;/g)?.length || 0) >
              (text.split('\n')[0].match(/,/g)?.length || 0) ? ';' : ',';
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === sep) { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rowsFromMatrix(rows);
}

export async function parseEnrolleesFile(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    return parseCsv(text);
  }
  // XLSX/XLS → carrega SheetJS do CDN apenas quando é preciso
  if (!window.XLSX) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = resolve; s.onerror = () => reject(new Error('Não foi possível carregar o leitor de Excel'));
      document.head.appendChild(s);
    });
  }
  const buf = await file.arrayBuffer();
  const wb = window.XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const matrix = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  return rowsFromMatrix(matrix);
}
