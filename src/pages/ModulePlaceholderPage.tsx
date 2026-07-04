import { routeHref } from '../lib/routing';

const descriptions:Record<string,string>={
  B:'A new collection of structured lessons and interactive activities is being prepared.',
  C:'Another learning journey is taking shape, with fresh subjects and guided practice.',
};

export function ModulePlaceholderPage({module}:{module:string}){
  const letter=['B','C'].includes(module)?module:'B';
  return <div className="module-placeholder-page">
    <header className="hub-header"><a className="hub-brand" href={routeHref({page:'landing'})}><span>VC</span><div><strong>Virtual Classroom</strong><small>A digital place where kids not just see and hear, but also interact.</small></div></a><nav><a href={routeHref({page:'hub'})}>← Back to Library</a><b>Module {letter}</b></nav></header>
    <main className="module-placeholder-main">
      <div className="module-placeholder-seal" aria-hidden="true">{letter}</div>
      <p className="module-placeholder-label">Learning Module {letter}</p>
      <h1>Content for Module {letter} is coming soon.</h1>
      <div className="ornament-rule"><i/></div>
      <p>{descriptions[letter]}</p>
      <p>Meanwhile, Module A remains fully available with English Grammar &amp; Composition lessons and interactive exercises.</p>
      <div className="module-placeholder-actions"><a href={routeHref({page:'hub'})}>Return to Learning Modules</a><a className="primary" href={routeHref({page:'index'})}>Open Module A</a></div>
    </main>
    <footer className="landing-footer"><span>⌁</span> Developed and designed by Abhijit Kumar Misra. <span>⌁</span></footer>
  </div>
}
