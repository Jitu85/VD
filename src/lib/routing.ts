import type { Route } from '../types';

export function parseRoute(hash = window.location.hash): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { page: 'landing' };
  if (parts[0] === 'hub') return { page: 'hub' };
  if (parts[0] === 'module' && parts[1]) return { page: 'module', module: parts[1].toUpperCase() };
  if (parts[0] === 'grammar') return { page: 'index' };
  if (parts[0] === 'login') return { page: 'student-login' };
  if (parts[0] === 'register') return { page: 'register' };
  if (parts[0] === 'admin-login') return { page: 'admin-login' };
  if (parts[0] === 'admin') return { page: 'admin' };
  let volume = 1;
  let offset = 0;
  if (parts[0] === 'volume') {
    volume = Number(parts[1]);
    offset = 2;
  }
  if (parts[offset] === 'chapter') {
    const chapter = Number(parts[offset + 1]);
    if (Number.isInteger(volume) && Number.isInteger(chapter) && volume > 0 && chapter > 0) {
      if (parts[offset + 2] === 'quiz') return { page: 'quiz', volume, chapter, exercise: parts[offset + 3] ? Number(parts[offset + 3]) : undefined, question: parts[offset + 4] ? Number(parts[offset + 4]) : undefined };
      return { page: 'chapter', volume, chapter };
    }
  }
  return { page: 'index' };
}

export function routeHref(route: Route): string {
  if (route.page === 'landing') return '#/';
  if (route.page === 'hub') return '#/hub';
  if (route.page === 'module') return `#/module/${route.module.toLowerCase()}`;
  if (route.page === 'index') return '#/grammar';
  if (route.page === 'student-login') return '#/login';
  if (route.page === 'register') return '#/register';
  if (route.page === 'admin-login') return '#/admin-login';
  if (route.page === 'admin') return '#/admin';
  const base = `#/volume/${route.volume}/chapter/${route.chapter}`;
  if (route.page === 'chapter') return base;
  return `${base}/quiz${route.exercise ? `/${route.exercise}/${route.question ?? 1}` : ''}`;
}
