import { useEffect, useMemo, useState } from 'react';
import { ChapterRail } from '../components/ChapterRail';
import { Masthead } from '../components/Chrome';
import { LessonContent } from '../components/LessonContent';
import { getActiveChapterSectionId, getChapterSections } from '../lib/chapter-sections';
import { routeHref } from '../lib/routing';
import type { ProgressApi } from '../lib/progress';
import type { Chapter } from '../types';

const ROMAN = ['', 'I', 'II', 'III'];
const VOLUME_ONE_MESSAGES: Record<number, string> = {
  1: 'Every alternative changes the direction of a sentence.',
  2: 'The infinitive gives an action room to become an idea.',
  3: 'A verb can act, name an action, or describe.',
  4: 'The right question word opens the right door.',
  5: 'A thoughtful response begins with careful listening.',
  6: 'Pronouns build bridges between ideas.',
  7: 'Good questions connect one thought to the next.',
  8: 'Clear beginnings make meaning easier to follow.',
  9: 'Usage becomes natural through attentive practice.',
  10: 'Prepositions show how words relate in time and space.',
  11: 'Phrasal verbs prove that small words can make big meanings.',
  12: 'A test is a map of what you know and what to explore next.',
};

export function ChapterPage({ chapter, chapters, progressApi, volume }: { chapter: Chapter; chapters: Chapter[]; progressApi: ProgressApi; volume: number }) {
  const sections = useMemo(() => getChapterSections(chapter.body), [chapter.body]);
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const sectionIds = sections.map((section) => section.id).join('|');

  useEffect(() => {
    progressApi.visitChapter(volume, chapter.number);
    setActiveSection(sections[0].id);
    window.scrollTo(0, 0);
  }, [volume, chapter.number, progressApi.visitChapter, sections]);

  useEffect(() => {
    let animationFrame = 0;
    const updateActiveSection = () => {
      const positions = sections.flatMap((section) => {
        const element = document.getElementById(section.id);
        return element ? [{ id: section.id, top: element.getBoundingClientRect().top }] : [];
      });
      const nextActive = getActiveChapterSectionId(
        positions,
        window.innerHeight,
        window.scrollY,
        document.documentElement.scrollHeight,
      );
      if (!nextActive) return;
      setActiveSection((current) => current === nextActive ? current : nextActive);
    };
    const queueUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        updateActiveSection();
      });
    };

    updateActiveSection();
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    return () => {
      window.removeEventListener('scroll', queueUpdate);
      window.removeEventListener('resize', queueUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [sectionIds, sections]);

  const goToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    setActiveSection(sectionId);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const message = volume === 1
    ? VOLUME_ONE_MESSAGES[chapter.number]
    : `Each careful step through “${chapter.title}” strengthens your command of English.`;

  return <div className="page reader-page"><Masthead/><div className="reader-grid"><ChapterRail chapters={chapters} active={chapter.number} volume={volume}/><main className="chapter-reading"><div id="chapter-introduction" className="breadcrumb">Volume {ROMAN[volume]} <span>•</span> Chapter {String(chapter.number).padStart(2, '0')}</div><h1>{chapter.title}</h1><div className="ornament-rule"><i/></div><LessonContent items={chapter.body}/><div id="chapter-test" className="test-cta-wrap"><a className="test-cta" href={routeHref({ page: 'quiz', volume, chapter: chapter.number })}><span>✒</span> Test Yourself</a></div></main><aside className="section-rail" aria-label="Chapter sections"><div className="section-rail-inner"><h2>In This Chapter</h2><ol>{sections.map((section) => <li className={activeSection === section.id ? 'active' : ''} key={section.id}><button type="button" aria-current={activeSection === section.id ? 'location' : undefined} aria-controls={section.id} onClick={() => goToSection(section.id)}>{section.label}</button></li>)}</ol><blockquote>“{message}”<cite>— Virtual Classroom</cite></blockquote></div></aside></div></div>;
}
