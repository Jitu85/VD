import { useEffect, useMemo, useState } from 'react';
import { Masthead } from '../components/Chrome';
import { answersMatch } from '../lib/matching';
import type { ProgressApi } from '../lib/progress';
import { getQuestionProgressState, type QuizResult } from '../lib/quiz-progress';
import { routeHref } from '../lib/routing';
import type { Chapter, Exercise, Question } from '../types';

interface FlatQuestion { question: Question; instruction: string; }
const flattenExercise = (exercise: Exercise): FlatQuestion[] => exercise.groups.flatMap((group) => group.items.map((question) => ({ question, instruction: group.instruction })));

function ClozeInput({ question, values, onChange }: { question: Question; values: string[]; onChange: (values: string[]) => void }) {
  const parts = question.prompt.split(/_{3,}|\b___\b/g);
  return <div className="cloze-passage">{parts.map((part, index) => <span key={index}><span>{part}</span>{index < parts.length - 1 ? <input aria-label={`Blank ${index + 1}`} value={values[index] ?? ''} onChange={(event) => { const next = [...values]; next[index] = event.target.value; onChange(next); }} /> : null}</span>)}</div>;
}

export function QuizPage({ volume, chapter, progressApi, requestedExercise, requestedQuestion }: { volume: number; chapter: Chapter; progressApi: ProgressApi; requestedExercise?: number; requestedQuestion?: number; }) {
  const initialExercise = chapter.exercises.findIndex((exercise) => exercise.number === requestedExercise);
  const [exerciseIndex, setExerciseIndex] = useState(initialExercise >= 0 ? initialExercise : 0);
  const [questionIndex, setQuestionIndex] = useState(Math.max(0, (requestedQuestion ?? 1) - 1));
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [clozeResponses, setClozeResponses] = useState<Record<string, string[]>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, QuizResult>>({});
  const exercise = chapter.exercises[exerciseIndex] ?? chapter.exercises[0];
  const questions = useMemo(() => flattenExercise(exercise), [exercise]);
  const safeQuestionIndex = Math.min(questionIndex, Math.max(0, questions.length - 1));
  const active = questions[safeQuestionIndex];
  const id = `${volume}-${chapter.number}-${exercise.number}-${safeQuestionIndex}`;

  useEffect(() => { progressApi.visitChapter(volume, chapter.number); window.scrollTo(0, 0); }, [volume, chapter.number, progressApi.visitChapter]);
  useEffect(() => { if (questionIndex !== safeQuestionIndex) setQuestionIndex(safeQuestionIndex); }, [questionIndex, safeQuestionIndex]);
  if (!active) return null;
  const { question, instruction } = active;
  const isCloze = question.inputType === 'cloze' && question.blanks?.length;

  const evaluate = (shouldReveal: boolean) => {
    const correct = isCloze
      ? question.blanks!.every((expected, index) => answersMatch((clozeResponses[id] ?? [])[index] ?? '', expected))
      : Boolean(question.answer && answersMatch(
        responses[id] ?? '',
        question.answer,
        { allowWordOrderVariation: question.inputType === 'textarea' },
      ));
    const result: QuizResult = correct ? 'correct' : 'incorrect';
    setResults((current) => ({ ...current, [id]: result }));
    if (shouldReveal || !correct) setRevealed((current) => ({ ...current, [id]: true }));
    progressApi.markAnswered(id, result);
    if (exerciseIndex === chapter.exercises.length - 1 && safeQuestionIndex === questions.length - 1) progressApi.completeChapter(volume, chapter.number);
  };

  const goTo = (nextExercise: number, nextQuestion: number) => {
    setExerciseIndex(nextExercise); setQuestionIndex(nextQuestion);
    const target = chapter.exercises[nextExercise];
    window.history.replaceState(null, '', routeHref({ page: 'quiz', volume, chapter: chapter.number, exercise: target.number, question: nextQuestion + 1 }));
    document.querySelector<HTMLElement>('.quiz-workspace')?.focus();
  };
  const next = () => safeQuestionIndex < questions.length - 1 ? goTo(exerciseIndex, safeQuestionIndex + 1) : exerciseIndex < chapter.exercises.length - 1 ? goTo(exerciseIndex + 1, 0) : undefined;
  const previous = () => safeQuestionIndex > 0 ? goTo(exerciseIndex, safeQuestionIndex - 1) : exerciseIndex > 0 ? goTo(exerciseIndex - 1, flattenExercise(chapter.exercises[exerciseIndex - 1]).length - 1) : undefined;

  return <div className="page quiz-page"><Masthead /><div className="quiz-grid">
    <aside className="exercise-rail" aria-label="Exercises"><div className="rail-flourish">⌁</div>{chapter.exercises.map((item, index) => <button key={item.number} type="button" className={index === exerciseIndex ? 'active' : ''} onClick={() => goTo(index, 0)}>Exercise {String(item.number).padStart(2, '0')}</button>)}<a href={routeHref({ page: 'chapter', volume, chapter: chapter.number })}>← Return to lesson</a></aside>
    <main className="quiz-workspace" tabIndex={-1}>
      <div className="breadcrumb">Volume {['','I','II','III'][volume]} <span>•</span> Chapter {String(chapter.number).padStart(2, '0')} <span>•</span> Test Yourself</div>
      <h1>{chapter.title}</h1><div className="quiz-meta"><span>Exercise {exerciseIndex + 1} of {chapter.exercises.length}</span><i /><span>Question {safeQuestionIndex + 1} of {questions.length}</span></div>
      <p className="instruction">{instruction}</p>
      {isCloze ? <ClozeInput question={question} values={clozeResponses[id] ?? []} onChange={(values) => setClozeResponses((current) => ({ ...current, [id]: values }))} /> : <><div className="question-prompt" dangerouslySetInnerHTML={{ __html: question.promptHtml }} /><textarea className={question.inputType === 'textarea' ? 'answer-field answer-field--large' : 'answer-field'} placeholder={question.inputType === 'textarea' ? 'Write your corrected passage here…' : 'Write your answer here…'} value={responses[id] ?? ''} onChange={(event) => setResponses((current) => ({ ...current, [id]: event.target.value }))} /></>}
      <div className="answer-actions"><button className={`primary${results[id] ? ` ${results[id]}` : ''}`} type="button" onClick={() => evaluate(false)}>{results[id] === 'correct' ? '✓ Correct' : results[id] === 'incorrect' ? 'Review Answer' : 'Check Answer'}</button><button className="secondary" type="button" onClick={() => evaluate(true)}>Show Answer</button></div>
      {revealed[id] ? <div className={results[id] === 'correct' ? 'answer-reveal correct' : 'answer-reveal'} role="status"><span aria-hidden="true">❧</span><div><small>{results[id] === 'correct' ? 'Correct answer' : 'Review your answer'}</small><p>{question.answer ?? 'This item is awaiting review.'}</p></div></div> : null}
      <div className="quiz-navigation"><button type="button" onClick={previous} disabled={exerciseIndex === 0 && safeQuestionIndex === 0}>← Previous</button><button type="button" onClick={next} disabled={exerciseIndex === chapter.exercises.length - 1 && safeQuestionIndex === questions.length - 1}>Next →</button></div>
    </main>
    <aside className="question-progress"><h2>Your Progress</h2><div className="question-dots">{questions.map((_, index) => {
      const itemId = `${volume}-${chapter.number}-${exercise.number}-${index}`;
      const result = results[itemId] ?? progressApi.progress.results[itemId];
      const state = getQuestionProgressState({
        current: index === safeQuestionIndex,
        result,
        answered: progressApi.progress.answered.includes(itemId),
      });
      return <button type="button" className={state.className} key={index} onClick={() => goTo(exerciseIndex, index)} aria-label={`Question ${index + 1}, ${state.status}`}>{index + 1}{state.marker ? <small aria-hidden="true">{state.marker}</small> : null}</button>;
    })}</div><a href={routeHref({ page: 'chapter', volume, chapter: chapter.number })}>♧ <span>Finish later</span></a></aside>
  </div></div>;
}
