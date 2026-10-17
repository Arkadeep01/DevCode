import type {
  DifficultyMode,
  QuestionCategory,
  SessionQuestion,
} from '../../types/question';

export type PracticePhase = 'setup' | 'quiz' | 'results';

export interface PracticeConfig {
  tracks: QuestionCategory[];
  difficulty: DifficultyMode;
  count: number;
  untimed: boolean;
}

export interface ReviewItem {
  question: SessionQuestion;
  selected: number | null;
  correct: boolean;
  flagged: boolean;
}

export interface FocusGroup {
  category: QuestionCategory;
  categoryLabel: string;
  areas: string[];
}

export interface CategoryScore {
  category: QuestionCategory;
  categoryLabel: string;
  correct: number;
  total: number;
}

export interface PracticeResult {
  score: number;
  total: number;
  pct: number;
  timeSec: number;
  unanswered: number;
  review: ReviewItem[];
  focusGroups: FocusGroup[];
  categories: CategoryScore[];
}
