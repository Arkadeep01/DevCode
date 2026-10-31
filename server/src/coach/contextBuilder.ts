import type {
  CoachAnalytics,
  CoachContext,
  CoachContextInput,
  CoachContextQuestion,
  CoachMiss,
  CoachWeakTopic,
} from './types.js';

/**
 * Deterministic coach context builder (Layer B).
 *
 * Pure: no I/O, no LLM. It turns a resolved attempt (canonical answers already
 * looked up) into the coaching context the provider receives. All edge cases
 * (all-correct, all-skipped, empty) are handled without throwing.
 */

const EMPTY_ANALYTICS: CoachAnalytics = {
  focusAreas: [],
  weekly: { periodStart: '', periodEnd: '', attempts: 0, misses: 0, accuracy: null },
  trend: { currentAccuracy: null, previousAccuracy: null, improvement: null, declined: false },
  weakestTopics: [],
};

function dedupeByQuestionId(questions: CoachContextQuestion[]): CoachContextQuestion[] {
  const seen = new Set<string>();
  const resolved: CoachContextQuestion[] = [];
  for (const question of questions) {
    if (seen.has(question.questionId)) continue;
    seen.add(question.questionId);
    resolved.push(question);
  }
  return resolved;
}

function isMiss(question: CoachContextQuestion): boolean {
  if (question.selectedAnswer === null) return false;
  return question.correctAnswer === null || question.selectedAnswer !== question.correctAnswer;
}

function compareFocusAreas(a: string | null, b: string | null): number {
  const left = a ?? '';
  const right = b ?? '';
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function buildWeakTopics(misses: CoachMiss[]): CoachWeakTopic[] {
  const buckets = new Map<string, { focusArea: string | null; topicId: string | null; misses: number }>();

  for (const miss of misses) {
    const key = miss.focusArea ?? miss.questionId;
    const bucket = buckets.get(key) ?? { focusArea: miss.focusArea, topicId: miss.topicId, misses: 0 };
    bucket.misses += 1;
    if (bucket.topicId === null) bucket.topicId = miss.topicId;
    buckets.set(key, bucket);
  }

  const entries = [...buckets.values()]
    .filter((bucket) => bucket.misses > 0)
    .map((bucket) => ({
      topicId: bucket.topicId,
      focusArea: bucket.focusArea,
      misses: bucket.misses,
      severity: bucket.misses,
    }))
    .sort((a, b) => b.misses - a.misses || compareFocusAreas(a.focusArea, b.focusArea));

  const maxMisses = entries.length > 0 ? entries[0]?.misses ?? 0 : 0;

  return entries.map((entry, index) => ({
    topicId: entry.topicId,
    focusArea: entry.focusArea,
    misses: entry.misses,
    severity: maxMisses > 0 ? entry.misses / maxMisses : 0,
    priority: index + 1,
  }));
}

export function buildCoachContext(input: CoachContextInput): CoachContext {
  const questions = dedupeByQuestionId(input.questions);
  const misses: CoachMiss[] = [];
  const skipped: CoachContextQuestion[] = [];

  for (const question of questions) {
    if (question.selectedAnswer === null) {
      skipped.push(question);
      continue;
    }
    if (!isMiss(question)) continue;

    misses.push({
      questionId: question.questionId,
      topicId: question.topicId,
      focusArea: question.focusArea,
      selectedAnswer: question.selectedAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    });
  }

  const weakTopics = buildWeakTopics(misses);

  const analytics: CoachAnalytics = input.analytics ?? EMPTY_ANALYTICS;

  return {
    userId: input.userId,
    attemptId: input.attemptId,
    questions,
    misses,
    skipped,
    weakTopics,
    analytics,
  };
}