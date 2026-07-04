import type { ReactNode } from 'react';
import { routeHref } from '../lib/routing';

function Quill() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="brand-quill">
      <path d="M27.5 3.5C19.8 4.3 12.2 9.7 8.8 17.4L5 27l2.2-1 2.7-6.1c2 .7 4.2.2 5.6-1.5-1.5.3-2.8.1-3.9-.5 4.2-.8 7.2-3 9.1-6.3-1.3.8-2.8 1.2-4.2 1.2 3.7-1.8 7.3-4.8 11-9.3Z" fill="currentColor" />
    </svg>
  );
}

export function Masthead({ compact = false, children }: { compact?: boolean; children?: ReactNode }) {
  return (
    <header className={compact ? 'masthead masthead--paper' : 'masthead'}>
      <a className="brand" href={routeHref({ page: 'landing' })} aria-label="Virtual Classroom home">
        <span className="brand-monogram">VC</span>
        <Quill />
        <span className="brand-name">Modern English<br />Grammar &amp; Composition</span>
      </a>
      <a className="back-index" href={routeHref(compact ? { page: 'landing' } : { page: 'index' })}>
        <span aria-hidden="true">←</span> {compact ? 'Back to Virtual Classroom' : 'Back to Page A Index'}
      </a>
      {children}
    </header>
  );
}

export function Footer() {
  return <footer className="site-footer"><span>⌁</span> Developed and designed by Abhijit Kumar Misra. <span>⌁</span></footer>;
}
