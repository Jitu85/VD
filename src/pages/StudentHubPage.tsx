import { useEffect, useState } from 'react';
import { fetchPublicModules, fetchSession, logout, type PublicModule, type SessionUser } from '../lib/api';
import { routeHref } from '../lib/routing';

interface HubProgress { visited: string[]; completed: string[]; answered: string[]; lastChapter: string }

const FALLBACK_MODULES: PublicModule[] = [
  { code: 'A', title: 'English Grammar & Composition', description: '33 chapters · Interactive practice', status: 'published', routeSlug: 'grammar', sortOrder: 10 },
  { code: 'B', title: 'Learning Module B', description: 'New lessons are being prepared', status: 'coming_soon', routeSlug: 'module-b', sortOrder: 20 },
  { code: 'C', title: 'Learning Module C', description: 'New lessons are being prepared', status: 'coming_soon', routeSlug: 'module-c', sortOrder: 30 },
];

export function StudentHubPage({ progress }: { progress: HubProgress }) {
  const [modules, setModules] = useState(FALLBACK_MODULES);
  const [user, setUser] = useState<SessionUser | null>(null);
  const completed = progress.completed.length;
  const explored = progress.visited.length;
  const percent = Math.min(100, Math.round((completed / 33) * 100));
  const [volume, chapter] = (progress.lastChapter || '1-1').split('-').map(Number);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchPublicModules(), fetchSession()]).then(([items, session]) => {
      if (!active) return;
      if (items?.length) setModules(items);
      if (session.ok && session.data.user.role === 'student') setUser(session.data.user);
    });
    return () => { active = false; };
  }, []);

  const signOut = async () => {
    if (user) await logout();
    window.location.hash = routeHref({ page: 'landing' }).slice(1);
  };

  const name = user?.displayName.split(/\s+/)[0] || 'Guest';

  return <div className="student-hub">
    <header className="hub-header"><a className="hub-brand" href={routeHref({ page: 'landing' })}><span>VC</span><div><strong>Virtual Classroom</strong><small>A digital place where kids not just see and hear, but also interact.</small></div></a><nav><a className="active" href={routeHref({ page: 'hub' })}>Library</a><a href="#progress">My Progress</a><button type="button" onClick={signOut}>{user ? 'Sign out' : 'Leave guest session'}</button><b>Good day, {name}</b></nav></header>
    <main className="hub-main">
      <section className="hub-library"><h1>Choose Your Learning Module</h1><p>Continue your journey through knowledge, practice, and discovery.</p><div className="module-orbits">
        {modules.map((module) => {
          const available = module.status === 'published';
          const href = module.code === 'A' ? routeHref({ page: 'index' }) : routeHref({ page: 'module', module: module.code });
          return <a className={`module-orbit${available ? ' available' : ''}`} href={href} key={module.code}><span>{module.code}</span><strong>{module.title}</strong><small>{module.description}</small><em>{available ? 'Open Library' : 'View module'} &rarr;</em></a>;
        })}
      </div></section>
      <aside className="hub-progress" id="progress"><h2>Your Progress</h2><div className="progress-seal"><strong>{percent}%</strong><span>complete</span></div><dl><div><dt>Chapters explored</dt><dd>{explored} / 33</dd></div><div><dt>Chapters completed</dt><dd>{completed}</dd></div><div><dt>Questions answered</dt><dd>{progress.answered.length}</dd></div></dl><a href={routeHref({ page: 'chapter', volume: volume || 1, chapter: chapter || 1 })}>Continue where you left off &rarr;</a><blockquote>&ldquo;Language is the key that opens the door to knowledge.&rdquo;</blockquote></aside>
    </main>
    <footer className="landing-footer"><span>&loz;</span> Developed and designed by Abhijit Kumar Misra. <span>&loz;</span></footer>
  </div>;
}