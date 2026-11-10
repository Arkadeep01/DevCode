import type { Attempt, Question } from '../db/schema.js';
import type {
  CoachAnalytics as ContextCoachAnalytics,
  CoachFocusAreaStat,
  CoachTrend,
  CoachWindowStat,
  CoachWeakTopic,
} from './types.js';
import { resolveStudyTopicId } from './topicMap.js';

/**
 * Deterministic learning analytics (Layer F).
 *
 * The AI never computes accuracy or trends: every number in here is derived
 * from the persisted attempts with plain arithmetic, so the same history
 * always produces the same snapshot.
 *
 * Timezone policy: all week boundaries are computed in UTC. A week starts on
 * Monday 00:00:00.000 UTC and ends on the following Sunday 23:59:59.999 UTC.
 */

export interface CoachAnalytics {
  topicPerformance: Record<string, { correct: number; total: number; accuracy: number }>;
  weeklyTrend: Array<{ week: string; accuracy: number; questionsCount: number }>;
  weakestTopics: Array<{
    topicId: string;
    studyTopicId: string | null;
    missCount: number;
    accuracy: number;
    focusArea: string;
  }>;
  repeatedMistakes: Array<{
    questionId: string;
    question: string;
    timesWrong: number;
    focusArea: string;
    commonWrongAnswer: number | null;
  }>;
  topicsRequiringRevision: Array<{
    topicId: string;
    mastery: number;
    lastAttempt: string;
    needsRevision: boolean;
  }>;
}

/** Accuracy below this percentage marks a topic as needing revision. */
export const REVISION_THRESHOLD = 70;

/** Converts a drizzle timestamp (Date | unix seconds) into epoch milliseconds. */
export function toEpochMs(value: Date | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.getTime();
  // Values below 1e11 are unix seconds (drizzle `{ mode: 'timestamp' }` stores
  // seconds); anything larger is already milliseconds.
  return value < 1e11 ? value * 1000 : value;
}

/** Monday 00:00:00.000 UTC of the week that contains the given epoch ms. */
export function startOfUtcWeek(epochMs: number): number {
  const date = new Date(epochMs);
  const day = date.getUTCDay(); // 0 = Sunday
  const offsetToMonday = day === 0 ? 6 : day - 1;
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - offsetToMonday,
    0,
    0,
    0,
    0,
  );
}

/** ISO-ish week key, e.g. "2026-W07". Weeks start on Monday (UTC). */
export function utcWeekKey(epochMs: number): string {
  const weekStart = new Date(startOfUtcWeek(epochMs));
  const year = weekStart.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstWeekStart = startOfUtcWeek(firstThursday.getTime());
  const week = Math.round((weekStart.getTime() - firstWeekStart) / (7 * 86_400_000)) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

interface Bucket {
  correct: number;
  total: number;
}

export function calculateCoachAnalytics(
  attempts: Attempt[],
  questions: Question[],
): CoachAnalytics {
  const questionMap = new Map<number, Question>();
  for (const question of questions) {
    questionMap.set(question.id, question);
  }

  const topicStats: Record<string, Bucket> = {};
  const weeklyStats: Record<string, Bucket> = {};
  const missStats: Record<string, { missCount: number; focusArea: string; studyTopicId: string | null }> =
    {};
  const mistakeMap: Record<
    string,
    { timesWrong: number; lastWrong: number; wrongAnswers: number[] }
  > = {};
  const lastAttemptByTopic: Record<string, number> = {};

  for (const attempt of attempts) {
    if (attempt.questionId === null || attempt.questionId === undefined) continue;
    const question = questionMap.get(attempt.questionId);
    if (!question) continue;

    const focusArea = attempt.focusArea || question.category || 'unknown';
    const studyTopicId = resolveStudyTopicId(question.category, attempt.focusArea ?? question.focusArea);

    const bucket = (topicStats[focusArea] ??= { correct: 0, total: 0 });
    bucket.total += 1;
    if (attempt.isCorrect) bucket.correct += 1;

    const epochMs = toEpochMs(attempt.createdAt);
    if (epochMs !== null) {
      const weekKey = utcWeekKey(epochMs);
      const weekBucket = (weeklyStats[weekKey] ??= { correct: 0, total: 0 });
      weekBucket.total += 1;
      if (attempt.isCorrect) weekBucket.correct += 1;
      lastAttemptByTopic[focusArea] = Math.max(lastAttemptByTopic[focusArea] ?? 0, epochMs);
    }

    // A skipped question is not a miss: it carries no correctness signal.
    if (attempt.isCorrect || attempt.isSkipped) continue;

    const miss = (missStats[focusArea] ??= { missCount: 0, focusArea, studyTopicId });
    miss.missCount += 1;

    const mistake = (mistakeMap[question.slug] ??= {
      timesWrong: 0,
      lastWrong: epochMs ?? 0,
      wrongAnswers: [],
    });
    mistake.timesWrong += 1;
    if (epochMs !== null) mistake.lastWrong = Math.max(mistake.lastWrong, epochMs);
    if (attempt.chosenAnswer !== null) mistake.wrongAnswers.push(attempt.chosenAnswer);
  }

  const topicPerformance: CoachAnalytics['topicPerformance'] = {};
  for (const [topic, stats] of Object.entries(topicStats)) {
    topicPerformance[topic] = {
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    };
  }

  const weeklyTrend: CoachAnalytics['weeklyTrend'] = Object.entries(weeklyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, stats]) => ({
      week,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      questionsCount: stats.total,
    }));

  const weakestTopics: CoachAnalytics['weakestTopics'] = Object.values(missStats)
    .map((miss) => ({
      topicId: miss.focusArea,
      studyTopicId: miss.studyTopicId,
      missCount: miss.missCount,
      accuracy: topicPerformance[miss.focusArea]?.accuracy ?? 0,
      focusArea: miss.focusArea,
    }))
    .sort((a, b) => b.missCount - a.missCount || a.topicId.localeCompare(b.topicId));

  const repeatedMistakes: CoachAnalytics['repeatedMistakes'] = Object.entries(mistakeMap)
    .map(([questionId, data]) => {
      const question = questions.find((candidate) => candidate.slug === questionId);
      const answerCounts = new Map<number, number>();
      for (const answer of data.wrongAnswers) {
        answerCounts.set(answer, (answerCounts.get(answer) ?? 0) + 1);
      }

      let commonWrongAnswer: number | null = null;
      let maxCount = 0;
      for (const [answer, count] of answerCounts) {
        if (count > maxCount) {
          maxCount = count;
          commonWrongAnswer = answer;
        }
      }

      return {
        questionId,
        question: question?.prompt ?? '',
        timesWrong: data.timesWrong,
        focusArea: question?.category ?? 'unknown',
        commonWrongAnswer,
      };
    })
    .sort((a, b) => b.timesWrong - a.timesWrong || a.questionId.localeCompare(b.questionId));

  const topicsRequiringRevision: CoachAnalytics['topicsRequiringRevision'] = Object.entries(
    topicStats,
  )
    .map(([topic, stats]) => {
      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      const lastAttemptMs = lastAttemptByTopic[topic];
      return {
        topicId: topic,
        mastery: accuracy,
        lastAttempt: lastAttemptMs ? new Date(lastAttemptMs).toISOString() : '',
        needsRevision: stats.total > 0 && accuracy < REVISION_THRESHOLD,
      };
    })
    .sort((a, b) => a.mastery - b.mastery || a.topicId.localeCompare(b.topicId));

  return {
    topicPerformance,
    weeklyTrend,
    weakestTopics,
    repeatedMistakes,
    topicsRequiringRevision,
  };
}

/**
 * Converts the detailed analytics snapshot into the CoachContext analytics
 * shape consumed by the context builder and the AI provider. All values are
 * deterministic; zero denominators produce null accuracy rather than NaN.
 */
export function toContextCoachAnalytics(
  analytics: CoachAnalytics,
): ContextCoachAnalytics {
  const focusAreas: CoachFocusAreaStat[] = Object.entries(analytics.topicPerformance).map(
    ([focusArea, stats]) => ({
      focusArea,
      topicId: null,
      attempts: stats.total,
      misses: stats.total - stats.correct,
      accuracy: stats.total > 0 ? stats.accuracy : null,
    }),
  );

  const weeklyEntries = analytics.weeklyTrend;
  const current = weeklyEntries.length > 0 ? weeklyEntries[weeklyEntries.length - 1] : null;
  const previous = weeklyEntries.length > 1 ? weeklyEntries[weeklyEntries.length - 2] : null;

  const currentAccuracy = current ? current.accuracy : null;
  const previousAccuracy = previous ? previous.accuracy : null;

  const now = Date.now();
  const weekStart = startOfUtcWeek(now);
  const periodStart = new Date(weekStart).toISOString().slice(0, 10);
  const periodEnd = new Date(weekStart + 6 * 86_400_000 + 86_399_999).toISOString().slice(0, 10);

  const totalAnswered = weeklyEntries.reduce((sum, entry) => sum + entry.questionsCount, 0);
  const totalMisses = weeklyEntries.reduce(
    (sum, entry) => sum + Math.round((entry.questionsCount * (100 - entry.accuracy)) / 100),
    0,
  );

  const weekly: CoachWindowStat = {
    periodStart,
    periodEnd,
    attempts: totalAnswered,
    misses: totalMisses,
    accuracy:
      totalAnswered > 0
        ? weeklyEntries.reduce((sum, entry) => sum + entry.accuracy * entry.questionsCount, 0) /
          totalAnswered
        : null,
  };

  const trend: CoachTrend = {
    currentAccuracy,
    previousAccuracy,
    improvement:
      currentAccuracy !== null && previousAccuracy !== null
        ? currentAccuracy - previousAccuracy
        : null,
    declined:
      currentAccuracy !== null && previousAccuracy !== null
        ? currentAccuracy < previousAccuracy
        : false,
  };

  const maxMisses = analytics.weakestTopics.reduce(
    (max, topic) => Math.max(max, topic.missCount),
    0,
  );

  const weakestTopics: CoachWeakTopic[] = analytics.weakestTopics.map((topic, index) => ({
    topicId: topic.studyTopicId,
    focusArea: topic.focusArea,
    category: topic.focusArea,
    misses: topic.missCount,
    severity: maxMisses > 0 ? topic.missCount / maxMisses : 0,
    priority: index + 1,
  }));

  return { focusAreas, weekly, trend, weakestTopics };
}
