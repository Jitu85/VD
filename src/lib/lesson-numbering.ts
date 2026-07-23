import type { BodyImage, BodyParagraph, BodyTable } from '../types';

type LessonItem = BodyParagraph | BodyTable | BodyImage;

export function getLessonListNumbers(items: LessonItem[]): Array<number | null> {
  let listNumber = 0;
  return items.map((item) => {
    if (item.type !== 'paragraph' || !item.isList) return null;
    listNumber += 1;
    return listNumber;
  });
}
