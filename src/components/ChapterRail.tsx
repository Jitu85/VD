import type { Chapter } from '../types';
import { routeHref } from '../lib/routing';
const ROMAN = ['','I','II','III'];
export function ChapterRail({ chapters, active, volume }: { chapters: Chapter[]; active: number; volume: number }) {
  return <aside className="chapter-rail" aria-label={`Volume ${ROMAN[volume]} table of contents`}><div className="rail-heading"><span>Volume {ROMAN[volume]}</span><i /></div><h2>Table of Contents</h2><nav>{chapters.map((chapter) => <a key={chapter.number} className={chapter.number === active ? 'chapter-rail-link active' : 'chapter-rail-link'} href={routeHref({ page: 'chapter', volume, chapter: chapter.number })} aria-current={chapter.number === active ? 'page' : undefined}><span>{String(chapter.number).padStart(2,'0')}</span><strong>{chapter.title}</strong></a>)}</nav><a className="bookmark-link" href="#lesson-bookmark">▢ <span>View Bookmark</span></a></aside>;
}
