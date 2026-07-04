import { useEffect } from 'react';
import { ChapterRail } from '../components/ChapterRail';
import { Masthead } from '../components/Chrome';
import { LessonContent } from '../components/LessonContent';
import { routeHref } from '../lib/routing';
import type { ProgressApi } from '../lib/progress';
import type { Chapter } from '../types';
const ROMAN=['','I','II','III'];
export function ChapterPage({ chapter, chapters, progressApi, volume }: { chapter:Chapter; chapters:Chapter[]; progressApi:ProgressApi; volume:number }) {
 useEffect(()=>{progressApi.visitChapter(volume,chapter.number);window.scrollTo(0,0);},[volume,chapter.number,progressApi.visitChapter]);
 return <div className="page reader-page"><Masthead/><div className="reader-grid"><ChapterRail chapters={chapters} active={chapter.number} volume={volume}/><main className="chapter-reading"><div className="breadcrumb">Volume {ROMAN[volume]} <span>•</span> Chapter {String(chapter.number).padStart(2,'0')}</div><h1>{chapter.title}</h1><div className="ornament-rule"><i/></div><LessonContent items={chapter.body}/><div className="test-cta-wrap"><a className="test-cta" href={routeHref({page:'quiz',volume,chapter:chapter.number})}><span>✒</span> Test Yourself</a></div></main><aside className="section-rail"><h2>In This Chapter</h2><ol><li className="done">Introduction</li><li className="active">Lesson &amp; Examples</li><li>Key Rules</li><li>Review</li><li>Exercises</li></ol><blockquote>“Language is the dress of thought.”<cite>— Samuel Johnson</cite></blockquote></aside></div></div>;
}
