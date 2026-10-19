import type { QuizAttempt } from '../types/question';

/** Existing keys are kept for backwards compatibility with saved user progress. */
export const STORAGE_KEYS = {
  mastered: 'devcode_study_mastered',
  bookmarks: 'devcode_study_bookmarks',
  quizHistory: 'devcode_quiz_history',
  theme: 'devcode_theme',
} as const;

/** Tab-scoped keys (sessionStorage) — cleared when the tab closes. */
export const SESSION_KEYS = {
  practiceDraft: 'devcode_practice_draft',
} as const;

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function readSessionJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeSessionJson(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function clearSessionKey(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readIdSet(key: string): Set<string> {
  const ids = readJson<unknown>(key, []);
  return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
}

export function writeIdSet(key: string, ids: Set<string>): void {
  writeJson(key, Array.from(ids));
}

export function readQuizHistory(): QuizAttempt[] {
  const history = readJson<unknown>(STORAGE_KEYS.quizHistory, []);
  return Array.isArray(history) ? (history as QuizAttempt[]) : [];
}

/** Persist a new attempt (newest first, capped at 20 — UI shows the last 5). */
export function saveQuizAttempt(attempt: QuizAttempt): void {
  writeJson(STORAGE_KEYS.quizHistory, [attempt, ...readQuizHistory()].slice(0, 20));
}

export function clearQuizHistory(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.quizHistory);
  } catch {
    /* ignore */
  }
}
