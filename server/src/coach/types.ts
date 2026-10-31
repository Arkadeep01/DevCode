/**
 * Shared coach domain types (Layer B / Layer F inputs).
 */

/** A question resolved against the canonical store before coaching. */
export interface CoachContextQuestion {
  questionId: string;
  /** Advisory client answer; null when the question was skipped. */
  selectedAnswer: number | null;
  /** Canonical correct option index resolved from the question store. */
  correctAnswer: number | null;
  explanation: string | null;
  focusArea: string | null;
  topicId: string | null;
  category: string | null;
}

export interface CoachContextInput {
  userId: number;
  attemptId: string | null;
  questions: CoachContextQuestion[];
  /** Deterministic learning analytics computed before the context is built. */
  analytics?: CoachAnalytics;
}

export interface CoachMiss {
  questionId: string;
  topicId: string | null;
  focusArea: string | null;
  category: string | null;
  selectedAnswer: number | null;
  correctAnswer: number | null;
  explanation: string | null;
}

export interface CoachWeakTopic {
  topicId: string | null;
  focusArea: string | null;
  category: string | null;
  misses: number;
  severity: number;
  priority: number;
}

export interface CoachContext {
  userId: number;
  attemptId: string | null;
  questions: CoachContextQuestion[];
  misses: CoachMiss[];
  skipped: CoachContextQuestion[];
  weakTopics: CoachWeakTopic[];
  analytics: CoachAnalytics;
}

/** Deterministic per-focus-area accuracy snapshot. */
export interface CoachFocusAreaStat {
  focusArea: string;
  topicId: string | null;
  attempts: number;
  misses: number;
  accuracy: number;
}

/** Aggregated weekly performance window. */
export interface CoachWindowStat {
  periodStart: string;
  periodEnd: string;
  attempts: number;
  misses: number;
  accuracy: number | null;
}

/** Point-in-time comparison between the current and the previous window. */
export interface CoachTrend {
  currentAccuracy: number | null;
  previousAccuracy: number | null;
  improvement: number | null;
  declined: boolean;
}

/** Full learning analytics snapshot handed to the AI provider. */
export interface CoachAnalytics {
  focusAreas: CoachFocusAreaStat[];
  weekly: CoachWindowStat;
  trend: CoachTrend;
  weakestTopics: CoachWeakTopic[];
}