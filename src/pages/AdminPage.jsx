import { useState, useEffect, useRef } from 'react';
import {
  Users, Search, Shield, Lock, Unlock, Clock, Plus, Upload,
  Settings, ListChecks, RefreshCw, X, Crown, Ban, Check,
  UserPlus, Trash2, Download, CalendarClock, ScrollText, HelpCircle,
  ArrowUp, ArrowDown, ArrowUpDown, Mail, LayoutDashboard, Wallet, TrendingUp, FileText, UserCheck,
  MessageSquare, Bug, Lightbulb,
} from 'lucide-react';
import { useAdmin, parseEnrolleesFile } from '../hooks/useAdmin';
import { AdminGuide, hasSeenAdminGuide, markAdminGuideSeen } from '../components/AdminGuide';

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
function fmtDateTime(d) {
  if (!d) return 'Nunca';
  return new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
const eur = (n) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n) || 0);

// Ordenação da tabela de utilizadores
const STATE_RANK = { admin: 0, active: 1, granted: 2, trial: 3, expired: 4, suspended: 5, not_allowed: 6, none: 7 };
function tsVal(d) { return d ? new Date(d).getTime() : -Infinity; }
function sortValue(u, key) {
  switch (key) {
    case 'user': return (u.full_name || u.email || '').toLowerCase();
    case 'state': return STATE_RANK[u.access?.state || 'none'] ?? 99;
    case 'until': return tsVal(u.access?.effective_end || u.trial_ends_at || u.access_until);
    case 'sims': return Number(u.simulations_count) || 0;
    case 'last': return tsVal(u.last_sign_in_at);
    case 'created':
    default: return tsVal(u.created_at);
  }
}

function SortHeader({ label, k, sort, onSort, className }) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 font-semibold hover:text-fm-green-dark transition-colors ${active ? 'text-fm-green-dark' : ''}`}
      >
        {label}
        <Icon size={12} className={active ? '' : 'opacity-30'} />
      </button>
    </th>
  );
}

// Normaliza para pesquisa (minúsculas, sem acentos)
function norm(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

// Legenda dos estados
const STATE_DESC = [
  ['admin', 'Administrador da aplicação.'],
  ['active', 'Pagou — acesso ativo.'],
  ['granted', 'Acesso dado manualmente pela equipa (VIP / exceção).'],
  ['trial', 'Período gratuito da Masterclass a decorrer.'],
  ['expired', 'O acesso terminou — a pessoa vê a página de planos.'],
  ['suspended', 'Bloqueado manualmente (mesmo que tenha pago).'],
  ['not_allowed', 'O email não consta dos inscritos — vê a lista de espera, sem acesso.'],
  ['none', 'Sem trial nem pagamento ativo.'],
];

function StateLegend() {
  return (
    <details className="mb-4 bg-fm-paper border border-fm-border rounded-xl">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-fm-green-dark">
        O que significam os estados?
      </summary>
      <div className="px-4 pb-4 grid sm:grid-cols-2 gap-x-6 gap-y-2">
        {STATE_DESC.map(([k, desc]) => {
          const lbl = STATE_LABEL[k];
          return (
            <div key={k} className="flex items-start gap-2 text-sm">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${lbl.c}`}>{lbl.t}</span>
              <span className="text-fm-text-soft">{desc}</span>
            </div>
          );
        })}
      </div>
    </details>
  );
}

// Checkbox "selecionar tudo" com estado indeterminado
function CheckAll({ checked, indeterminate, onChange }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate && !checked; }, [indeterminate, checked]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 accent-fm-green cursor-pointer align-middle" />;
}

// Barra de ações em massa sobre os utilizadores selecionados
function BulkBar({ ids, admin, onApplied, onClear }) {
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(14);
  const [trialDate, setTrialDate] = useState('');
  const n = ids.length;
  async function run(fn, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try { await fn(); onApplied(); }
    catch (e) { alert('Erro: ' + e.message); setBusy(false); }
  }
  const sm = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors';
  return (
    <div className="sticky top-2 z-20 mb-3 bg-fm-green-dark text-white rounded-xl px-3 py-2.5 shadow-fm-lg flex flex-wrap items-center gap-2">
      <span className="font-semibold text-sm px-1">{n} selecionado(s)</span>
      <div className="flex-1 min-w-[8px]" />
      <button disabled={busy} onClick={() => run(() => admin.bulkGrantDays(ids, 180))} className={`${sm} bg-white/15 hover:bg-white/25`}>Pago 6m</button>
      <button disabled={busy} onClick={() => run(() => admin.bulkGrantDays(ids, 365))} className={`${sm} bg-white/15 hover:bg-white/25`}>Pago 1 ano</button>
      <span className="inline-flex items-center gap-1 bg-white/10 rounded-lg pl-2">
        <input type="number" min={1} value={days} onChange={(e) => setDays(parseInt(e.target.value) || 0)} className="w-12 bg-transparent text-white text-xs py-1.5 outline-none" />
        <button disabled={busy || !days} onClick={() => run(() => admin.bulkGrantDays(ids, days))} className={`${sm} bg-white/15 hover:bg-white/25`}>+ dias</button>
      </span>
      <span className="inline-flex items-center gap-1 bg-white/10 rounded-lg pl-2">
        <input type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} className="bg-transparent text-white text-xs py-1.5 outline-none" />
        <button disabled={busy || !trialDate} onClick={() => run(() => admin.bulkSetTrial(ids, new Date(trialDate + 'T23:59:59').toISOString()))} className={`${sm} bg-white/15 hover:bg-white/25`}>Fim de trial</button>
      </span>
      <button disabled={busy} onClick={() => run(() => admin.bulkSetSuspended(ids, false))} className={`${sm} bg-white/15 hover:bg-white/25`}>Reativar</button>
      <button disabled={busy} onClick={() => run(() => admin.bulkSetSuspended(ids, true), `Suspender ${n} utilizador(es)?`)} className={`${sm} bg-fm-danger text-white hover:opacity-90`}>Suspender</button>
      <button disabled={busy} onClick={() => run(() => admin.bulkDelete(ids), `Eliminar ${n} conta(s)? Não há volta. (admins e a tua conta são ignorados)`)} className={`${sm} bg-fm-danger text-white hover:opacity-90`}>Eliminar</button>
      <button disabled={busy} onClick={onClear} className={`${sm} bg-white/10 hover:bg-white/20`}>Limpar</button>
    </div>
  );
}

export function AdminPage() {
  const admin = useAdmin();
  const [tab, setTab] = useState('overview');
  const [showGuide, setShowGuide] = useState(false);

  // Guia na primeira visita ao painel.
  useEffect(() => {
    if (!hasSeenAdminGuide()) setShowGuide(true);
  }, []);
  function closeGuide() { markAdminGuideSeen(); setShowGuide(false); }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-5 py-8 sm:py-10">
      <AdminGuide open={showGuide} onClose={closeGuide} />
      <div className="flex items-center gap-3 mb-6">
        <Shield className="text-fm-green" size={26} />
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-fm-green-dark flex-1">Administração</h1>
        <button onClick={() => setShowGuide(true)} className="btn btn-ghost text-sm" title="Como funciona o painel">
          <HelpCircle size={16} /> Ajuda
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-fm-border">
        <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')} icon={LayoutDashboard}>Visão geral</TabBtn>
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={Users}>Utilizadores</TabBtn>
        <TabBtn active={tab === 'billing'} onClick={() => setTab('billing')} icon={Wallet}>Faturação</TabBtn>
        <TabBtn active={tab === 'import'} onClick={() => setTab('import')} icon={Upload}>Importar inscritos</TabBtn>
        <TabBtn active={tab === 'allowlist'} onClick={() => setTab('allowlist')} icon={UserCheck}>Adicionados</TabBtn>
        <TabBtn active={tab === 'waitlist'} onClick={() => setTab('waitlist')} icon={ListChecks}>Lista de espera</TabBtn>
        <TabBtn active={tab === 'feedback'} onClick={() => setTab('feedback')} icon={MessageSquare}>Feedback</TabBtn>
        <TabBtn active={tab === 'audit'} onClick={() => setTab('audit')} icon={ScrollText}>Registo</TabBtn>
        <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')} icon={Settings}>Definições</TabBtn>
      </div>

      {admin.error && (
        <div className="bg-fm-danger/10 text-fm-danger text-sm rounded-lg px-4 py-3 mb-4">{admin.error}</div>
      )}

      {tab === 'overview' && <DashboardTab admin={admin} />}
      {tab === 'billing' && <BillingTab admin={admin} />}
      {tab === 'users' && <UsersTab admin={admin} />}
      {tab === 'import' && <ImportTab admin={admin} />}
      {tab === 'allowlist' && <AllowlistTab admin={admin} />}
      {tab === 'waitlist' && <WaitlistTab admin={admin} />}
      {tab === 'feedback' && <FeedbackTab admin={admin} />}
      {tab === 'audit' && <AuditTab admin={admin} />}
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
  const [sort, setSort] = useState({ key: 'created', dir: 'desc' });
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => { admin.loadUsers(); /* eslint-disable-next-line */ }, []);

  const reload = () => { admin.loadUsers(); admin.loadStats(); setSelectedIds(new Set()); };

  function toggleSort(key) {
    setSort((s) => s.key === key
      ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: (key === 'user' || key === 'state') ? 'asc' : 'desc' });
  }

  // Pesquisa em tempo real (filtro do lado do cliente sobre a lista carregada)
  const q = norm(search.trim());
  const filtered = admin.users.filter((u) => {
    if (q && !norm(`${u.email} ${u.full_name || ''}`).includes(q)) return false;
    if (filter === 'all') return true;
    const st = u.access?.state || 'none';
    if (filter === 'with_access') return u.access?.has_access;
    return st === filter;
  });

  const displayed = [...filtered].sort((a, b) => {
    const va = sortValue(a, sort.key), vb = sortValue(b, sort.key);
    const c = typeof va === 'string' ? va.localeCompare(vb, 'pt') : (va - vb);
    return sort.dir === 'asc' ? c : -c;
  });

  // Seleção em massa
  const allOnPage = displayed.length > 0 && displayed.every((u) => selectedIds.has(u.id));
  const someOnPage = displayed.some((u) => selectedIds.has(u.id));
  function toggleOne(id) {
    setSelectedIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelectedIds((p) => {
      const n = new Set(p);
      if (allOnPage) displayed.forEach((u) => n.delete(u.id));
      else displayed.forEach((u) => n.add(u.id));
      return n;
    });
  }

  function exportCsv() {
    const header = 'email,nome,estado,segmento,acesso_ate,inscrito\n';
    const body = displayed.map((u) =>
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

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-fm-text-mute" size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por email ou nome…" className="input pl-9 pr-9" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-fm-text-mute hover:text-fm-green-dark" title="Limpar pesquisa"><X size={16} /></button>
          )}
        </div>
        <button type="button" onClick={reload} className="btn btn-ghost" title="Recarregar do servidor"><RefreshCw size={16} /></button>
      </div>

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
        <button onClick={exportCsv} disabled={!displayed.length} className="btn btn-ghost text-sm disabled:opacity-50"><Download size={15} /> Exportar</button>
      </div>

      <StateLegend />

      <MassTools admin={admin} onDone={reload} />

      {selectedIds.size > 0 && (
        <BulkBar
          ids={[...selectedIds]}
          admin={admin}
          onApplied={() => { setSelectedIds(new Set()); admin.loadUsers(); admin.loadStats(); }}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      <div className="bg-fm-paper border border-fm-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-fm-ivory text-fm-text-mute text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 w-10"><CheckAll checked={allOnPage} indeterminate={someOnPage} onChange={toggleAll} /></th>
                <SortHeader label="Utilizador" k="user" sort={sort} onSort={toggleSort} className="text-left px-4 py-3" />
                <SortHeader label="Estado" k="state" sort={sort} onSort={toggleSort} className="text-left px-4 py-3" />
                <SortHeader label="Sims" k="sims" sort={sort} onSort={toggleSort} className="text-left px-4 py-3 hidden sm:table-cell" />
                <SortHeader label="Acesso até" k="until" sort={sort} onSort={toggleSort} className="text-left px-4 py-3 hidden md:table-cell" />
                <SortHeader label="Último acesso" k="last" sort={sort} onSort={toggleSort} className="text-left px-4 py-3 hidden lg:table-cell" />
                <SortHeader label="Inscrito" k="created" sort={sort} onSort={toggleSort} className="text-left px-4 py-3 hidden lg:table-cell" />
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {admin.loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-fm-text-mute">A carregar…</td></tr>}
              {!admin.loading && displayed.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-fm-text-mute">Sem resultados.</td></tr>}
              {displayed.map((u) => {
                const st = u.access?.state || 'none';
                const lbl = STATE_LABEL[st] || STATE_LABEL.none;
                return (
                  <tr key={u.id} className={`border-t border-fm-border hover:bg-fm-ivory/50 ${selectedIds.has(u.id) ? 'bg-fm-yellow/10' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleOne(u.id)} className="w-4 h-4 accent-fm-green cursor-pointer align-middle" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-fm-green-dark">{u.full_name || '—'}</div>
                      <div className="text-fm-text-mute text-xs">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${lbl.c}`}>{lbl.t}</span>
                      {u.is_admin && st !== 'admin' && <Crown size={12} className="inline ml-1 text-fm-yellow-dark" />}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-fm-text-soft tabular-nums">{u.simulations_count ?? 0}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-fm-text-soft">{fmtDate(u.access?.effective_end || u.trial_ends_at || u.access_until)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-fm-text-soft">{fmtDateTime(u.last_sign_in_at)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-fm-text-soft">{fmtDate(u.created_at)}</td>
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
          <span className="text-xs text-fm-text-mute flex-1 min-w-[160px]">Fechar o trial gratuito de todo o segmento (dia 28 jul). Termina o trial — quem já pagou mantém o acesso.</span>
          <button disabled={busy} onClick={() => run('Trial reaberto', () => admin.massUnlock(cohort), `Voltar a dar trial a TODOS do segmento "${cohort}"?`)} className="btn btn-ghost text-xs disabled:opacity-50"><Unlock size={14} /> Reabrir trial</button>
          <button disabled={busy} onClick={() => run('Trial terminado', () => admin.massLock(cohort), `Terminar o trial gratuito de TODOS do segmento "${cohort}"? Quem já pagou mantém o acesso.`)} className="btn text-xs bg-fm-danger text-white hover:opacity-90 disabled:opacity-50"><Lock size={14} /> Fechar trial</button>
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
        ? 'Acesso aplicado a uma conta que já existia. (Não enviámos convite.)'
        : 'Adicionado e convite enviado por email (se os emails automáticos estiverem ativos). Senão, avisa a pessoa para entrar em calc.finmed.pt/login.');
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

        <p className="help mt-3 flex items-start gap-1.5">
          <Mail size={13} className="mt-0.5 flex-shrink-0" />
          Envia um convite por email com o link para entrar (se os emails automáticos estiverem ativos). Caso contrário, avisa a pessoa para entrar em <strong>calc.finmed.pt/login</strong> com este email.
        </p>

        <div className="flex gap-2 mt-4">
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
          <p className="help mt-2">
            <strong>Suspender</strong>: bloqueia já, mesmo quem pagou — reversível.
            <strong> Terminar</strong>: encerra o trial; quem pagou mantém o acesso.
          </p>
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
          <p className="help mt-2 flex items-start gap-1.5">
            <Mail size={13} className="mt-0.5 flex-shrink-0" />
            Perto do fim do trial, a pessoa pode receber um email automático de aviso (se ativo).
          </p>
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
        <p className="help mb-4 flex items-start gap-1.5">
          <Mail size={13} className="mt-0.5 flex-shrink-0" />
          Envia emails: cada inscrito recebe um email de boas-vindas quando entra pela primeira vez (se os emails automáticos estiverem ativos).
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
// TAB: REGISTO (auditoria)
// ============================================================
const ACTION_LABEL = {
  suspend: 'Suspendeu', reactivate: 'Reativou',
  grant_admin: 'Tornou admin', revoke_admin: 'Removeu admin',
  set_trial: 'Definiu fim de trial', grant_access: 'Concedeu acesso',
  set_allowed: 'Alterou lista', delete_user: 'Eliminou conta',
  update_config: 'Alterou definições', update_access: 'Alterou acesso',
};

function AuditTab({ admin }) {
  useEffect(() => { admin.loadAudit(); /* eslint-disable-next-line */ }, []);

  function fmtDetail(d) {
    if (!d) return '';
    return Object.entries(d).map(([k, v]) => {
      if (v && typeof v === 'object' && 'para' in v) return `${k}: ${v.para ?? '—'}`;
      return `${k}: ${v}`;
    }).join(' · ');
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-fm-text-soft">{admin.audit.length} registo(s) — quem alterou acessos e quando</span>
        <button onClick={() => admin.loadAudit()} className="btn btn-ghost text-sm"><RefreshCw size={15} /> Atualizar</button>
      </div>
      <div className="bg-fm-paper border border-fm-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-fm-ivory text-fm-text-mute text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Quando</th>
              <th className="text-left px-4 py-3">Quem</th>
              <th className="text-left px-4 py-3">Ação</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Sobre</th>
            </tr>
          </thead>
          <tbody>
            {admin.audit.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-fm-text-mute">Sem registos ainda.</td></tr>}
            {admin.audit.map((a) => (
              <tr key={a.id} className="border-t border-fm-border align-top">
                <td className="px-4 py-2.5 text-fm-text-soft whitespace-nowrap">
                  {new Date(a.created_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-2.5 text-fm-text-soft">{a.actor_email || '—'}</td>
                <td className="px-4 py-2.5">
                  <span className="font-semibold text-fm-green-dark">{ACTION_LABEL[a.action] || a.action}</span>
                  {a.target_email && <span className="text-fm-text-mute"> · {a.target_email}</span>}
                </td>
                <td className="px-4 py-2.5 text-fm-text-mute text-xs hidden sm:table-cell">{fmtDetail(a.detail)}</td>
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

// ============================================================
// TAB: ADICIONADOS (allowlist)
// ============================================================
function AllowlistTab({ admin }) {
  const [search, setSearch] = useState('');
  const [reg, setReg] = useState('all'); // all | registered | pending
  const [sort, setSort] = useState({ key: 'created', dir: 'desc' });
  const [sel, setSel] = useState(() => new Set());

  useEffect(() => { admin.loadAllowed(); /* eslint-disable-next-line */ }, []);
  const reload = () => { admin.loadAllowed(); setSel(new Set()); };

  function toggleSort(k) {
    setSort((s) => s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: k === 'created' ? 'desc' : 'asc' });
  }
  function aVal(a, k) {
    switch (k) {
      case 'email': return (a.email || '').toLowerCase();
      case 'name': return (a.full_name || '').toLowerCase();
      case 'cohort': return (a.cohort || '').toLowerCase();
      case 'reg': return a.registered ? 1 : 0;
      default: return tsVal(a.created_at);
    }
  }

  const q = norm(search.trim());
  const filtered = (admin.allowed || []).filter((a) => {
    if (q && !norm(`${a.email} ${a.full_name || ''}`).includes(q)) return false;
    if (reg === 'registered') return a.registered;
    if (reg === 'pending') return !a.registered;
    return true;
  });
  const displayed = [...filtered].sort((x, y) => {
    const vx = aVal(x, sort.key), vy = aVal(y, sort.key);
    const c = typeof vx === 'string' ? vx.localeCompare(vy, 'pt') : (vx - vy);
    return sort.dir === 'asc' ? c : -c;
  });

  const allOn = displayed.length > 0 && displayed.every((a) => sel.has(a.email));
  const someOn = displayed.some((a) => sel.has(a.email));
  function toggleOne(e) { setSel((p) => { const n = new Set(p); n.has(e) ? n.delete(e) : n.add(e); return n; }); }
  function toggleAll() { setSel((p) => { const n = new Set(p); if (allOn) displayed.forEach((a) => n.delete(a.email)); else displayed.forEach((a) => n.add(a.email)); return n; }); }

  async function removeSel() {
    const emails = [...sel];
    if (!emails.length) return;
    if (!window.confirm(`Retirar ${emails.length} email(s) da lista de adicionados?\n\nDeixam de poder entrar. Quem já tiver acesso ativo (trial/pago) mantém-no até terminar — para cortar já, usa o separador Utilizadores.`)) return;
    try { await admin.removeAllowed(emails); setSel(new Set()); admin.loadAllowed(); }
    catch (e) { alert('Erro: ' + e.message); }
  }

  function exportCsv() {
    const header = 'email,nome,segmento,registado,adicionado\n';
    const body = displayed.map((a) => [a.email, (a.full_name || '').replace(/,/g, ' '), a.cohort || '', a.registered ? 'sim' : 'não', a.created_at].join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const el = document.createElement('a');
    el.href = URL.createObjectURL(blob); el.download = 'adicionados_finmed.csv'; el.click();
  }

  return (
    <div>
      <p className="text-sm text-fm-text-soft mb-4">
        Quem está autorizado a entrar (inscritos importados + adicionados à mão). "Registado" indica se a pessoa já criou conta na app.
      </p>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-fm-text-mute" size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por email ou nome…" className="input pl-9 pr-9" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-fm-text-mute hover:text-fm-green-dark" title="Limpar"><X size={16} /></button>}
        </div>
        <button type="button" onClick={reload} className="btn btn-ghost" title="Recarregar"><RefreshCw size={16} /></button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1.5">
          {[['all', 'Todos'], ['registered', 'Registados'], ['pending', 'Por entrar']].map(([k, label]) => (
            <button key={k} onClick={() => setReg(k)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${reg === k ? 'bg-fm-green text-white border-fm-green' : 'border-fm-border text-fm-text-soft hover:border-fm-green'}`}>{label}</button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-xs text-fm-text-mute">{displayed.length} de {(admin.allowed || []).length}</span>
        <button onClick={exportCsv} disabled={!displayed.length} className="btn btn-ghost text-sm disabled:opacity-50"><Download size={15} /> Exportar</button>
      </div>

      {sel.size > 0 && (
        <div className="sticky top-2 z-20 mb-3 bg-fm-green-dark text-white rounded-xl px-3 py-2.5 shadow-fm-lg flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm px-1">{sel.size} selecionado(s)</span>
          <div className="flex-1" />
          <button onClick={removeSel} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-fm-danger text-white hover:opacity-90"><Trash2 size={14} className="inline mr-1" /> Retirar da lista</button>
          <button onClick={() => setSel(new Set())} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20">Limpar</button>
        </div>
      )}

      <div className="bg-fm-paper border border-fm-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-fm-ivory text-fm-text-mute text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 w-10"><CheckAll checked={allOn} indeterminate={someOn} onChange={toggleAll} /></th>
                <SortHeader label="Email" k="email" sort={sort} onSort={toggleSort} className="text-left px-4 py-3" />
                <SortHeader label="Nome" k="name" sort={sort} onSort={toggleSort} className="text-left px-4 py-3 hidden sm:table-cell" />
                <SortHeader label="Segmento" k="cohort" sort={sort} onSort={toggleSort} className="text-left px-4 py-3 hidden md:table-cell" />
                <SortHeader label="Registado" k="reg" sort={sort} onSort={toggleSort} className="text-left px-4 py-3" />
                <SortHeader label="Adicionado" k="created" sort={sort} onSort={toggleSort} className="text-left px-4 py-3 hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-fm-text-mute">Sem adicionados.</td></tr>}
              {displayed.map((a) => (
                <tr key={a.email} className={`border-t border-fm-border hover:bg-fm-ivory/50 ${sel.has(a.email) ? 'bg-fm-yellow/10' : ''}`}>
                  <td className="px-4 py-3"><input type="checkbox" checked={sel.has(a.email)} onChange={() => toggleOne(a.email)} className="w-4 h-4 accent-fm-green cursor-pointer align-middle" /></td>
                  <td className="px-4 py-3 text-fm-green-dark font-medium">{a.email}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-fm-text-soft">{a.full_name || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-fm-text-mute text-xs">{a.cohort || '—'}</td>
                  <td className="px-4 py-3">
                    {a.registered
                      ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-fm-green/15 text-fm-green-dark">Sim</span>
                      : <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-fm-border text-fm-text-mute">Por entrar</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-fm-text-soft">{fmtDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB: FEEDBACK
// ============================================================
const FB_KIND = {
  bug: { t: 'Erro', icon: Bug, c: 'bg-fm-danger/15 text-fm-danger' },
  sugestao: { t: 'Sugestão', icon: Lightbulb, c: 'bg-fm-yellow/30 text-fm-green-dark' },
  outro: { t: 'Outro', icon: MessageSquare, c: 'bg-fm-border text-fm-text-mute' },
};

function FeedbackTab({ admin }) {
  const [filter, setFilter] = useState('open');
  useEffect(() => { admin.loadFeedback(); /* eslint-disable-next-line */ }, []);

  async function toggle(f) {
    try { await admin.resolveFeedback(f.id, !f.resolved); admin.loadFeedback(); }
    catch (e) { alert('Erro: ' + e.message); }
  }

  const items = (admin.feedback || []).filter((f) => {
    if (filter === 'open') return !f.resolved;
    if (filter === 'all') return true;
    return f.kind === filter;
  });

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {[['open', 'Por resolver'], ['all', 'Todos'], ['bug', 'Erros'], ['sugestao', 'Sugestões'], ['outro', 'Outros']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${filter === k ? 'bg-fm-green text-white border-fm-green' : 'border-fm-border text-fm-text-soft hover:border-fm-green'}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={() => admin.loadFeedback()} className="btn btn-ghost text-sm"><RefreshCw size={15} /> Atualizar</button>
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="text-fm-text-mute text-sm py-10 text-center bg-fm-paper border border-fm-border rounded-xl">Sem feedback.</div>}
        {items.map((f) => {
          const k = FB_KIND[f.kind] || FB_KIND.outro;
          const I = k.icon;
          return (
            <div key={f.id} className={`bg-fm-paper border border-fm-border rounded-xl p-4 ${f.resolved ? 'opacity-65' : ''}`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${k.c}`}><I size={12} /> {k.t}</span>
                <span className="text-xs text-fm-text-mute">{new Date(f.created_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm text-fm-text whitespace-pre-wrap mb-2 leading-relaxed">{f.message}</p>
              <div className="flex items-center justify-between gap-3 text-xs text-fm-text-mute">
                <span className="truncate">{f.email || '—'} · {f.page || '—'}</span>
                <button onClick={() => toggle(f)} className={`font-semibold whitespace-nowrap ${f.resolved ? 'text-fm-text-mute' : 'text-fm-green'} hover:underline`}>
                  {f.resolved ? 'Reabrir' : 'Marcar resolvido'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Componentes de dashboard
// ============================================================
function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="bg-fm-paper border border-fm-border rounded-xl p-4 fm-lift">
      <div className="flex items-center gap-1.5 text-fm-text-mute text-[11px] uppercase tracking-wide mb-1">
        {Icon && <Icon size={13} />} {label}
      </div>
      <div className={`font-display font-bold text-2xl ${accent || 'text-fm-green-dark'}`}>{value}</div>
      {sub && <div className="text-xs text-fm-text-mute mt-0.5">{sub}</div>}
    </div>
  );
}

function MiniBars({ data, valueKey, labelKey, color = 'bg-fm-green' }) {
  const vals = (data || []).map((d) => Number(d[valueKey]) || 0);
  const max = Math.max(1, ...vals);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {(data || []).map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group" title={`${d[labelKey]}: ${v}`}>
            <div className="text-[10px] font-semibold text-fm-green-dark mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{v}</div>
            <div className={`w-full ${color} rounded-t transition-all`} style={{ height: `${v > 0 ? Math.max(6, (v / max) * 100) : 0}%` }} />
            <div className="text-[9px] text-fm-text-mute mt-1 truncate w-full text-center">{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// TAB: VISÃO GERAL (utilização)
// ============================================================
function DashboardTab({ admin }) {
  useEffect(() => { admin.loadStats(); admin.loadUsage(); /* eslint-disable-next-line */ }, []);
  const s = admin.stats, u = admin.usage;
  if (!s || !u) return <div className="text-fm-text-mute text-sm py-12 text-center">A carregar…</div>;

  const scenName = { hpp: 'HPP c/ reinvest.', geral: 'Caso geral', pre1989: 'Pré-1989', estado: 'Venda ao Estado' };
  const scen = Object.entries(u.by_scenario || {}).map(([k, v]) => ({ k, v: Number(v) || 0 })).sort((a, b) => b.v - a.v);
  const scenMax = Math.max(1, ...scen.map((x) => x.v));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Utilizadores" value={u.total_users} icon={Users} />
        <StatCard label="Com acesso" value={s.with_access} accent="text-fm-green" icon={Crown} />
        <StatCard label="Em trial" value={s.trial} />
        <StatCard label="Ativos (7d)" value={u.active_7d} sub={`${u.active_30d} em 30 dias`} icon={TrendingUp} />
        <StatCard label="Simulações" value={u.total_sims} sub={`${u.sims_7d} esta semana`} />
        <StatCard label="Suspensos" value={s.suspended} accent="text-fm-danger" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-fm-paper border border-fm-border rounded-xl p-5">
          <h3 className="font-bold text-fm-green-dark text-sm mb-4">Inscrições — últimos 14 dias</h3>
          <MiniBars data={u.series} valueKey="signups" labelKey="d" color="bg-fm-green" />
        </div>
        <div className="bg-fm-paper border border-fm-border rounded-xl p-5">
          <h3 className="font-bold text-fm-green-dark text-sm mb-4">Simulações — últimos 14 dias</h3>
          <MiniBars data={u.series} valueKey="sims" labelKey="d" color="bg-fm-yellow" />
        </div>
      </div>

      <div className="bg-fm-paper border border-fm-border rounded-xl p-5">
        <h3 className="font-bold text-fm-green-dark text-sm mb-4">Simulações por cenário</h3>
        {scen.length === 0 ? (
          <p className="text-fm-text-mute text-sm">Sem simulações ainda.</p>
        ) : (
          <div className="space-y-2.5">
            {scen.map(({ k, v }) => (
              <div key={k} className="flex items-center gap-3">
                <div className="w-32 text-sm text-fm-text-soft">{scenName[k] || k}</div>
                <div className="flex-1 bg-fm-ivory rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-fm-green rounded-full transition-all" style={{ width: `${(v / scenMax) * 100}%` }} />
                </div>
                <div className="w-10 text-right text-sm font-semibold tabular-nums">{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB: FATURAÇÃO
// ============================================================
function BillingTab({ admin }) {
  useEffect(() => { admin.loadBilling(); /* eslint-disable-next-line */ }, []);
  const b = admin.billing;
  if (!b) return <div className="text-fm-text-mute text-sm py-12 text-center">A carregar…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Receita total" value={eur(b.total_revenue)} icon={Wallet} accent="text-fm-green" />
        <StatCard label="Compras" value={b.paid_count} sub={`${b.count_30d} nos últimos 30 dias`} icon={FileText} />
        <StatCard label="Receita 30 dias" value={eur(b.revenue_30d)} icon={TrendingUp} />
        <StatCard label="Subscrições ativas" value={b.active_subs} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-fm-paper border border-fm-border rounded-xl p-5 lg:col-span-2">
          <h3 className="font-bold text-fm-green-dark text-sm mb-4">Receita por mês (últimos 6)</h3>
          <MiniBars data={b.by_month} valueKey="revenue" labelKey="m" color="bg-fm-green" />
        </div>
        <div className="bg-fm-paper border border-fm-border rounded-xl p-5">
          <h3 className="font-bold text-fm-green-dark text-sm mb-4">Por plano</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-fm-text-soft">6 meses · 65 €</span>
              <span className="font-semibold tabular-nums">{b.count_6m} · {eur(b.rev_6m)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-fm-text-soft">Anual · 100 €</span>
              <span className="font-semibold tabular-nums">{b.count_12m} · {eur(b.rev_12m)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-fm-paper border border-fm-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-fm-border font-bold text-fm-green-dark text-sm">Pagamentos recentes</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-fm-ivory text-fm-text-mute text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Cliente</th>
                <th className="text-left px-4 py-2.5">Valor</th>
                <th className="text-left px-4 py-2.5">Data</th>
              </tr>
            </thead>
            <tbody>
              {(!b.recent || b.recent.length === 0) && <tr><td colSpan={3} className="px-4 py-8 text-center text-fm-text-mute">Ainda sem pagamentos.</td></tr>}
              {(b.recent || []).map((p, i) => (
                <tr key={i} className="border-t border-fm-border">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-fm-green-dark">{p.name || '—'}</div>
                    <div className="text-fm-text-mute text-xs">{p.email}</div>
                  </td>
                  <td className="px-4 py-2.5 font-semibold tabular-nums">{eur(p.amount)}</td>
                  <td className="px-4 py-2.5 text-fm-text-soft">{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-fm-text-mute">
        Os pagamentos aparecem aqui assim que o Stripe estiver ligado (ver PAGAMENTOS.md). Em modo de teste, os pagamentos de teste também surgem.
      </p>
    </div>
  );
}
