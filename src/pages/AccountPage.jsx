import { useState, useEffect, useRef } from 'react';
import { Crown, LogOut, Camera, Check } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';
import { useAccess } from '../hooks/useAccess';
import { useProfile } from '../hooks/useProfile';

export function AccountPage() {
  const { user, signOut } = useAuth();
  const access = useAccess(user?.id);
  const { profile, update, uploadAvatar } = useProfile(user?.id);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    } catch (err) {
      alert('Erro ao guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Imagem demasiado grande (máximo 2 MB).');
      return;
    }
    setUploading(true);
    try {
      await uploadAvatar(file);
    } catch (err) {
      alert('Erro ao carregar foto: ' + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-5 py-8 sm:py-12">
      <h1 className="font-display font-bold text-3xl text-fm-green-dark mb-6">A minha conta</h1>

      {/* IDENTIFICAÇÃO + foto */}
      <section className="bg-fm-paper rounded-2xl border border-fm-border p-7 sm:p-8 mb-5">
        <h2 className="font-bold text-lg mb-6">Identificação</h2>

        <div className="flex items-start gap-6 mb-7 flex-wrap">
          <div className="relative">
            <Avatar
              url={profile?.avatar_url}
              name={fullName}
              email={user?.email}
              size={88}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 bg-fm-green text-white rounded-full p-2 shadow-fm hover:bg-fm-green-dark transition-colors disabled:opacity-50"
              title="Carregar foto"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm text-fm-text-soft mb-1">Email</div>
            <div className="font-semibold mb-4">{user?.email}</div>
            <div className="text-sm text-fm-text-soft mb-1">Conta criada em</div>
            <div className="font-semibold">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </div>
            {uploading && <div className="text-fm-text-mute text-xs mt-3">A carregar foto…</div>}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-6 border-t border-fm-border">
          <div>
            <label className="label">Nome completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="O seu nome completo"
              className="input"
              maxLength={120}
            />
          </div>
          <div>
            <label className="label">Telemóvel (opcional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351 9XX XXX XXX"
              className="input"
              maxLength={30}
            />
            <div className="help">Usado apenas se desejar ser contactado pela equipa FINMED. Pode deixar em branco.</div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">
              {saving ? 'A guardar…' : 'Guardar alterações'}
            </button>
            {savedAt && (
              <span className="text-fm-success text-sm font-semibold inline-flex items-center gap-1">
                <Check size={14} /> Alterações guardadas
              </span>
            )}
          </div>
        </form>
      </section>

      {/* PLANO */}
      <section className="bg-fm-paper rounded-2xl border border-fm-border p-7 sm:p-8 mb-5">
        <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
          <Crown size={18} /> Plano
        </h2>
        <div className="flex items-center justify-between py-3 border-b border-fm-border">
          <span className="text-fm-text-soft text-sm">Estado</span>
          <span>
            {access.hasPaidAccess
              ? <span className="inline-flex items-center gap-1.5 bg-fm-yellow/30 text-fm-green-dark px-2.5 py-1 rounded-full text-xs font-bold"><Crown size={12} /> ATIVO</span>
              : <span className="text-fm-text-mute text-sm">Plano gratuito</span>
            }
          </span>
        </div>
        {access.planKind && (
          <div className="flex items-center justify-between py-3 border-b border-fm-border">
            <span className="text-fm-text-soft text-sm">Tipo</span>
            <span className="font-semibold">
              {access.planKind === 'one_off_6m' ? '6 meses (pagamento único)' :
               access.planKind === 'one_off_12m' ? 'Anual (pagamento único)' : access.planKind}
            </span>
          </div>
        )}
        {access.planRenewsAt && (
          <div className="flex items-center justify-between py-3 border-b border-fm-border">
            <span className="text-fm-text-soft text-sm">Válido até</span>
            <span className="font-semibold">
              {new Date(access.planRenewsAt).toLocaleDateString('pt-PT')}
            </span>
          </div>
        )}
        {!access.hasPaidAccess && (
          <a href="/upgrade" className="btn btn-primary mt-4">Ver planos →</a>
        )}
      </section>

      <button onClick={signOut} className="btn btn-ghost text-fm-danger border-fm-danger/30 hover:bg-fm-danger/5">
        <LogOut size={16} /> Terminar sessão
      </button>
    </main>
  );
}
