import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import Layout from './components/ui/Layout';

// Lazy loading das páginas para performance
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const SelectionPage = lazy(() => import('./features/evaluation/SelectionPage'));
const ReadingPage = lazy(() => import('./features/evaluation/ReadingPage'));
const ResultsPage = lazy(() => import('./features/evaluation/ResultsPage'));
const StudentsPage = lazy(() => import('./features/students/StudentsPage'));
const TextsPage = lazy(() => import('./features/texts/TextsPage'));
const HistoryPage = lazy(() => import('./features/history/HistoryPage'));

// Componente Loading Premium
const PageLoading = () => (
  <div className="animate-pulse" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
    Carregando interface...
  </div>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <PageLoading />;

  return (
    <Router>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Rota Pública */}
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />

          {/* Rotas Privadas (Wrap no Layout) */}
          <Route path="/" element={user ? <Layout user={user}><DashboardPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/selecao" element={user ? <Layout user={user}><SelectionPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/leitura/:alunoId" element={user ? <Layout user={user}><ReadingPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/resultados" element={user ? <Layout user={user}><ResultsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/resultados/:id" element={user ? <Layout user={user}><ResultsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/alunos/gerenciar" element={user ? <Layout user={user}><StudentsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/textos/gerenciar" element={user ? <Layout user={user}><TextsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/historico" element={user ? <Layout user={user}><HistoryPage /></Layout> : <Navigate to="/login" />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
