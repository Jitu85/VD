import { useEffect, useState } from 'react';
import { Masthead } from './components/Chrome';
import { catalog } from './data/catalog';
import { parseRoute } from './lib/routing';
import { useProgress } from './lib/progress';
import { ChapterPage } from './pages/ChapterPage';
import { IndexPage } from './pages/IndexPage';
import { LandingPage } from './pages/LandingPage';
import { QuizPage } from './pages/QuizPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { StudentLoginPage } from './pages/StudentLoginPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { StudentHubPage } from './pages/StudentHubPage';
import { ModulePlaceholderPage } from './pages/ModulePlaceholderPage';
import type { Route, VolumeData } from './types';
import './styles.css';

const loaders: Record<number, () => Promise<VolumeData>> = {
  1: () => import('./data/volume-1.json').then((module) => module.default as VolumeData),
  2: () => import('./data/volume-2.json').then((module) => module.default as VolumeData),
  3: () => import('./data/volume-3.json').then((module) => module.default as VolumeData),
};

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const [content, setContent] = useState<VolumeData | null>(null);
  const progressApi = useProgress();

  useEffect(() => {
    const update = () => setRoute(parseRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    document.title = route.page === 'landing' ? 'Virtual Classroom'
      : route.page === 'hub' ? 'My Learning — Virtual Classroom'
      : route.page === 'module' ? `Module ${route.module} — Virtual Classroom`
      : route.page === 'student-login' ? 'Student Login — Virtual Classroom'
      : route.page === 'register' ? 'Create Account — Virtual Classroom'
      : route.page === 'admin-login' ? 'Administrator Access — Virtual Classroom'
      : route.page === 'admin' ? 'Administration — Virtual Classroom'
      : 'Modern English Grammar & Composition';
  }, [route.page]);

  useEffect(() => {
    if (route.page === 'landing' || route.page === 'hub' || route.page === 'module' || route.page === 'index' || route.page === 'student-login' || route.page === 'register' || route.page === 'admin-login' || route.page === 'admin') {
      setContent(null);
      return;
    }
    let active = true;
    setContent(null);
    (loaders[route.volume] ?? loaders[1])().then((data) => {
      if (active) setContent(data);
    });
    return () => { active = false; };
  }, [route]);

  if (route.page === 'landing') return <LandingPage />;
  if (route.page === 'hub') return <StudentHubPage progress={progressApi.progress} />;
  if (route.page === 'module') return <ModulePlaceholderPage module={route.module} />;
  if (route.page === 'student-login') return <StudentLoginPage />;
  if (route.page === 'register') return <RegistrationPage />;
  if (route.page === 'admin-login') return <AdminLoginPage />;
  if (route.page === 'admin') return <AdminDashboardPage />;
  if (route.page === 'index') return <IndexPage volumes={catalog} progressApi={progressApi} />;
  if (!content) return <div className="page"><Masthead /><main className="loading-page"><span>❧</span><p>Opening Volume {['', 'I', 'II', 'III'][route.volume]}…</p></main></div>;
  const chapter = content.chapters.find((item) => item.number === route.chapter) ?? content.chapters[0];
  return route.page === 'quiz'
    ? <QuizPage volume={content.volume} chapter={chapter} progressApi={progressApi} requestedExercise={route.exercise} requestedQuestion={route.question} />
    : <ChapterPage volume={content.volume} chapter={chapter} chapters={content.chapters} progressApi={progressApi} />;
}
