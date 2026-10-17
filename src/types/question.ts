export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type DifficultyMode = Difficulty | 'Mixed';

export type QuestionCategory =
  | 'dsa'
  | 'system_design'
  | 'oop'
  | 'sql'
  | 'web'
  | 'os'
  | 'python'
  | 'cpp'
  | 'java'
  | 'javascript';

export interface Question {
  id: string;
  category: QuestionCategory;
  categoryLabel: string;
  difficulty: Difficulty;
  question: string;
  codeSnippet: string | null;
  options: string[];
  /**
   * Index of the correct option in the source bank. Keep at 0 — the practice
   * engine shuffles options per session and remaps this index.
   */
  correctIndex: number;
  explanation: string;
  focusArea: string;
}

export interface Track {
  key: QuestionCategory;
  label: string;
}

/** A question prepared for one session: options already shuffled, index remapped. */
export interface SessionQuestion extends Omit<Question, 'correctIndex'> {
  correctIndex: number;
}

export interface QuizMeta {
  tracks: string[];
  difficulty: DifficultyMode;
  count: number;
  untimed: boolean;
}

export interface QuizAttempt {
  date: string;
  score: number;
  total: number;
  pct: number;
  tracks: string[];
  difficulty: DifficultyMode;
  count: number;
  timeSec: number;
}
