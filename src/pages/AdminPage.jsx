import { useState, useEffect, useRef } from 'react';
import {
  Users, Search, Shield, Lock, Unlock, Clock, Plus, Upload,
  Settings, ListChecks, RefreshCw, X, Crown, Ban, Check,
} from 'lucide-react';
import { useAdmin, parseEnrolleesFile } from '../hooks/useAdmin';

const COHORT = 'masterclass_2026_07';

const STATE_LABEL = {
  admin: { t: 'Admin', c: 'bg-fm-green text-white' },
  active: { t: 'Pago', c: 'bg-fm-green/15 text-fm-green-dark' },
  trial: { t: 'Trial', c: 'bg-fm-yellow/30 text-fm-green-dark' },
  granted: { t: 'Concedido', c: 'bg-blue-100 text-blue-700' },
  expired: { t: 'Expirado', c: 'bg-fm-border text-fm-text-mute' },
  suspended: { t: 'Suspenso', c: 'bg-fm-danger/15 text-fm-danger' },
  not_allowed: { t: 'Fora da lista', c: 'bg-fm-border text-fm-text-mute' },
  none: { t: 'Sem acesso', c: 'bg-fm-border text-fm-text-mute' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function AdminPage() {
  const admin = useAdmin();
  const [tab, setTab] = useState('users');

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-5 py-8 sm:py-10">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="text-fm-green" size={26} />
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-fm-green-dark">
          Administração
        </h1>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-fm-border">
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={Users}>Utilizadores</TabBtn>
        <TabBtn active={tab === 'import'} onClick={() => setTab('import')} icon={Upload}>Importar inscritos</TabBtn>
        <TabBtn active={tab === 'waitlist'} onClick={() => setTab('waitlist')} icon={ListChecks}>Lista de espera</TabBtn>
        <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')} icon={Settings}>Definições</TabBtn>
      </div>

      {admin.error && (
        <div className="bg-fm-danger/10 text-fm-danger text-sm rounded-lg px-4 py-3 mb-4">
          {admin.error}
        </div>
      )}

      {tab === 'users' && <UsersTab admin={admin} />}
      {tab === 'import' && <ImportTab admin={admin} />}
      {tab === 'waitlist' && <WaitlistTab admin={admin} />}
      {tab === 'settings' && <SettingsTab admin={admin} />}
    </main>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-t-lg -mb-px border-b-2 transition-colors ${
        active ? 'border-fm-green text-fm-green-dark' : 'border-transparent text-fm-text-mute hover:text-fm-green-dark'
      }`}
    >
      <Icon size={15} /> {children}
    </button>
  );
}

// ============================================================
// TAB: UTILIZADORES
// ============================================================
function UsersTab({ admin }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { admin.loadUsers(); /* eslint-disable-next-line */ }, []);

  function onSearch(e) {
    e.preventDefault();
    admin.loadUsers(search.trim() || null);
  }

  return (
    <div>
      <form onSubmit={onSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-fm-text-mute" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por email ou nome…"
            className="input pl-9"
          />
        </div>
        <button type="submit" className="btn btn-dark">Procurar</button>
        <button type="button" onClick={() => { setSearch(''); admin.loadUsers(); }} className="btn btn-ghost" title="Recarregar">
          <RefreshCw size={16} />
        </button>
      </form>

      <MassLock admin={admin} />

      <div className="bg-fm-paper border border-fm-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-fm-ivory text-fm-text-mute text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Utilizador</th>
                <th className="text-left font-semibold px-4 py-3">Estado</th>
                <th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">Acesso até</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Inscrito</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {admin.loading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-fm-text-mute">A carregar…</td></tr>
              )}
              {!admin.loading && admin.users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-fm-text-mute">Sem utilizadores.</td></tr>
              )}
              {admin.users.map((u) => {
                const st = u.access?.state || 'none';
                const lbl = STATE_LABEL[st] || STATE_LABEL.none;
                return (
                  <tr key={u.id} className="border-t border-fm-border hover:bg-fm-ivory/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-fm-green-dark">{u.full_name || '—'}</div>
                      <div className="text-fm-text-mute text-xs">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${lbl.c}`}>{lbl.t}</span>
                      {u.is_admin && st !== 'admin' && <Crown size={12} className="inline ml-1 text-fm-yellow-dark" />}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-fm-text-soft">
                      {fmtDate(u.access?.effective_end || u.trial_ends_at || u.access_until)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-fm-text-soft">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelected(u)} className="text-fm-green font-semibold hover:underline text-xs">Gerir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <UserDrawer
          user={selected}
          admin={admin}
          onClose={() => setSelected(null)}
          onChanged={() => admin.loadUsers(search.trim() || null)}
        />
      )}
    </div>
  );
}

function MassLock({ admin }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function run(lock) {
    const verb = lock ? 'TRANCAR' : 'reabrir';
    if (!window.confirm(`Vais ${verb} o acesso de TODOS os utilizadores do segmento "${COHORT}". Confirmas?`)) return;
    setBusy(true); setMsg('');
    try {
      const n = lock ? await admin.massLock(COHORT) : await admin.massUnlock(COHORT);
      setMsg(`${n} utilizador(es) ${lock ? 'trancados' : 'reabertos'}.`);
      await admin.loadUsers();
    } catch (e) { setMsg('Erro: ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-fm-danger/5 border border-fm-danger/20 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
      <Ban size={18} className="text-fm-danger" />
      <div className="flex-1 min-w-[200px]">
        <div className="font-semibold text-fm-green-dark text-sm">Trancar acesso em massa</div>
        <div className="text-xs text-fm-text-mute">Fecha o trial gratuito de toda a Masterclass (segmento {COHORT}).</div>
      </div>
      {msg && <span className="text-xs text-fm-text-soft">{msg}</span>}
      <button onClick={() => run(false)} disabled={busy} className="btn btn-ghost text-xs disabled:opacity-50">Reabrir</button>
      <button onClick={() => run(true)} disabled={busy} className="btn text-xs bg-fm-danger text-white hover:opacity-90 disabled:opacity-50">
        <Lock size={14} /> Trancar tudo
      </button>
    </div>
  );
}

function UserDrawer({ user, admin, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(14);
  const [trialDate, setTrialDate] = useState(
    user.trial_ends_at ? new Date(user.trial_ends_at).toISOString().slice(0, 10) : ''
  );
  const st = user.access?.state || 'none';
  const lbl = STATE_LABEL[st] || STATE_LABEL.none;

  async function act(fn) {
    setBusy(true);
    try { await fn(); onChanged(); onClose(); }
    catch (e) { alert('Erro: ' + e.message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-fm-paper w-full max-w-md h-full overflow-y-auto shadow-fm-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display font-bold text-xl text-fm-green-dark">{user.full_name || 'Utilizador'}</h2>
            <p className="text-fm-text-mute text-sm">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-fm-ivory"><X size={18} /></button>
        </div>

        <div className="space-y-1.5 text-sm mb-6 bg-fm-ivory rounded-lg p-4">
          <Row k="Estado" v={<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lbl.c}`}>{lbl.t}</span>} />
          <Row k="Segmento" v={user.cohort || '—'} />
          <Row k="Fim de trial" v={fmtDate(user.trial_ends_at)} />
          <Row k="Acesso concedido até" v={fmtDate(user.access_until)} />
          <Row k="Inscrito em" v={fmtDate(user.created_at)} />
          <Row k="Na lista" v={user.allowed ? 'Sim' : 'Não'} />
        </div>

        {/* Ligar/desligar acesso */}
        <Section title="Acesso">
          {user.is_suspended ? (
            <button disabled={busy} onClick={() => act(() => admin.setSuspended(user.id, false))} className="btn btn-primary w-full justify-center disabled:opacity-50">
              <Unlock size={15} /> Reativar acesso
            </button>
          ) : (
            <button disabled={busy} onClick={() => act(() => admin.setSuspended(user.id, true))} className="btn w-full justify-center bg-fm-danger text-white hover:opacity-90 disabled:opacity-50">
              <Lock size={15} /> Suspender acesso
            </button>
          )}
        </Section>

        {/* Dar tempo extra */}
        <Section title="Dar tempo extra">
          <div className="flex gap-2">
            <input type="number" min={1} value={days} onChange={(e) => setDays(parseInt(e.target.value) || 0)} className="input w-24" />
            <span className="self-center text-sm text-fm-text-soft">dias</span>
            <button disabled={busy || !days} onClick={() => act(() => admin.grantDays(user.id, days))} className="btn btn-dark flex-1 justify-center disabled:opacity-50">
              <Plus size={15} /> Conceder
            </button>
          </div>
          <p className="help">Estende o acesso a partir de hoje (ou da data de fim atual, a maior).</p>
        </Section>

        {/* Definir fim de trial */}
        <Section title="Definir fim de trial">
          <div className="flex gap-2">
            <input type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} className="input flex-1" />
            <button disabled={busy || !trialDate} onClick={() => act(() => admin.setTrial(user.id, new Date(trialDate + 'T23:59:59').toISOString()))} className="btn btn-dark justify-center disabled:opacity-50">
              <Clock size={15} /> Guardar
            </button>
          </div>
        </Section>

        {/* Admin / Lista */}
        <Section title="Permissões">
          <div className="flex gap-2 flex-wrap">
            <button disabled={busy} onClick={() => act(() => admin.setAdmin(user.id, !user.is_admin))} className="btn btn-ghost text-xs disabled:opacity-50">
              <Shield size={14} /> {user.is_admin ? 'Remover admin' : 'Tornar admin'}
            </button>
            <button disabled={busy} onClick={() => act(() => admin.setAllowedFlag(user.id, !user.allowed))} className="btn btn-ghost text-xs disabled:opacity-50">
              {user.allowed ? 'Tirar da lista' : 'Pôr na lista'}
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-fm-text-mute">{k}</span>
      <span className="font-semibold text-fm-green-dark text-right">{v}</span>
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div className="mb-5 pt-4 border-t border-fm-border">
      <div className="text-xs uppercase tracking-wide font-bold text-fm-text-mute mb-2.5">{title}</div>
      {children}
    </div>
  );
}

// ============================================================
// TAB: IMPORTAR
// ============================================================
function ImportTab({ admin }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parseErr, setParseErr] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseErr(''); setResult(''); setRows([]); setFileName(file.name);
    try {
      const parsed = await parseEnrolleesFile(file);
      if (!parsed.length) setParseErr('Nenhuma linha com email encontrada. Verifica os cabeçalhos (precisa de uma coluna "email").');
      setRows(parsed);
    } catch (err) {
      setParseErr(err.message);
    }
  }

  async function doImport() {
    setBusy(true); setResult('');
    try {
      const n = await admin.importAllowed(rows, COHORT);
      setResult(`${n} inscrito(s) importado(s) com sucesso.`);
      setRows([]); setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) { setResult('Erro: ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-fm-paper border border-fm-border rounded-xl p-6 mb-4">
        <h2 className="font-bold text-fm-green-dark mb-1">Importar inscritos da Masterclass</h2>
        <p className="text-sm text-fm-text-soft mb-4">
          Carrega um ficheiro <strong>CSV</strong> ou <strong>Excel</strong> exportado do Go High Level.
          Colunas reconhecidas: <code>email</code> (obrigatória), <code>nome</code>, <code>plano</code>,
          <code> trial_start</code> (opcional). Quem já tiver conta é reativado automaticamente.
        </p>

        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="btn btn-dark">
          <Upload size={16} /> Escolher ficheiro
        </button>
        {fileName && <span className="ml-3 text-sm text-fm-text-soft">{fileName}</span>}

        {parseErr && <div className="text-fm-danger text-sm mt-3">{parseErr}</div>}
      </div>

      {rows.length > 0 && (
        <div className="bg-fm-paper border border-fm-border rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-fm-green-dark text-sm">{rows.length} linha(s) prontas</span>
            <button onClick={doImport} disabled={busy} className="btn btn-primary disabled:opacity-50">
              {busy ? 'A importar…' : `Importar ${rows.length}`}
            </button>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto border border-fm-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-fm-ivory text-fm-text-mute sticky top-0">
                <tr><th className="text-left px-3 py-2">Email</th><th className="text-left px-3 py-2">Nome</th><th className="text-left px-3 py-2">Plano</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className="border-t border-fm-border">
                    <td className="px-3 py-1.5">{r.email}</td>
                    <td className="px-3 py-1.5">{r.full_name || '—'}</td>
                    <td className="px-3 py-1.5">{r.plan || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className={`text-sm rounded-lg px-4 py-3 ${result.startsWith('Erro') ? 'bg-fm-danger/10 text-fm-danger' : 'bg-fm-success/10 text-fm-success'}`}>
          {result}
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB: LISTA DE ESPERA
// ============================================================
function WaitlistTab({ admin }) {
  useEffect(() => { admin.loadWaitlist(); /* eslint-disable-next-line */ }, []);

  function exportCsv() {
    const header = 'email,data\n';
    const body = admin.waitlist.map((w) => `${w.email},${new Date(w.created_at).toISOString()}`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lista_espera_finmed.csv';
    a.click();
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-fm-text-soft">{admin.waitlist.length} email(s) na lista de espera</span>
        <button onClick={exportCsv} disabled={!admin.waitlist.length} className="btn btn-ghost text-sm disabled:opacity-50">Exportar CSV</button>
      </div>
      <div className="bg-fm-paper border border-fm-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-fm-ivory text-fm-text-mute text-xs uppercase">
            <tr><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Data</th></tr>
          </thead>
          <tbody>
            {admin.waitlist.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-fm-text-mute">Vazia.</td></tr>}
            {admin.waitlist.map((w) => (
              <tr key={w.id} className="border-t border-fm-border">
                <td className="px-4 py-2.5">{w.email}</td>
                <td className="px-4 py-2.5 text-fm-text-soft">{fmtDate(w.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// TAB: DEFINIÇÕES
// ============================================================
function SettingsTab({ admin }) {
  const [startDate, setStartDate] = useState('');
  const [trialDays, setTrialDays] = useState(30);
  const [publicOpen, setPublicOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { admin.loadConfig(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (admin.config) {
      setStartDate(admin.config.trial_start_date || '');
      setTrialDays(admin.config.trial_days ?? 30);
      setPublicOpen(!!admin.config.public_signup_open);
    }
  }, [admin.config]);

  async function save() {
    setBusy(true); setMsg('');
    try {
      await admin.saveConfig({ trial_start_date: startDate, trial_days: trialDays, public_signup_open: publicOpen });
      setMsg('Definições guardadas.');
    } catch (e) { setMsg('Erro: ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-xl bg-fm-paper border border-fm-border rounded-xl p-6 space-y-5">
      <div>
        <label className="label">Data de início do trial</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
        <p className="help">Os inscritos que entram contam o mês a partir desta data (ou do 1º login, se for posterior). Ex.: 11 ou 18 jul.</p>
      </div>
      <div>
        <label className="label">Duração do trial (dias)</label>
        <input type="number" min={1} value={trialDays} onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)} className="input w-32" />
      </div>
      <div className="flex items-start gap-3 pt-2 border-t border-fm-border">
        <input id="pub" type="checkbox" checked={publicOpen} onChange={(e) => setPublicOpen(e.target.checked)} className="mt-1" />
        <label htmlFor="pub" className="text-sm">
          <span className="font-semibold text-fm-green-dark">Abrir ao público</span>
          <span className="block text-fm-text-mute text-xs">Quando ligado, qualquer pessoa pode entrar (paywall desligada). Mantém DESLIGADO até abrires oficialmente.</span>
        </label>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button onClick={save} disabled={busy} className="btn btn-primary disabled:opacity-50">{busy ? 'A guardar…' : 'Guardar definições'}</button>
        {msg && <span className={`text-sm ${msg.startsWith('Erro') ? 'text-fm-danger' : 'text-fm-success'}`}><Check size={14} className="inline" /> {msg}</span>}
      </div>
    </div>
  );
}
