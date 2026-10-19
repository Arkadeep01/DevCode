import type { QuizAttempt, SessionQuestion } from '../../types/question';
import type {
  CategoryScore,
  FocusGroup,
  PracticeConfig,
  PracticeResult,
} from './practiceTypes';

export interface FinishPayload {
  result: PracticeResult;
  attempt: QuizAttempt;
}

/** Score a finished session: builds the results view model and the history entry. */
export function computeResult(
  questions: SessionQuestion[],
  answers: (number | null)[],
  flags: boolean[],
  startedAt: number,
  config: PracticeConfig,
): FinishPayload {
  const score = questions.reduce(
    (acc, question, index) => acc + (answers[index] === question.correctIndex ? 1 : 0),
    0,
  );
  const total = questions.length;
  const pct = Math.round((score / total) * 100);
  const timeSec = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));

  const review = questions.map((question, index) => ({
    question,
    selected: answers[index] ?? null,
    correct: answers[index] === question.correctIndex,
    flagged: flags[index] ?? false,
  }));

  const categoryMap = new Map<string, CategoryScore>();
  const focusMap = new Map<string, FocusGroup>();
  review.forEach((item) => {
    const entry = categoryMap.get(item.question.category) ?? {
      category: item.question.category,
      categoryLabel: item.question.categoryLabel,
      correct: 0,
      total: 0,
    };
    entry.total += 1;
    if (item.correct) entry.correct += 1;
    categoryMap.set(item.question.category, entry);

    if (!item.correct) {
      const group = focusMap.get(item.question.category) ?? {
        category: item.question.category,
        categoryLabel: item.question.categoryLabel,
        areas: [],
      };
      if (!group.areas.includes(item.question.focusArea)) {
        group.areas.push(item.question.focusArea);
      }
      focusMap.set(item.question.category, group);
    }
  });

  return {
    result: {
      score,
      total,
      pct,
      timeSec,
      unanswered: answers.filter((answer) => answer === null).length,
      review,
      focusGroups: Array.from(focusMap.values()),
      categories: Array.from(categoryMap.values()),
    },
    attempt: {
      date: new Date().toISOString(),
      score,
      total,
      pct,
      tracks: config.tracks,
      difficulty: config.difficulty,
      count: total,
      timeSec,
    },
  };
}
