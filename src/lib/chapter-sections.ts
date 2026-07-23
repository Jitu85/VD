import type { BodyImage, BodyParagraph, BodyTable } from '../types';

type LessonItem = BodyParagraph | BodyTable | BodyImage;

export interface ChapterSection {
  id: string;
  label: string;
  itemIndex?: number;
  kind: 'introduction' | 'lesson' | 'quiz';
}

export interface ChapterSectionPosition {
  id: string;
  top: number;
}

export function isLessonHeading(item: LessonItem): boolean {
  if (item.type !== 'paragraph') return false;
  const text = item.plain.trim();
  return text.length > 0 && text.length < 90 && (text.endsWith(':') || text.endsWith('：'));
}

export function getLessonHeadingId(itemIndex: number): string {
  return `chapter-section-${itemIndex}`;
}

function cleanSectionLabel(text: string): string {
  return text
    .replace(/[:：]\s*$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getChapterSections(items: LessonItem[]): ChapterSection[] {
  const repeatedLabels = new Map<string, number>();
  const lessonSections = items.flatMap<ChapterSection>((item, itemIndex) => {
    if (item.type !== 'paragraph' || !isLessonHeading(item)) return [];

    const baseLabel = cleanSectionLabel(item.plain);
    const occurrence = (repeatedLabels.get(baseLabel) ?? 0) + 1;
    repeatedLabels.set(baseLabel, occurrence);

    return [{
      id: getLessonHeadingId(itemIndex),
      label: occurrence === 1 ? baseLabel : `${baseLabel} ${occurrence}`,
      itemIndex,
      kind: 'lesson',
    }];
  });

  return [
    { id: 'chapter-introduction', label: 'Introduction', kind: 'introduction' },
    ...lessonSections,
    { id: 'chapter-test', label: 'Test Yourself', kind: 'quiz' },
  ];
}

export function getActiveChapterSectionId(
  positions: ChapterSectionPosition[],
  viewportHeight: number,
  scrollY: number,
  scrollHeight: number,
): string | undefined {
  if (positions.length === 0) return undefined;
  if (scrollHeight <= viewportHeight + 8) return positions[0].id;

  const readingLine = Math.min(viewportHeight * .34, 280);
  let activeId = positions[0].id;

  for (const position of positions) {
    if (position.top <= readingLine) activeId = position.id;
  }

  const atPageEnd = viewportHeight + scrollY >= scrollHeight - 8;
  if (!atPageEnd) return activeId;

  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const position of positions) {
    const distance = Math.abs(position.top - readingLine);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      activeId = position.id;
    }
  }
  return activeId;
}
