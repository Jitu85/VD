import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getActiveChapterSectionId,
  getChapterSections,
  isLessonHeading,
} from '../src/lib/chapter-sections.ts';
import { getLessonListNumbers } from '../src/lib/lesson-numbering.ts';
import { getQuestionProgressState } from '../src/lib/quiz-progress.ts';

const volumeOne = JSON.parse(
  readFileSync(new URL('../src/data/volume-1.json', import.meta.url), 'utf8'),
);
const allVolumes = [1, 2, 3].map((volume) => JSON.parse(
  readFileSync(new URL(`../src/data/volume-${volume}.json`, import.meta.url), 'utf8'),
));

test('Chapter 9 and Chapter 10 list numbering starts at 1 and has no gaps', () => {
  for (const chapterNumber of [9, 10]) {
    const chapter = volumeOne.chapters.find((item) => item.number === chapterNumber);
    const displayed = getLessonListNumbers(chapter.body).filter((value) => value !== null);
    assert.equal(displayed[0], 1, `Chapter ${chapterNumber} should start at 1`);
    assert.deepEqual(
      displayed,
      Array.from({ length: displayed.length }, (_, index) => index + 1),
      `Chapter ${chapterNumber} should be sequential`,
    );
  }
});

test('chapter guide contains only real lesson headings between its two genuine destinations', () => {
  for (const volume of allVolumes) {
    for (const chapter of volume.chapters) {
      const sections = getChapterSections(chapter.body);
      const realHeadings = chapter.body.filter(isLessonHeading);

      assert.equal(sections[0].label, 'Introduction');
      assert.equal(sections.at(-1).label, 'Test Yourself');
      assert.equal(sections.length, realHeadings.length + 2);
      assert.equal(new Set(sections.map((section) => section.id)).size, sections.length);
      assert.equal(sections.some((section) => section.label === 'Key Rules'), false);
      assert.equal(sections.some((section) => section.label === 'Review'), false);
      assert.equal(sections.some((section) => section.label === 'Exercises'), false);
    }
  }
});

test('chapter guide varies with chapter structure and disambiguates repeated headings', () => {
  const chapterOne = volumeOne.chapters.find((item) => item.number === 1);
  const chapterTwelve = volumeOne.chapters.find((item) => item.number === 12);

  assert.deepEqual(
    getChapterSections(chapterOne.body).map((section) => section.label),
    ['Introduction', 'Examples', 'Test Yourself'],
  );
  assert.deepEqual(
    getChapterSections(chapterTwelve.body).map((section) => section.label),
    ['Introduction', 'Test Yourself'],
  );

  const repeated = getChapterSections([
    { type: 'paragraph', html: 'Examples:', plain: 'Examples:', isList: false },
    { type: 'paragraph', html: 'Examples:', plain: 'Examples:', isList: false },
  ]);
  assert.deepEqual(
    repeated.map((section) => section.label),
    ['Introduction', 'Examples', 'Examples 2', 'Test Yourself'],
  );
});

test('chapter marker does not skip to the final point on short chapters', () => {
  assert.equal(
    getActiveChapterSectionId(
      [
        { id: 'chapter-introduction', top: 110 },
        { id: 'chapter-test', top: 480 },
      ],
      900,
      0,
      900,
    ),
    'chapter-introduction',
  );

  assert.equal(
    getActiveChapterSectionId(
      [
        { id: 'chapter-introduction', top: -250 },
        { id: 'chapter-section-16', top: 490 },
        { id: 'chapter-test', top: 809 },
      ],
      900,
      361,
      1261,
    ),
    'chapter-section-16',
  );
});

test('quiz progress distinguishes correct, incorrect, and legacy answered states', () => {
  assert.deepEqual(
    getQuestionProgressState({ current: false, result: 'correct', answered: true }),
    { className: 'correct', marker: '✓', status: 'correct' },
  );
  assert.deepEqual(
    getQuestionProgressState({ current: false, result: 'incorrect', answered: true }),
    { className: 'incorrect', marker: '×', status: 'incorrect' },
  );
  assert.deepEqual(
    getQuestionProgressState({ current: false, answered: true }),
    { className: 'answered', marker: '', status: 'answered' },
  );
  assert.deepEqual(
    getQuestionProgressState({ current: true, result: 'incorrect', answered: true }),
    { className: 'current incorrect', marker: '×', status: 'incorrect' },
  );
});
