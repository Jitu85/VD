import { useEffect, useState } from 'react';
import { fetchPublicSettings } from '../lib/api';
import { routeHref } from '../lib/routing';

const slides = [
  { src: '/assets/landing/library-study.webp', alt: 'Students reading and writing together in a sunlit library' },
  { src: '/assets/landing/world-discovery.webp', alt: 'Students exploring geography together with an antique globe' },
  { src: '/assets/landing/science-discovery.webp', alt: 'Students conducting a classroom science experiment together' },
];

export function LandingPage() {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [guestEnabled, setGuestEnabled] = useState(() => localStorage.getItem('vc_guest_enabled') !== 'false');

  useEffect(() => {
    let active = true;
    void fetchPublicSettings().then((settings) => {
      if (active && settings) setGuestEnabled(settings.guestLoginEnabled);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % slides.length), 5500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const move = (direction: number) => setSlide((current) => (current + direction + slides.length) % slides.length);

  return <div className="landing-page">
    <header className="landing-header"><div className="landing-brand-mark" aria-hidden="true">VC</div><div><h1>Virtual Classroom</h1><p>A digital place where kids not just see and hear, but also interact.</p></div></header>
    <main className="landing-main">
      <section className="story-carousel" aria-roledescription="carousel" aria-label="Learning experiences"><div className="story-frame">
        {slides.map((item,index)=><img key={item.src} className={index===slide?'active':''} src={item.src} alt={index===slide?item.alt:''} aria-hidden={index!==slide}/>)}
        <button className="carousel-arrow previous" type="button" onClick={()=>move(-1)} aria-label="Previous slide"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button>
        <button className="carousel-arrow next" type="button" onClick={()=>move(1)} aria-label="Next slide"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>
        <div className="carousel-controls"><div className="slide-dots">{slides.map((_,index)=><button key={index} type="button" className={index===slide?'active':''} onClick={()=>setSlide(index)} aria-label={`Go to slide ${index+1}`} aria-current={index===slide?'true':undefined}/>)}</div><button className="pause-control" type="button" onClick={()=>setPaused((current)=>!current)} aria-pressed={paused}>{paused?'▶ Play':'Ⅱ Pause'}</button></div>
      </div></section>
      <section className="access-panel" aria-labelledby="welcome-heading"><div className="panel-ornament" aria-hidden="true">⌁</div><h2 id="welcome-heading">Welcome to<br/>Virtual Classroom</h2><div className="ornament-rule"><i/></div><p>Choose how you would like to begin.</p>
        <div className="access-actions"><a className="student-entry" href={routeHref({page:'student-login'})}>Login</a><a className="student-entry" href={routeHref({page:'register'})}>Sign-Up</a>{guestEnabled?<a className="primary" href={routeHref({page:'hub'})}>Continue as Guest <span>→</span></a>:<button className="guest-disabled" type="button" disabled>Guest Login Disabled</button>}<a className="admin-entry" href={routeHref({page:'admin-login'})}>Admin Login</a></div>
      </section>
    </main>
    <footer className="landing-footer"><span>⌁</span> Developed and designed by Abhijit Kumar Misra. <span>⌁</span></footer>
  </div>;
}
