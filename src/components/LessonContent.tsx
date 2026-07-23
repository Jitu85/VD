import type { BodyImage, BodyParagraph, BodyTable } from '../types';
import { getLessonHeadingId, isLessonHeading } from '../lib/chapter-sections';
import { getLessonListNumbers } from '../lib/lesson-numbering';

export function LessonContent({ items }: { items: Array<BodyParagraph | BodyTable | BodyImage> }) {
  const listNumbers = getLessonListNumbers(items);
  return <div className="lesson-content">{items.map((item, index) => {
    if (item.type === 'image') return <figure className="lesson-figure" key={`image-${index}`}><img src={item.src} alt={item.alt} loading="lazy" />{item.caption ? <figcaption>{item.caption}</figcaption> : null}</figure>;
    if (item.type === 'table') return <div className="lesson-table-wrap" key={`table-${index}`}><table><tbody>{item.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} dangerouslySetInnerHTML={{ __html: cell.html }} />)}</tr>)}</tbody></table></div>;
    if (isLessonHeading(item)) return <h2 id={getLessonHeadingId(index)} tabIndex={-1} key={index} dangerouslySetInnerHTML={{ __html: item.html }} />;
    if (item.isList) return <div className="lesson-list-item" key={index}><span>{listNumbers[index]}.</span><p dangerouslySetInnerHTML={{ __html: item.html }} /></div>;
    return <p key={index} dangerouslySetInnerHTML={{ __html: item.html }} />;
  })}</div>;
}
