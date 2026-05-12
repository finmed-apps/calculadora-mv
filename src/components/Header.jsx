import { Link, useNavigate } from 'react-router-dom';
import { LogOut, History, Crown } from 'lucide-react';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { useAuth } from '../hooks/useAuth';
import { useAccess } from '../hooks/useAccess';
import { useProfile } from '../hooks/useProfile';

export function Header() {
  const { user, signOut } = useAuth();
  const access = useAccess(user?.id);
  const { profile } = useProfile(user?.id);
  const nav = useNavigate();

  return (
    <header className="bg-fm-green text-white">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Logo variant="white" className="h-6 sm:h-7 w-auto" />
        </Link>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {access.hasPaidAccess ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 bg-fm-yellow/20 text-fm-yellow px-2.5 py-1 rounded-full text-xs font-bold">
                <Crown size={12} /> PRO
              </span>
            ) : (
              <Link to="/upgrade" className="hidden sm:inline-flex items-center gap-1.5 bg-fm-yellow text-fm-green-dark px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-fm-yellow-dark transition-colors">
                <Crown size={12} /> Fazer upgrade
              </Link>
            )}
            <Link to="/historico" className="p-2 rounded-lg hover:bg-fm-green-soft transition-colors" title="Histórico">
              <History size={18} />
            </Link>
            <Link to="/conta" className="hover:opacity-80 transition-opacity" title="A minha conta">
              <Avatar
                url={profile?.avatar_url}
                name={profile?.full_name}
                email={user.email}
                size={32}
                className="ring-2 ring-fm-green-soft"
              />
            </Link>
            <button
              onClick={async () => { await signOut(); nav('/'); }}
              className="p-2 rounded-lg hover:bg-fm-green-soft transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link to="/login" className="text-sm text-fm-yellow hover:text-white font-semibold">
            Entrar →
          </Link>
        )}
      </div>
    </header>
  );
}
