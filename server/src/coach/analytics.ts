import type { Attempt, Question } from '../db/schema.js';

export interface CoachAnalytics {
  topicPerformance: Record<string, { correct: number; total: number; accuracy: number }>;
  weeklyTrend: Array<{ week: string; accuracy: number; questionsCount: number }>;
  weakestTopics: Array<{ topicId: string; missCount: number; accuracy: number; focusArea: string }>;
  repeatedMistakes: Array<{ questionId: string; question: string; timesWrong: number; focusArea: string; commonWrongAnswer: number | null }>;
  topicsRequiringRevision: Array<{ topicId: string; mastery: number; lastAttempt: string; needsRevision: boolean }>;
}

export function calculateCoachAnalytics(
  attempts: Attempt[],
  questions: Question[]
): CoachAnalytics {
  const questionMap = new Map<number, Question>();
  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  const topicStats: Record<string, { correct: number; total: number }> = {};
  const weeklyStats: Record<string, { correct: number; total: number }> = {};
  const weakTopicsMap: Record<string, { missCount: number; total: number; focusArea: string }> = {};
  const mistakeMap: Record<string, { timesWrong: number; lastWrong: Date; wrongAnswers: number[] }> = {};

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  for (const attempt of attempts) {
    const question = questionMap.get(attempt.questionId!);
    if (!question) continue;

    const focusArea = attempt.focusArea || question.category;

    if (!topicStats[focusArea]) {
      topicStats[focusArea] = { correct: 0, total: 0 };
    }
    topicStats[focusArea].total++;
    if (attempt.isCorrect) {
      topicStats[focusArea].correct++;
    }

    const attemptDate = new Date(attempt.createdAt! * 1000);
    const weekKey = `Week of ${weekStart.toISOString().split('T')[0]}`;

    if (!weeklyStats[weekKey]) {
      weeklyStats[weekKey] = { correct: 0, total: 0 };
    }
    weeklyStats[weekKey].total++;
    if (attempt.isCorrect) {
      weeklyStats[weekKey].correct++;
    }

    if (!attempt.isCorrect && !attempt.isSkipped) {
      if (!weakTopicsMap[focusArea]) {
        weakTopicsMap[focusArea] = { missCount: 0, total: 0, focusArea };
      }
      weakTopicsMap[focusArea].missCount++;
      weakTopicsMap[focusArea].total++;

      if (!mistakeMap[question.id]) {
        mistakeMap[question.id] = { timesWrong: 0, lastWrong: attemptDate, wrongAnswers: [] };
      }
      mistakeMap[question.id].timesWrong++;
      mistakeMap[question.id].lastWrong = attemptDate;
      if (attempt.chosenAnswer !== null) {
        mistakeMap[question.id].wrongAnswers.push(attempt.chosenAnswer);
      }
    }
  }

  const topicPerformance: CoachAnalytics['topicPerformance'] = {};
  for (const [topic, stats] of Object.entries(topicStats)) {
    topicPerformance[topic] = {
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    };
  }

  const weeklyTrend: CoachAnalytics['weeklyTrend'] = [];
  for (const [week, stats] of Object.entries(weeklyStats)) {
    weeklyTrend.push({
      week,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      questionsCount: stats.total,
    });
  }

  const weakestTopics: CoachAnalytics['weakestTopics'] = [];
  for (const [topic, data] of Object.entries(weakTopicsMap)) {
    const accuracy = data.total > 0 ? ((data.total - data.missCount) / data.total) * 100 : 0;
    weakestTopics.push({
      topicId: topic,
      missCount: data.missCount,
      accuracy,
      focusArea: data.focusArea,
    });
  }

  weakestTopics.sort((a, b) => b.missCount - a.missCount);

  const repeatedMistakes: CoachAnalytics['repeatedMistakes'] = [];
  for (const [questionIdStr, data] of Object.entries(mistakeMap)) {
    const questionId = parseInt(questionIdStr);
    const question = questionMap.get(questionId);
    if (!question) continue;

    const answerCounts: Record<number, number> = {};
    for (const ans of data.wrongAnswers) {
      answerCounts[ans] = (answerCounts[ans] || 0) + 1;
    }
    let commonWrongAnswer: number | null = null;
    let maxCount = 0;
    for (const [ans, count] of Object.entries(answerCounts)) {
      if (count > maxCount) {
        maxCount = count;
        commonWrongAnswer = parseInt(ans);
      }
    }

    repeatedMistakes.push({
      questionId: question.slug,
      question: question.prompt,
      timesWrong: data.timesWrong,
      focusArea: question.category,
      commonWrongAnswer,
    });
  }

  repeatedMistakes.sort((a, b) => b.timesWrong - a.timesWrong);

  const topicsRequiringRevision: CoachAnalytics['topicsRequiringRevision'] = [];
  for (const [topic, stats] of Object.entries(topicStats)) {
    const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    const needsRevision = accuracy < 70;

    topicsRequiringRevision.push({
      topicId: topic,
      mastery: accuracy,
      lastAttempt: '',
      needsRevision,
    });
  }

  topicsRequiringRevision.sort((a, b) => a.mastery - b.mastery);

  return {
    topicPerformance,
    weeklyTrend,
    weakestTopics,
    repeatedMistakes,
    topicsRequiringRevision,
  };
}
