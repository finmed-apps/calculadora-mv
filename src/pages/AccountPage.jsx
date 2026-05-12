import { useState, useEffect } from 'react';
import { Crown, Mail, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useAccess } from '../hooks/useAccess';

export function AccountPage() {
  const { user, signOut } = useAuth();
  const access = useAccess(user?.id);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data));
  }, [user]);

  return (
    <main className="max-w-3xl mx-auto px-5 py-8 sm:py-12">
      <h1 className="font-display font-bold text-3xl text-fm-green-dark mb-6">A minha conta</h1>

      <div className="bg-fm-paper rounded-2xl border border-fm-border p-7 mb-5">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Mail size={18} /> Identificação
        </h2>
        <Row label="Email" value={user?.email} />
        <Row label="Conta criada em" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-PT') : '—'} />
      </div>

      <div className="bg-fm-paper rounded-2xl border border-fm-border p-7 mb-5">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Crown size={18} /> Plano
        </h2>
        <Row label="Estado" value={
          access.hasPaidAccess
            ? <span className="inline-flex items-center gap-1.5 bg-fm-yellow/30 text-fm-green-dark px-2.5 py-1 rounded-full text-xs font-bold"><Crown size={12} /> ATIVO</span>
            : <span className="text-fm-text-mute text-sm">Plano gratuito</span>
        } />
        {access.planKind && <Row label="Tipo" value={
          access.planKind === 'monthly' ? 'Mensal' :
          access.planKind === 'annual' ? 'Anual' :
          access.planKind === 'one_off_12m' ? 'Pagamento único (12 meses)' : access.planKind
        } />}
        {!access.hasPaidAccess && (
          <a href="/upgrade" className="btn btn-primary mt-2">Ver planos →</a>
        )}
      </div>

      <button onClick={signOut} className="btn btn-ghost text-fm-danger border-fm-danger/30 hover:bg-fm-danger/5">
        <LogOut size={16} /> Terminar sessão
      </button>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-fm-border last:border-0">
      <span className="text-fm-text-soft text-sm">{label}</span>
      <span className="font-semibold">{value || '—'}</span>
    </div>
  );
}
