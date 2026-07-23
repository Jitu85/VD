import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  moduleBQuestions,
  type ModuleBDifficulty,
  type ModuleBQuestion,
  type ModuleBSubject,
} from '../data/module-b-questions';
import { routeHref } from '../lib/routing';

type GameMode = 'practice' | 'challenge' | 'daily' | 'examination';
type Stage = 'setup' | 'playing' | 'result';

interface AnswerRecord {
  question: ModuleBQuestion;
  selectedIndex: number | null;
  correct: boolean;
  points: number;
}

interface ModuleBProgress {
  rounds: number;
  answered: number;
  correct: number;
  xp: number;
  bestStreak: number;
  subjectRounds: Record<ModuleBSubject, number>;
  difficultyRounds: Record<ModuleBDifficulty, number>;
  badges: string[];
}

const PROGRESS_KEY = 'vc-module-b-progress-v1';
const EMPTY_PROGRESS: ModuleBProgress = {
  rounds: 0,
  answered: 0,
  correct: 0,
  xp: 0,
  bestStreak: 0,
  subjectRounds: { Mathematics: 0, Science: 0, Computer: 0 },
  difficultyRounds: { Easy: 0, Medium: 0, Hard: 0 },
  badges: [],
};

const subjects: Array<{ name: ModuleBSubject; symbol: string; label: string }> = [
  { name: 'Mathematics', symbol: '∑', label: 'Patterns, numbers and reasoning' },
  { name: 'Science', symbol: '⚗', label: 'Life, matter, energy and discovery' },
  { name: 'Computer', symbol: '⌘', label: 'AI, computing and digital thinking' },
];

const difficulties: Array<{ name: ModuleBDifficulty; number: string; note: string }> = [
  { name: 'Easy', number: '01', note: 'Build confidence with strong foundations.' },
  { name: 'Medium', number: '02', note: 'Apply ideas and connect the clues.' },
  { name: 'Hard', number: '03', note: 'Tackle advanced concepts and reasoning.' },
];

const modes: Array<{ name: GameMode; title: string; symbol: string; note: string }> = [
  { name: 'practice', title: 'Practice Trail', symbol: '✦', note: 'Learn calmly with an explanation after every answer.' },
  { name: 'challenge', title: 'Time Challenge', symbol: '⏱', note: 'Race a 30-second clock. Speed bonus applies only here.' },
  { name: 'daily', title: 'Daily Discovery', symbol: '☀', note: 'A repeatable five-question expedition for today.' },
  { name: 'examination', title: 'Examination', symbol: '✎', note: 'A focused knowledge check with immediate teaching feedback.' },
];

const readProgress = (): ModuleBProgress => {
  try {
    const stored = window.localStorage.getItem(PROGRESS_KEY);
    if (!stored) return EMPTY_PROGRESS;
    const parsed = JSON.parse(stored) as Partial<ModuleBProgress>;
    return {
      ...EMPTY_PROGRESS,
      ...parsed,
      subjectRounds: { ...EMPTY_PROGRESS.subjectRounds, ...parsed.subjectRounds },
      difficultyRounds: { ...EMPTY_PROGRESS.difficultyRounds, ...parsed.difficultyRounds },
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
    };
  } catch {
    return EMPTY_PROGRESS;
  }
};

const seedFromText = (text: string) => {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

const seededRandom = (seed: number) => () => {
  seed += 0x6D2B79F5;
  let value = seed;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};

const selectQuestions = (
  subject: ModuleBSubject,
  difficulty: ModuleBDifficulty,
  count: number,
  mode: GameMode,
) => {
  const pool = moduleBQuestions.filter((question) =>
    question.subject === subject && question.difficulty === difficulty);
  const date = new Date().toISOString().slice(0, 10);
  const random = seededRandom(seedFromText(
    mode === 'daily'
      ? `${date}-${subject}-${difficulty}`
      : `${Date.now()}-${subject}-${difficulty}-${Math.random()}`,
  ));
  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

const encouragingTitle = (percentage: number) => {
  if (percentage === 100) return 'Brilliant expedition!';
  if (percentage >= 80) return 'Excellent discovery!';
  if (percentage >= 60) return 'A strong journey!';
  return 'Every answer builds expertise!';
};

export function ModuleBPage() {
  const [stage, setStage] = useState<Stage>('setup');
  const [subject, setSubject] = useState<ModuleBSubject>('Mathematics');
  const [difficulty, setDifficulty] = useState<ModuleBDifficulty>('Easy');
  const [mode, setMode] = useState<GameMode>('practice');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<ModuleBQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestRoundStreak, setBestRoundStreak] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [progress, setProgress] = useState<ModuleBProgress>(readProgress);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  const currentQuestion = questions[questionIndex];
  const accuracy = progress.answered ? Math.round((progress.correct / progress.answered) * 100) : 0;
  const effectiveCount = mode === 'daily' ? 5 : count;
  const currentMode = modes.find((item) => item.name === mode) ?? modes[0];

  const finishSession = useCallback(() => {
    const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;
    const earned: string[] = [];
    if (progress.rounds === 0) earned.push('First Expedition');
    if (percentage >= 80) earned.push('Sharp Mind');
    if (percentage === 100) earned.push('Perfect Pathfinder');
    if (mode === 'challenge' && percentage >= 70) earned.push('Speed Scout');
    if ((progress.subjectRounds[subject] ?? 0) + 1 >= 3) earned.push(`${subject} Explorer`);

    const uniqueEarned = earned.filter((badge) => !progress.badges.includes(badge));
    const next: ModuleBProgress = {
      rounds: progress.rounds + 1,
      answered: progress.answered + questions.length,
      correct: progress.correct + score,
      xp: progress.xp + sessionXp,
      bestStreak: Math.max(progress.bestStreak, bestRoundStreak),
      subjectRounds: {
        ...progress.subjectRounds,
        [subject]: progress.subjectRounds[subject] + 1,
      },
      difficultyRounds: {
        ...progress.difficultyRounds,
        [difficulty]: progress.difficultyRounds[difficulty] + 1,
      },
      badges: [...progress.badges, ...uniqueEarned],
    };
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    setProgress(next);
    setNewBadges(uniqueEarned);
    setStage('result');
  }, [bestRoundStreak, difficulty, mode, progress, questions.length, score, sessionXp, subject]);

  const settleAnswer = useCallback((choice: number | null) => {
    if (checked || !currentQuestion) return;
    const correct = choice === currentQuestion.correctIndex;
    const basePoints = { Easy: 10, Medium: 20, Hard: 30 }[difficulty];
    const speedBonus = mode === 'challenge' && correct ? Math.max(0, secondsLeft) : 0;
    const points = correct ? basePoints + speedBonus : 0;
    const nextStreak = correct ? streak + 1 : 0;

    setSelectedIndex(choice);
    setChecked(true);
    setPointsAwarded(points);
    setScore((value) => value + (correct ? 1 : 0));
    setSessionXp((value) => value + points);
    setStreak(nextStreak);
    setBestRoundStreak((value) => Math.max(value, nextStreak));
    setAnswers((items) => [...items, { question: currentQuestion, selectedIndex: choice, correct, points }]);
  }, [checked, currentQuestion, difficulty, mode, secondsLeft, streak]);

  useEffect(() => {
    if (stage !== 'playing' || mode !== 'challenge' || checked) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [checked, mode, questionIndex, stage]);

  useEffect(() => {
    if (stage === 'playing' && mode === 'challenge' && secondsLeft === 0 && !checked) {
      settleAnswer(null);
    }
  }, [checked, mode, secondsLeft, settleAnswer, stage]);

  const startSession = () => {
    const selected = selectQuestions(subject, difficulty, effectiveCount, mode);
    setQuestions(selected);
    setQuestionIndex(0);
    setSelectedIndex(null);
    setChecked(false);
    setSecondsLeft(30);
    setScore(0);
    setStreak(0);
    setBestRoundStreak(0);
    setSessionXp(0);
    setPointsAwarded(0);
    setAnswers([]);
    setNewBadges([]);
    setStage('playing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextQuestion = () => {
    if (questionIndex >= questions.length - 1) {
      finishSession();
      return;
    }
    setQuestionIndex((value) => value + 1);
    setSelectedIndex(null);
    setChecked(false);
    setPointsAwarded(0);
    setSecondsLeft(30);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetToSetup = () => {
    setStage('setup');
    setQuestions([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resultPercentage = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const progressPercent = questions.length ? ((questionIndex + (checked ? 1 : 0)) / questions.length) * 100 : 0;

  return <div className="module-b-page">
    <header className="hub-header module-b-header">
      <a className="hub-brand" href={routeHref({ page: 'landing' })}><span>VC</span><div><strong>Virtual Classroom</strong><small>A digital place where kids not just see and hear, but also interact.</small></div></a>
      <nav><a href={routeHref({ page: 'hub' })}>← Learning Modules</a><b>Module B · Questions &amp; Answers</b></nav>
    </header>

    {stage === 'setup' ? <main className="module-b-setup">
      <section className="discovery-hero">
        <div className="discovery-compass" aria-hidden="true"><i>N</i><strong>?</strong><span /></div>
        <div>
          <p className="module-b-kicker">Module B · Discovery Adventure</p>
          <h1>Questions &amp; Answers</h1>
          <p>Choose one subject, follow the path from Easy to Hard, and turn every answer into a new discovery.</p>
          <div className="hero-stat-row">
            <span><strong>{moduleBQuestions.length}</strong> verified questions</span>
            <span><strong>{progress.rounds}</strong> expeditions</span>
            <span><strong>{progress.xp}</strong> knowledge points</span>
          </div>
        </div>
      </section>

      <div className="adventure-layout">
        <div className="adventure-builder">
          <section className="adventure-section" aria-labelledby="subject-heading">
            <div className="section-heading"><span>1</span><div><p>Choose your territory</p><h2 id="subject-heading">One subject at a time</h2></div></div>
            <div className="subject-cards">
              {subjects.map((item) => <button type="button" key={item.name} className={subject === item.name ? 'selected' : ''} onClick={() => setSubject(item.name)} aria-pressed={subject === item.name}>
                <span>{item.symbol}</span><strong>{item.name}</strong><small>{item.label}</small><em>{progress.subjectRounds[item.name]} completed</em>
              </button>)}
            </div>
          </section>

          <section className="adventure-section" aria-labelledby="difficulty-heading">
            <div className="section-heading"><span>2</span><div><p>Set your trail</p><h2 id="difficulty-heading">Easy → Medium → Hard</h2></div></div>
            <div className="difficulty-path">
              {difficulties.map((item, index) => <div className="difficulty-stop" key={item.name}>
                {index > 0 ? <i aria-hidden="true" /> : null}
                <button type="button" className={difficulty === item.name ? 'selected' : ''} onClick={() => setDifficulty(item.name)} aria-pressed={difficulty === item.name}>
                  <span>{item.number}</span><strong>{item.name}</strong><small>{item.note}</small><em>{progress.difficultyRounds[item.name]} trails</em>
                </button>
              </div>)}
            </div>
          </section>

          <section className="adventure-section" aria-labelledby="mode-heading">
            <div className="section-heading"><span>3</span><div><p>Choose how to explore</p><h2 id="mode-heading">Four ways to test yourself</h2></div></div>
            <div className="mode-cards">
              {modes.map((item) => <button type="button" key={item.name} className={mode === item.name ? 'selected' : ''} onClick={() => setMode(item.name)} aria-pressed={mode === item.name}>
                <span>{item.symbol}</span><strong>{item.title}</strong><small>{item.note}</small>
              </button>)}
            </div>
          </section>

          <section className="adventure-section compact-section" aria-labelledby="count-heading">
            <div className="section-heading"><span>4</span><div><p>Pack your expedition</p><h2 id="count-heading">Select the question count</h2></div></div>
            <div className="count-picker">
              {[5, 10].map((value) => <button type="button" key={value} className={effectiveCount === value ? 'selected' : ''} onClick={() => setCount(value)} disabled={mode === 'daily'}>{value}<small>questions</small></button>)}
              {mode === 'daily' ? <p>Daily Discovery uses five questions so the habit stays light and repeatable.</p> : null}
            </div>
          </section>
        </div>

        <aside className="expedition-card">
          <p>Your expedition</p>
          <div className="expedition-seal"><span>{subjects.find((item) => item.name === subject)?.symbol}</span></div>
          <h2>{subject}</h2>
          <dl>
            <div><dt>Trail</dt><dd>{difficulty}</dd></div>
            <div><dt>Mode</dt><dd>{currentMode.title}</dd></div>
            <div><dt>Questions</dt><dd>{effectiveCount}</dd></div>
            <div><dt>Feedback</dt><dd>Immediate</dd></div>
            <div><dt>Timer</dt><dd>{mode === 'challenge' ? '30 sec each' : 'No timer'}</dd></div>
          </dl>
          <button type="button" onClick={startSession}>Begin the adventure <span>→</span></button>
          <small>Questions stay within {subject}; subjects are never mixed in a session.</small>
          <div className="mini-achievements"><strong>Explorer record</strong><span>{accuracy}% lifetime accuracy</span><span>Best streak: {progress.bestStreak}</span><span>{progress.badges.length} badges earned</span></div>
        </aside>
      </div>
    </main> : null}

    {stage === 'playing' && currentQuestion ? <main className="question-adventure">
      <div className="question-topline">
        <div><p>{subject} · {difficulty}</p><h1>{currentMode.title}</h1></div>
        <div className="round-metrics">
          <span><small>Question</small><strong>{questionIndex + 1}/{questions.length}</strong></span>
          <span><small>Correct</small><strong>{score}</strong></span>
          <span><small>Streak</small><strong>{streak} ✦</strong></span>
          {mode === 'challenge' ? <span className={secondsLeft <= 10 ? 'timer urgent' : 'timer'}><small>Time</small><strong>{secondsLeft}s</strong></span> : null}
        </div>
      </div>
      <div className="adventure-progress" aria-label={`${Math.round(progressPercent)}% complete`}><i style={{ width: `${progressPercent}%` }} /></div>

      <div className="question-shell">
        <aside className="trail-map" aria-label="Question trail">
          <p>Discovery trail</p>
          <ol>{questions.map((question, index) => {
            const record = answers[index];
            const className = index === questionIndex ? 'current' : record?.correct ? 'correct' : record ? 'incorrect' : '';
            return <li className={className} key={question.id}><span>{index + 1}</span><small>{index < questionIndex ? (record?.correct ? 'Found' : 'Learned') : index === questionIndex ? 'You are here' : 'Ahead'}</small></li>;
          })}</ol>
          <button type="button" onClick={resetToSetup}>Leave expedition</button>
        </aside>

        <section className="question-card">
          <div className="question-label"><span>{currentQuestion.topic}</span><em>{currentQuestion.difficulty}</em></div>
          <h2>{currentQuestion.prompt}</h2>
          <p className="answer-instruction">{checked ? 'Study the explanation, then continue.' : 'Choose the best answer. Feedback appears immediately.'}</p>
          <div className="option-grid">
            {currentQuestion.options.map((option, index) => {
              const isCorrect = checked && index === currentQuestion.correctIndex;
              const isWrong = checked && selectedIndex === index && !isCorrect;
              return <button type="button" key={option} disabled={checked} onClick={() => settleAnswer(index)} className={`${isCorrect ? 'correct' : ''}${isWrong ? ' wrong' : ''}`}>
                <span>{String.fromCharCode(65 + index)}</span><strong>{option}</strong>{isCorrect ? <em>✓</em> : isWrong ? <em>×</em> : null}
              </button>;
            })}
          </div>

          {checked ? <div className={`answer-feedback ${selectedIndex === currentQuestion.correctIndex ? 'correct' : 'incorrect'}`} aria-live="polite">
            <div><span>{selectedIndex === currentQuestion.correctIndex ? '✓' : '!'}</span><div><strong>{selectedIndex === currentQuestion.correctIndex ? 'Excellent thinking!' : selectedIndex === null ? 'Time is up—keep exploring!' : 'A useful discovery!'}</strong><p>{currentQuestion.explanation}</p></div></div>
            <footer><span>{pointsAwarded ? `+${pointsAwarded} knowledge points${mode === 'challenge' ? ' including speed bonus' : ''}` : 'The explanation is your next clue.'}</span><button type="button" onClick={nextQuestion}>{questionIndex === questions.length - 1 ? 'See expedition result' : 'Next discovery'} →</button></footer>
          </div> : null}
        </section>
      </div>
    </main> : null}

    {stage === 'result' ? <main className="result-adventure">
      <section className="result-card">
        <div className="result-compass" aria-hidden="true">✦</div>
        <p>Expedition complete</p>
        <h1>{encouragingTitle(resultPercentage)}</h1>
        <p>You explored {subject} on the {difficulty} trail. Every reviewed answer has strengthened your map of the subject.</p>
        <div className="result-score"><strong>{resultPercentage}%</strong><span>{score} of {questions.length} correct</span></div>
        <div className="result-stats">
          <div><strong>{sessionXp}</strong><span>knowledge points</span></div>
          <div><strong>{bestRoundStreak}</strong><span>best streak</span></div>
          <div><strong>{answers.filter((answer) => !answer.correct).length}</strong><span>answers reviewed</span></div>
        </div>
        {newBadges.length ? <div className="badge-reveal"><p>New achievement{newBadges.length > 1 ? 's' : ''}</p>{newBadges.map((badge) => <span key={badge}>★ {badge}</span>)}</div> : null}
        <div className="result-actions"><button type="button" onClick={startSession}>Try another set</button><button type="button" onClick={resetToSetup}>Choose a new expedition</button><a href={routeHref({ page: 'hub' })}>Return to modules</a></div>
      </section>
      <section className="review-strip">
        <h2>Your discovery record</h2>
        <div>{answers.map((answer, index) => <article key={answer.question.id} className={answer.correct ? 'correct' : 'incorrect'}><span>{index + 1}</span><div><strong>{answer.question.topic}</strong><p>{answer.question.prompt}</p><small>{answer.correct ? 'Correct' : `Answer: ${answer.question.options[answer.question.correctIndex]}`}</small></div></article>)}</div>
      </section>
    </main> : null}

    <footer className="landing-footer"><span>⌁</span> Developed and designed by Abhijit Kumar Misra. <span>⌁</span></footer>
  </div>;
}
