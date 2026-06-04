import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAccess } from '../hooks/useAccess';

// Protege a área /app/admin. A verificação real (is_admin) é feita no
// servidor em todas as RPCs admin — isto é apenas UX. Mesmo que alguém
// force a rota no browser, as RPCs recusam (app.require_admin()).
export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  const access = useAccess(user?.id);

  if (loading || access.loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-fm-text-mute text-sm">
        A carregar…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!access.isAdmin) return <Navigate to="/app" replace />;

  return children;
}
