import { useCallback, useMemo, useState } from 'react';
const KEY = 'vc-grammar-progress-v2';
interface StoredProgress { visited: string[]; answered: string[]; completed: string[]; lastChapter: string; results: Record<string, 'correct' | 'incorrect'>; }
const EMPTY: StoredProgress = { visited: [], answered: [], completed: [], lastChapter: '1-1', results: {} };
function readProgress(): StoredProgress {
  try {
    const value = window.localStorage.getItem(KEY);
    if (value) {
      const parsed = JSON.parse(value);
      return { ...EMPTY, ...parsed, results: parsed.results ?? {} };
    }
    const legacy = window.localStorage.getItem('vc-grammar-progress-v1');
    if (legacy) {
      const old = JSON.parse(legacy);
      return { visited: (old.visited ?? []).map((n: number) => `1-${n}`), completed: (old.completed ?? []).map((n: number) => `1-${n}`), answered: (old.answered ?? []).map((id: string) => `1-${id}`), lastChapter: `1-${old.lastChapter ?? 1}`, results: {} };
    }
  } catch { /* use empty progress */ }
  return EMPTY;
}
export function chapterKey(volume: number, chapter: number) { return `${volume}-${chapter}`; }
export function useProgress() {
  const [progress, setProgress] = useState<StoredProgress>(readProgress);
  const update = useCallback((recipe: (current: StoredProgress) => StoredProgress) => setProgress((current) => { const next = recipe(current); window.localStorage.setItem(KEY, JSON.stringify(next)); return next; }), []);
  const visitChapter = useCallback((volume: number, chapter: number) => update((current) => { const key = chapterKey(volume, chapter); return { ...current, lastChapter: key, visited: current.visited.includes(key) ? current.visited : [...current.visited, key] }; }), [update]);
  const markAnswered = useCallback((id: string, result: 'correct' | 'incorrect') => update((current) => ({
    ...current,
    answered: current.answered.includes(id) ? current.answered : [...current.answered, id],
    results: { ...current.results, [id]: result },
  })), [update]);
  const completeChapter = useCallback((volume: number, chapter: number) => update((current) => { const key = chapterKey(volume, chapter); return { ...current, completed: current.completed.includes(key) ? current.completed : [...current.completed, key] }; }), [update]);
  return useMemo(() => ({ progress, visitChapter, markAnswered, completeChapter }), [progress, visitChapter, markAnswered, completeChapter]);
}
export type ProgressApi = ReturnType<typeof useProgress>;
