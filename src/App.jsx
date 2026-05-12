import { Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { RequireAuth } from './components/RequireAuth';
import { CalculatorPage } from './pages/CalculatorPage';
import { LoginPage } from './pages/LoginPage';
import { HistoryPage } from './pages/HistoryPage';
import { AccountPage } from './pages/AccountPage';
import { UpgradePage } from './pages/UpgradePage';

export default function App() {
  const location = useLocation();
  const hideHeader = location.pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col">
      {!hideHeader && <Header />}
      <Routes>
        <Route path="/" element={<CalculatorPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/historico" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="/conta" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/upgrade" element={<UpgradePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
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
