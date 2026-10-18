import { Route, Routes } from 'react-router-dom';
import { Footer } from './components/Footer/Footer';
import { Navbar } from './components/Navbar/Navbar';
import { ScrollManager } from './components/ScrollManager/ScrollManager';
import { ToastProvider } from './components/Toast/ToastProvider';
import { HomePage } from './pages/Home/HomePage';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';
import { PracticePage } from './pages/Practice/PracticePage';
import { StudyPage } from './pages/Study/StudyPage';
import { ROUTES } from './routes';
import './App.css';

export function App() {
  return (
    <ToastProvider>
      <Navbar />
      <main className="app-main">
        <ScrollManager />
        <Routes>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.study} element={<StudyPage />} />
          <Route path={ROUTES.practice} element={<PracticePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </ToastProvider>
  );
}
