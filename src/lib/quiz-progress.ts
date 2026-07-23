export type QuizResult = 'correct' | 'incorrect';

export function getQuestionProgressState({
  current,
  result,
  answered,
}: {
  current: boolean;
  result?: QuizResult;
  answered: boolean;
}) {
  const classes = [current ? 'current' : '', result ?? (answered ? 'answered' : '')]
    .filter(Boolean)
    .join(' ');
  return {
    className: classes,
    marker: result === 'correct' ? '✓' : result === 'incorrect' ? '×' : '',
    status: result ?? (answered ? 'answered' : current ? 'current' : 'unanswered'),
  };
}
