import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { RequireAuth } from './components/RequireAuth';
import { LandingPage } from './pages/LandingPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { LoginPage } from './pages/LoginPage';
import { HistoryPage } from './pages/HistoryPage';
import { AccountPage } from './pages/AccountPage';
import { UpgradePage } from './pages/UpgradePage';

export default function App() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isLogin = location.pathname === '/login';

  // LP e Login têm header próprio (ou nenhum). App tem o Header standard.
  const showStandardHeader = !isLanding && !isLogin;

  return (
    <div className="min-h-screen flex flex-col">
      {showStandardHeader && <Header />}
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* APP (protegido) */}
        <Route path="/app" element={<RequireAuth><CalculatorPage /></RequireAuth>} />
        <Route path="/app/historico" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="/app/conta" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/app/upgrade" element={<RequireAuth><UpgradePage /></RequireAuth>} />

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
    </footer>
  );
}
