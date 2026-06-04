import { useState, useEffect, useRef } from 'react';
import {
  Users, Search, Shield, Lock, Unlock, Clock, Plus, Upload,
  Settings, ListChecks, RefreshCw, X, Crown, Ban, Check,
  UserPlus, Trash2, Download, CalendarClock,
} from 'lucide-react';
import { useAdmin, parseEnrolleesFile } from '../hooks/useAdmin';

const DEFAULT_COHORT = 'masterclass_2026_07';

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
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-fm-green-dark">Administração</h1>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-fm-border">
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={Users}>Utilizadores</TabBtn>
        <TabBtn active={tab === 'import'} onClick={() => setTab('import')} icon={Upload}>Importar inscritos</TabBtn>
        <TabBtn active={tab === 'waitlist'} onClick={() => setTab('waitlist')} icon={ListChecks}>Lista de espera</TabBtn>
        <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')} icon={Settings}>Definições</TabBtn>
      </div>

      {admin.error && (
        <div className="bg-fm-danger/10 text-fm-danger text-sm rounded-lg px-4 py-3 mb-4">{admin.error}</div>
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
// VISÃO GERAL
// ============================================================
function StatsBar({ admin }) {
  useEffect(() => { admin.loadStats(); /* eslint-disable-next-line */ }, []);
  const s = admin.stats;
  if (!s) return null;
  const cards = [
    { k: 'Total', v: s.total },
    { k: 'Com acesso', v: s.with_access, c: 'text-fm-green-dark' },
    { k: 'Em trial', v: s.trial },
    { k: 'Pagos', v: s.active },
    { k: 'Concedidos', v: s.granted },
    { k: 'Suspensos', v: s.suspended, c: 'text-fm-danger' },
    { k: 'Expirados', v: s.expired, c: 'text-fm-text-mute' },
    { k: 'Lista espera', v: s.waitlist },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
      {cards.map((c) => (
        <div key={c.k} className="bg-fm-paper border border-fm-border rounded-xl px-3 py-2.5 text-center">
          <div className={`font-display font-bold text-xl ${c.c || 'text-fm-green-dark'}`}>{c.v ?? '—'}</div>
          <div className="text-[10px] uppercase tracking-wide text-fm-text-mute">{c.k}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// TAB: UTILIZADORES
// ============================================================
function UsersTab({ admin }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { admin.loadUsers(); /* eslint-disable-next-line */ }, []);

  const reload = () => { admin.loadUsers(search.trim() || null); admin.loadStats(); };

  function onSearch(e) { e.preventDefault(); admin.loadUsers(search.trim() || null); }

  const filtered = admin.users.filter((u) => {
    if (filter === 'all') return true;
    const st = u.access?.state || 'none';
    if (filter === 'with_access') return u.access?.has_access;
    return st === filter;
  });

  function exportCsv() {
    const header = 'email,nome,estado,segmento,acesso_ate,inscrito\n';
    const body = filtered.map((u) =>
      [u.email, (u.full_name || '').replace(/,/g, ' '), u.access?.state || '', u.cohort || '',
       u.access?.effective_end || u.trial_ends_at || u.access_until || '', u.created_at]
        .join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'utilizadores_finmed.csv'; a.click();
  }

  return (
    <div>
      <StatsBar admin={admin} />

      <form onSubmit={onSearch} className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-fm-text-mute" size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por email ou nome…" className="input pl-9" />
        </div>
        <button type="submit" className="btn btn-dark">Procurar</button>
        <button type="button" onClick={reload} className="btn btn-ghost" title="Recarregar"><RefreshCw size={16} /></button>
      </form>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {[
            ['all', 'Todos'], ['with_access', 'Com acesso'], ['trial', 'Trial'],
            ['granted', 'Concedidos'], ['active', 'Pagos'], ['suspended', 'Suspensos'], ['expired', 'Expirados'],
          ].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filter === k ? 'bg-fm-green text-white border-fm-green' : 'border-fm-border text-fm-text-soft hover:border-fm-green'
              }`}>{label}</button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowAdd(true)} className="btn btn-primary text-sm"><UserPlus size={15} /> Adicionar utilizador</button>
        <button onClick={exportCsv} disabled={!filtered.length} className="btn btn-ghost text-sm disabled:opacity-50"><Download size={15} /> Exportar</button>
      </div>

      <MassTools admin={admin} onDone={reload} />

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
              {admin.loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-fm-text-mute">A carregar…</td></tr>}
              {!admin.loading && filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-fm-text-mute">Sem resultados.</td></tr>}
              {filtered.map((u) => {
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
                    <td className="px-4 py-3 hidden sm:table-cell text-fm-text-soft">{fmtDate(u.access?.effective_end || u.trial_ends_at || u.access_until)}</td>
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

      {selected && <UserDrawer user={selected} admin={admin} onClose={() => setSelected(null)} onChanged={reload} />}
      {showAdd && <AddUserModal admin={admin} onClose={() => setShowAdd(false)} onDone={reload} />}
    </div>
  );
}

// ---- Ferramentas de segmento (em massa) ----
function MassTools({ admin, onDone }) {
  const [cohort, setCohort] = useState(DEFAULT_COHORT);
  const [days, setDays] = useState(7);
  const [trialDate, setTrialDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function run(label, fn, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setMsg('');
    try { const n = await fn(); setMsg(`${label}: ${n ?? 'ok'} utilizador(es).`); onDone(); }
    catch (e) { setMsg('Erro: ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <details className="bg-fm-ivory border border-fm-border rounded-xl mb-4">
      <summary className="cursor-pointer px-4 py-3 font-semibold text-sm text-fm-green-dark flex items-center gap-2">
        <CalendarClock size={16} /> Ferramentas de segmento (operações em massa)
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-3">
        <div>
          <label className="label">Segmento (cohort)</label>
          <input value={cohort} onChange={(e) => setCohort(e.target.value)} className="input max-w-xs" />
          <p className="help">Por defeito, a Masterclass atual. Para futuras edições, usa outro nome de segmento.</p>
        </div>

        <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-fm-border">
          <div>
            <label className="label">Dar dias extra a todos</label>
            <div className="flex gap-2">
              <input type="number" min={1} value={days} onChange={(e) => setDays(parseInt(e.target.value) || 0)} className="input w-24" />
              <button disabled={busy || !days} onClick={() => run('Dias concedidos', () => admin.massGrantDays(cohort, days))} className="btn btn-dark disabled:opacity-50"><Plus size={14} /> Conceder</button>
            </div>
          </div>
          <div>
            <label className="label">Definir fim de trial de todos</label>
            <div className="flex gap-2">
              <input type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} className="input" />
              <button disabled={busy || !trialDate} onClick={() => run('Fim de trial definido', () => admin.massSetTrial(cohort, new Date(trialDate + 'T23:59:59').toISOString()))} className="btn btn-dark disabled:opacity-50"><Clock size={14} /> Aplicar</button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-fm-border">
          <Ban size={16} className="text-fm-danger" />
          <span className="text-xs text-fm-text-mute flex-1 min-w-[160px]">Fechar o trial gratuito de todo o segmento (dia 28 jul).</span>
          <button disabled={busy} onClick={() => run('Reabertos', () => admin.massUnlock(cohort))} className="btn btn-ghost text-xs disabled:opacity-50"><Unlock size={14} /> Reabrir</button>
          <button disabled={busy} onClick={() => run('Trancados', () => admin.massLock(cohort), `Trancar o acesso de TODOS do segmento "${cohort}"?`)} className="btn text-xs bg-fm-danger text-white hover:opacity-90 disabled:opacity-50"><Lock size={14} /> Trancar tudo</button>
        </div>

        {msg && <div className="text-xs text-fm-text-soft pt-1">{msg}</div>}
      </div>
    </details>
  );
}

// ---- Modal: adicionar utilizador ----
function AddUserModal({ admin, onClose, onDone }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('trial'); // trial | grant
  const [days, setDays] = useState(180);
  const [cohort, setCohort] = useState(DEFAULT_COHORT);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    if (!email.includes('@')) { setMsg('Email inválido.'); return; }
    setBusy(true); setMsg('');
    try {
      const res = await admin.addOrGrant(email, name, mode === 'grant' ? days : null, cohort);
      setMsg(res?.existed
        ? 'Feito — a conta já existia e o acesso foi aplicado.'
        : 'Feito — adicionado à lista. Recebe acesso assim que entrar pela primeira vez.');
      setEmail(''); setName('');
      onDone();
    } catch (e) { setMsg('Erro: ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-fm-paper w-full max-w-md rounded-2xl shadow-fm-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl text-fm-green-dark flex items-center gap-2"><UserPlus size={20} /> Adicionar utilizador</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-fm-ivory"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@email.pt" className="input" autoFocus />
          </div>
          <div>
            <label className="label">Nome (opcional)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Tipo de acesso</label>
            <div className="flex gap-2">
              <button onClick={() => setMode('trial')} className={`btn flex-1 justify-center text-sm ${mode === 'trial' ? 'btn-primary' : 'btn-ghost'}`}>Trial normal</button>
              <button onClick={() => setMode('grant')} className={`btn flex-1 justify-center text-sm ${mode === 'grant' ? 'btn-primary' : 'btn-ghost'}`}>Acesso por X dias</button>
            </div>
            <p className="help">
              {mode === 'trial'
                ? 'Entra como inscrito e recebe o trial configurado no 1.º login.'
                : 'Concede acesso direto durante o número de dias indicado (VIP / pagamento offline).'}
            </p>
          </div>
          {mode === 'grant' && (
            <div className="flex items-center gap-2">
              <input type="number" min={1} value={days} onChange={(e) => setDays(parseInt(e.target.value) || 0)} className="input w-28" />
              <span className="text-sm text-fm-text-soft">dias</span>
              <div className="flex gap-1.5 ml-auto">
                <button onClick={() => setDays(180)} className="btn btn-ghost text-xs">6 meses</button>
                <button onClick={() => setDays(365)} className="btn btn-ghost text-xs">1 ano</button>
              </div>
            </div>
          )}
          <div>
            <label className="label">Segmento</label>
            <input value={cohort} onChange={(e) => setCohort(e.target.value)} className="input" />
          </div>
        </div>

        {msg && <div className={`text-sm mt-3 ${msg.startsWith('Erro') || msg.includes('inválido') ? 'text-fm-danger' : 'text-fm-success'}`}>{msg}</div>}

        <div className="flex gap-2 mt-5">
          <button onClick={submit} disabled={busy} className="btn btn-primary flex-1 justify-center disabled:opacity-50">{busy ? 'A guardar…' : 'Adicionar'}</button>
          <button onClick={onClose} className="btn btn-ghost">Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ---- Drawer de gestão por utilizador ----
function UserDrawer({ user, admin, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(14);
  const [trialDate, setTrialDate] = useState(user.trial_ends_at ? new Date(user.trial_ends_at).toISOString().slice(0, 10) : '');
  const st = user.access?.state || 'none';
  const lbl = STATE_LABEL[st] || STATE_LABEL.none;

  async function act(fn, keepOpen = false) {
    setBusy(true);
    try { await fn(); onChanged(); if (!keepOpen) onClose(); }
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

        <Section title="Acesso">
          {user.is_suspended ? (
            <button disabled={busy} onClick={() => act(() => admin.setSuspended(user.id, false))} className="btn btn-primary w-full justify-center disabled:opacity-50"><Unlock size={15} /> Reativar acesso</button>
          ) : (
            <button disabled={busy} onClick={() => act(() => admin.setSuspended(user.id, true))} className="btn w-full justify-center bg-fm-danger text-white hover:opacity-90 disabled:opacity-50"><Lock size={15} /> Suspender acesso</button>
          )}
          <button disabled={busy} onClick={() => act(() => admin.setTrial(user.id, new Date().toISOString()))} className="btn btn-ghost w-full justify-center mt-2 text-sm disabled:opacity-50">
            <Clock size={14} /> Terminar acesso agora
          </button>
        </Section>

        <Section title="Marcar como pago (acesso direto)">
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => act(() => admin.grantDays(user.id, 180))} className="btn btn-dark flex-1 justify-center text-sm disabled:opacity-50">6 meses</button>
            <button disabled={busy} onClick={() => act(() => admin.grantDays(user.id, 365))} className="btn btn-dark flex-1 justify-center text-sm disabled:opacity-50">1 ano</button>
          </div>
        </Section>

        <Section title="Dar tempo extra">
          <div className="flex gap-2">
            <input type="number" min={1} value={days} onChange={(e) => setDays(parseInt(e.target.value) || 0)} className="input w-24" />
            <span className="self-center text-sm text-fm-text-soft">dias</span>
            <button disabled={busy || !days} onClick={() => act(() => admin.grantDays(user.id, days))} className="btn btn-dark flex-1 justify-center disabled:opacity-50"><Plus size={15} /> Conceder</button>
          </div>
          <p className="help">Estende o acesso a partir de hoje (ou da data de fim atual, a maior).</p>
        </Section>

        <Section title="Definir fim de trial">
          <div className="flex gap-2">
            <input type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} className="input flex-1" />
            <button disabled={busy || !trialDate} onClick={() => act(() => admin.setTrial(user.id, new Date(trialDate + 'T23:59:59').toISOString()))} className="btn btn-dark justify-center disabled:opacity-50"><Clock size={15} /> Guardar</button>
          </div>
        </Section>

        <Section title="Permissões">
          <div className="flex gap-2 flex-wrap">
            <button disabled={busy} onClick={() => act(() => admin.setAdmin(user.id, !user.is_admin))} className="btn btn-ghost text-xs disabled:opacity-50"><Shield size={14} /> {user.is_admin ? 'Remover admin' : 'Tornar admin'}</button>
            <button disabled={busy} onClick={() => act(() => admin.setAllowedFlag(user.id, !user.allowed))} className="btn btn-ghost text-xs disabled:opacity-50">{user.allowed ? 'Tirar da lista' : 'Pôr na lista'}</button>
          </div>
        </Section>

        <Section title="Zona de perigo">
          <button disabled={busy} onClick={() => {
            if (window.confirm(`Eliminar a conta de ${user.email}? Apaga o perfil e o histórico de simulações. Não há volta.`)) act(() => admin.deleteUser(user.id));
          }} className="btn w-full justify-center text-fm-danger border border-fm-danger/30 hover:bg-fm-danger/5 text-sm disabled:opacity-50">
            <Trash2 size={14} /> Eliminar conta
          </button>
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
  const [cohort, setCohort] = useState(DEFAULT_COHORT);
  const fileRef = useRef(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseErr(''); setResult(''); setRows([]); setFileName(file.name);
    try {
      const parsed = await parseEnrolleesFile(file);
      if (!parsed.length) setParseErr('Nenhuma linha com email encontrada. Verifica os cabeçalhos (precisa de uma coluna "email").');
      setRows(parsed);
    } catch (err) { setParseErr(err.message); }
  }

  async function doImport() {
    setBusy(true); setResult('');
    try {
      const n = await admin.importAllowed(rows, cohort);
      setResult(`${n} inscrito(s) importado(s) com sucesso.`);
      setRows([]); setFileName('');
      if (fileRef.current) fileRef.current.value = '';
      admin.loadStats();
    } catch (e) { setResult('Erro: ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-fm-paper border border-fm-border rounded-xl p-6 mb-4">
        <h2 className="font-bold text-fm-green-dark mb-1">Importar inscritos da Masterclass</h2>
        <p className="text-sm text-fm-text-soft mb-4">
          Carrega um ficheiro <strong>CSV</strong> ou <strong>Excel</strong> exportado do Go High Level.
          Colunas reconhecidas: <code>email</code> (obrigatória), <code>nome</code>, <code>plano</code>, <code>trial_start</code> (opcional).
          Quem já tiver conta é reativado automaticamente.
        </p>
        <div className="mb-3">
          <label className="label">Segmento (cohort)</label>
          <input value={cohort} onChange={(e) => setCohort(e.target.value)} className="input max-w-xs" />
        </div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="btn btn-dark"><Upload size={16} /> Escolher ficheiro</button>
        {fileName && <span className="ml-3 text-sm text-fm-text-soft">{fileName}</span>}
        {parseErr && <div className="text-fm-danger text-sm mt-3">{parseErr}</div>}
      </div>

      {rows.length > 0 && (
        <div className="bg-fm-paper border border-fm-border rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-fm-green-dark text-sm">{rows.length} linha(s) prontas</span>
            <button onClick={doImport} disabled={busy} className="btn btn-primary disabled:opacity-50">{busy ? 'A importar…' : `Importar ${rows.length}`}</button>
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

      {result && <div className={`text-sm rounded-lg px-4 py-3 ${result.startsWith('Erro') ? 'bg-fm-danger/10 text-fm-danger' : 'bg-fm-success/10 text-fm-success'}`}>{result}</div>}
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
    a.href = URL.createObjectURL(blob); a.download = 'lista_espera_finmed.csv'; a.click();
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-fm-text-soft">{admin.waitlist.length} email(s) na lista de espera</span>
        <button onClick={exportCsv} disabled={!admin.waitlist.length} className="btn btn-ghost text-sm disabled:opacity-50"><Download size={15} /> Exportar CSV</button>
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
        <p className="help">Aplica-se a quem se inscrever <strong>a partir de agora</strong>. Para mudar a data a quem já se inscreveu, usa "Definir fim de trial de todos" nas Ferramentas de segmento (separador Utilizadores).</p>
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
