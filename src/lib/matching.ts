const PUNCTUATION = /[^\p{L}\p{N}\s]/gu;
const SPACE = /\s+/g;
const APOSTROPHE = /[\u2018\u2019]/g;

type ContractionRule = {
  pattern: RegExp;
  replacements: (match: RegExpExecArray) => string[];
};

const contractionRules: ContractionRule[] = [
  { pattern: /\bwon't\b/i, replacements: () => ['will not'] },
  { pattern: /\bshan't\b/i, replacements: () => ['shall not'] },
  { pattern: /\bcan't\b/i, replacements: () => ['can not'] },
  { pattern: /\bain't\b/i, replacements: () => ['am not', 'is not', 'are not', 'has not', 'have not'] },
  { pattern: /\blet's\b/i, replacements: () => ['let us'] },
  { pattern: /\by'all\b/i, replacements: () => ['you all'] },
  {
    pattern: /\b([\p{L}]+)n't\b/iu,
    replacements: (match) => [`${match[1]} not`],
  },
  {
    pattern: /\b([\p{L}]+)'ve\b/iu,
    replacements: (match) => [`${match[1]} have`],
  },
  {
    pattern: /\b([\p{L}]+)'ll\b/iu,
    replacements: (match) => [`${match[1]} will`],
  },
  {
    pattern: /\b([\p{L}]+)'re\b/iu,
    replacements: (match) => [`${match[1]} are`],
  },
  { pattern: /\bi'm\b/i, replacements: () => ['i am'] },
  {
    pattern: /\b([\p{L}]+)'d\b/iu,
    replacements: (match) => [`${match[1]} had`, `${match[1]} would`],
  },
  {
    pattern: /\b(he|she|it|that|there|here|what|who|where|when|why|how)'s\b/i,
    replacements: (match) => [`${match[1]} is`, `${match[1]} has`],
  },
];

interface AnswerMatchOptions {
  allowWordOrderVariation?: boolean;
}

export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/\bcannot\b/g, 'can not')
    .replace(PUNCTUATION, ' ')
    .replace(SPACE, ' ')
    .trim();
}

function expandRule(value: string, rule: ContractionRule): string[] {
  const pending = [value];
  const expanded: string[] = [];

  while (pending.length > 0 && expanded.length + pending.length <= 64) {
    const candidate = pending.pop()!;
    const match = rule.pattern.exec(candidate);
    if (!match || match.index === undefined) {
      expanded.push(candidate);
      continue;
    }

    const before = candidate.slice(0, match.index);
    const after = candidate.slice(match.index + match[0].length);
    for (const replacement of rule.replacements(match)) {
      pending.push(`${before}${replacement}${after}`);
    }
  }

  return expanded.length > 0 ? expanded : [value];
}

function normalizedVariants(value: string): string[] {
  let variants = [value.normalize('NFKD').replace(APOSTROPHE, "'")];
  for (const rule of contractionRules) {
    variants = [...new Set(variants.flatMap((variant) => expandRule(variant, rule)))];
  }
  return [...new Set(variants.map(normalizeAnswer))];
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
  const actualVariants = normalizedVariants(userAnswer);
  if (actualVariants.every((actual) => !actual)) return false;
  return candidates(expected).some((candidate) => {
    const targetVariants = normalizedVariants(candidate);
    return actualVariants.some((actual) => targetVariants.some((target) => (
      actual === target || Boolean(options.allowWordOrderVariation && hasSameWords(actual, target))
    )));
  });
}
