export type AnswerSource = 'book' | 'generated' | 'missing';
export type InputType = 'text' | 'textarea' | 'cloze';
export interface Question { prompt: string; promptHtml: string; answer: string | null; answerSource: AnswerSource; inputType?: InputType; blanks?: string[]; }
export interface ExerciseGroup { instruction: string; items: Question[]; }
export interface Exercise { number: number; groups: ExerciseGroup[]; itemCount: number; answerCount: number; generatedAnswerCount: number; missingAnswerCount: number; }
export interface BodyParagraph { type: 'paragraph'; html: string; plain: string; isList: boolean; }
export interface BodyTable { type: 'table'; rows: Array<Array<{ plain: string; html: string }>>; }
export interface BodyImage { type: 'image'; src: string; alt: string; caption?: string; }
export interface Chapter { number: number; title: string; body: Array<BodyParagraph | BodyTable | BodyImage>; exercises: Exercise[]; hasOriginalAnswerSection: boolean; }
export interface VolumeData { volume: number; chapters: Chapter[]; }
export type Route = { page: 'landing' } | { page: 'hub' } | { page: 'module'; module: string } | { page: 'index' } | { page: 'student-login' } | { page: 'register' } | { page: 'admin-login' } | { page: 'admin' } | { page: 'chapter'; volume: number; chapter: number } | { page: 'quiz'; volume: number; chapter: number; exercise?: number; question?: number };
