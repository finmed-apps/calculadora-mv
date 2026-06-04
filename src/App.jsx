import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { TrialBanner } from './components/TrialBanner';
import { RequireAuth } from './components/RequireAuth';
import { RequireAdmin } from './components/RequireAdmin';
import { AccessGate } from './components/AccessGate';
import { LandingPage } from './pages/LandingPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { LoginPage } from './pages/LoginPage';
import { HistoryPage } from './pages/HistoryPage';
import { AccountPage } from './pages/AccountPage';
import { UpgradePage } from './pages/UpgradePage';
import { AdminPage } from './pages/AdminPage';

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

export default function App() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isLogin = location.pathname === '/login';

  // LP e Login têm header próprio (ou nenhum). App tem o Header standard.
  const showStandardHeader = !isLanding && !isLogin;

  return (
    <div className="min-h-screen flex flex-col">
      {showStandardHeader && <Header />}
      {showStandardHeader && <TrialBanner />}
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* APP (protegido + gate de acesso) */}
        <Route path="/app" element={<RequireAuth><AccessGate><CalculatorPage /></AccessGate></RequireAuth>} />
        <Route path="/app/historico" element={<RequireAuth><AccessGate><HistoryPage /></AccessGate></RequireAuth>} />
        {/* Conta e Upgrade são sempre acessíveis a quem está autenticado e na lista,
            mesmo com trial expirado (allowUpgrade) — senão não conseguiriam comprar. */}
        <Route path="/app/conta" element={<RequireAuth><AccessGate allowUpgrade><AccountPage /></AccessGate></RequireAuth>} />
        <Route path="/app/upgrade" element={<RequireAuth><AccessGate allowUpgrade><UpgradePage /></AccessGate></RequireAuth>} />

        {/* ADMIN */}
        <Route path="/app/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />

        {/* Legacy redirects — quem tem links antigos não fica perdido */}
        <Route path="/historico" element={<Navigate to="/app/historico" replace />} />
        <Route path="/conta" element={<Navigate to="/app/conta" replace />} />
        <Route path="/upgrade" element={<Navigate to="/app/upgrade" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      {showStandardHeader && <Footer />}
    </div>
  );
}

function NotFound() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-16 text-center">
      <h1 className="font-display text-3xl text-fm-green-dark mb-2">Página não encontrada</h1>
      <p className="text-fm-text-soft mb-6">A página que procura não existe ou foi removida.</p>
      <a href="/" className="btn btn-primary">← Voltar ao início</a>
    </main>
  );
}

function Footer() {
  return (
    <footer className="bg-fm-green-dark text-fm-text-mute text-center py-7 mt-auto text-xs">
      FINMED · Calculadora informativa · {new Date().getFullYear()} · Valores estimativos
      <span className="block mt-1 opacity-60">v{APP_VERSION}</span>
    </footer>
  );
}
