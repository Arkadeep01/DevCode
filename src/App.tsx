import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Footer } from './components/Footer/Footer';
import { Navbar } from './components/Navbar/Navbar';
import { ScrollManager } from './components/ScrollManager/ScrollManager';
import { ToastProvider } from './components/Toast/ToastProvider';
import { HomePage } from './pages/Home/HomePage';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';
import { ROUTES } from './routes';
import './App.css';

const StudyPage = lazy(() =>
  import('./pages/Study/StudyPage').then((module) => ({ default: module.StudyPage })),
);

const PracticePage = lazy(() =>
  import('./pages/Practice/PracticePage').then((module) => ({ default: module.PracticePage })),
);

export function App() {
  return (
    <ToastProvider>
      <Navbar />
      <main className="app-main">
        <ScrollManager />
        <Suspense
          fallback={
            <div className="app-loading" role="status">
              Loading…
            </div>
          }
        >
          <Routes>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.study} element={<StudyPage />} />
            <Route path={ROUTES.practice} element={<PracticePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </ToastProvider>
  );
}
