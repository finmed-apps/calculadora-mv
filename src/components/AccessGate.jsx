import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAccess } from '../hooks/useAccess';
import { WaitlistPage } from '../pages/WaitlistPage';

// Envolve as páginas da app DEPOIS do RequireAuth.
// Decide o que o utilizador autenticado pode ver consoante o estado de acesso.
//
//   admin / active / trial / granted → app normal (children)
//   not_allowed                      → página de lista de espera (paywall)
//   suspended                        → ecrã de acesso suspenso
//   expired / none (já foi inscrito) → redireciona p/ /app/upgrade (preços)
//
// allowUpgrade=true nas rotas que devem ser sempre acessíveis a quem está
// autenticado e na lista (ex.: a própria página de upgrade e a conta).
export function AccessGate({ children, allowUpgrade = false }) {
  const { user, loading: authLoading } = useAuth();
  const access = useAccess(user?.id);
  const location = useLocation();

  // CRÍTICO: só decidimos depois de a sessão estar confirmada (user conhecido)
  // E o acesso desse user carregado. Caso contrário, há uma fração de segundo
  // em que ainda não sabemos quem é o utilizador e concluiríamos "sem acesso"
  // por engano, redirecionando indevidamente para a página de planos.
  if (authLoading || !user || access.loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-fm-text-mute text-sm">
        A verificar o teu acesso…
      </div>
    );
  }

  // Acesso pleno
  if (access.hasAccess) return children;

  // Suspenso pelo admin
  if (access.state === 'suspended') {
    return (
      <main className="max-w-xl mx-auto px-5 py-20 text-center">
        <h1 className="font-display text-3xl text-fm-green-dark mb-3">Acesso suspenso</h1>
        <p className="text-fm-text-soft mb-6">
          O teu acesso à calculadora está temporariamente suspenso. Se achas que é
          engano, fala com a equipa FINMED.
        </p>
        <a href="mailto:suporte@finmed.pt" className="btn btn-primary">Contactar a FINMED</a>
      </main>
    );
  }

  // Email não está na lista de inscritos → lista de espera (paywall)
  if (access.state === 'not_allowed') {
    return <WaitlistPage />;
  }

  // Está na lista mas o trial terminou (ou ainda não tem acesso ativo)
  // → mostrar os planos. Evita loop se já estamos numa rota de upgrade.
  if (allowUpgrade) return children;
  return <Navigate to="/app/upgrade" state={{ from: location.pathname }} replace />;
}
