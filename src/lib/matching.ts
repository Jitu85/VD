const PUNCTUATION = /[^\p{L}\p{N}\s]/gu;
const SPACE = /\s+/g;

interface AnswerMatchOptions {
  allowWordOrderVariation?: boolean;
}

export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(PUNCTUATION, ' ')
    .replace(SPACE, ' ')
    .trim();
}

function sortedTokens(value: string): string[] {
  return normalizeAnswer(value)
    .split(' ')
    .filter(Boolean)
    .sort();
}

function hasSameWords(actual: string, target: string): boolean {
  const actualTokens = sortedTokens(actual);
  const targetTokens = sortedTokens(target);
  return (
    actualTokens.length > 1
    && actualTokens.length === targetTokens.length
    && actualTokens.every((token, index) => token === targetTokens[index])
  );
}

function candidates(answer: string): string[] {
  const values = new Set([answer]);
  if (answer.includes('/')) {
    const pieces = answer.split('/').map((part) => part.trim()).filter(Boolean);
    pieces.forEach((piece) => values.add(piece));
  }
  const orPieces = answer.split(/\s+\(or\)\s+/i).map((part) => part.trim()).filter(Boolean);
  orPieces.forEach((piece) => values.add(piece));
  return [...values];
}

export function answersMatch(userAnswer: string, expected: string, options: AnswerMatchOptions = {}): boolean {
  const actual = normalizeAnswer(userAnswer);
  if (!actual) return false;
  return candidates(expected).some((candidate) => {
    const target = normalizeAnswer(candidate);
    return actual === target || Boolean(options.allowWordOrderVariation && hasSameWords(actual, target));
  });
}
