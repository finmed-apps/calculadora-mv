import {
  X, Users, UserPlus, Upload, CalendarClock, Lock,
  ListChecks, ScrollText, Settings, Check,
} from 'lucide-react';

const STEPS = [
  {
    icon: Users,
    title: 'Utilizadores',
    body: 'A tua base. Pesquisa por email/nome, filtra por estado (em trial, pagos, suspensos…) e carrega em "Gerir" para suspender/reativar, marcar como pago, dar dias extra ou eliminar uma conta. No topo tens a visão geral com os totais.',
  },
  {
    icon: UserPlus,
    title: 'Adicionar utilizador',
    body: 'Dá acesso a um email avulso sem ficheiro: trial normal, ou acesso direto por X dias (atalhos de 6 meses / 1 ano) para casos VIP ou pagamentos feitos por fora.',
  },
  {
    icon: Upload,
    title: 'Importar inscritos',
    body: 'Carrega o CSV ou Excel exportado do Go High Level. Quem está na lista entra direto em acesso; quem não está vê uma página de "lista de espera".',
  },
  {
    icon: CalendarClock,
    title: 'Ferramentas de segmento',
    body: 'Dentro de Utilizadores. Faz operações a toda a gente de uma vez: dar dias extra, definir o fim de trial, ou — importante — usar esta secção para mudar a data a quem já se inscreveu (mudar nas Definições só afeta novos inscritos).',
  },
  {
    icon: Lock,
    title: 'Fechar o trial (dia 28 jul)',
    body: 'Em Ferramentas de segmento → "Fechar trial". Termina o acesso gratuito de toda a Masterclass de uma vez. Quem já pagou mantém o acesso; os restantes passam a ver os planos.',
  },
  {
    icon: ListChecks,
    title: 'Lista de espera',
    body: 'Os emails de quem tentou entrar sem estar inscrito. Podes exportar para CSV.',
  },
  {
    icon: ScrollText,
    title: 'Registo',
    body: 'O histórico de tudo o que foi alterado nos acessos: quem fez, sobre quem e quando. Serve de prova e de memória partilhada entre a equipa.',
  },
  {
    icon: Settings,
    title: 'Definições',
    body: 'Data de início e duração do trial, e o interruptor "Abrir ao público" (mantém DESLIGADO até abrirem oficialmente).',
  },
];

// Guia de utilização do painel admin (Marta / Luísa).
export function AdminGuide({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-fm-paper w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-fm-lg p-7 sm:p-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-fm-ivory text-fm-text-mute" title="Fechar">
          <X size={18} />
        </button>

        <h2 className="font-display font-bold text-2xl text-fm-green-dark mb-1">Bem-vinda ao painel 👋</h2>
        <p className="text-fm-text-soft mb-6">
          Este é o teu centro de controlo dos acessos à calculadora. Aqui fica, em
          poucas linhas, o que cada separador faz e a sequência do lançamento.
        </p>

        <div className="space-y-4">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="flex gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-fm-green/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="text-fm-green" size={17} />
                </div>
                <div>
                  <div className="font-semibold text-fm-green-dark text-sm">{s.title}</div>
                  <div className="text-fm-text-soft text-sm leading-relaxed">{s.body}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-7 pt-5 border-t border-fm-border bg-fm-ivory -mx-7 -mb-8 px-7 py-5 rounded-b-2xl">
          <div className="text-xs uppercase tracking-wide font-bold text-fm-text-mute mb-2">Sequência do lançamento</div>
          <ol className="text-sm text-fm-text-soft space-y-1 list-decimal pl-4">
            <li>Antes de 11 jul: <strong>Importar inscritos</strong> da Masterclass.</li>
            <li>Em <strong>Definições</strong>: confirmar a data de início do trial.</li>
            <li>Dia 28 jul: <strong>Ferramentas de segmento → Fechar trial</strong>.</li>
          </ol>
          <button onClick={onClose} className="btn btn-primary w-full justify-center mt-5"><Check size={16} /> Entendi, vamos a isto</button>
        </div>
      </div>
    </div>
  );
}

const KEY = 'fm_admin_onboarded_v1';
export function hasSeenAdminGuide() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
export function markAdminGuideSeen() {
  try { localStorage.setItem(KEY, '1'); } catch { /* ignora */ }
}
