import type { CoachPracticeQuestion } from '../services/api';
import type { Question, QuestionCategory } from '../types/question';

/**
 * Validation for AI-generated practice questions (Layer I).
 *
 * A generated question has to satisfy exactly the same contract as a bank
 * question before it is allowed into the quiz engine: same category set, same
 * difficulty scale, at least two distinct options and a correct index that
 * points at one of them. Anything else is dropped instead of being repaired.
 */

export const QUESTION_CATEGORIES: readonly QuestionCategory[] = [
  'dsa',
  'system_design',
  'oop',
  'sql',
  'web',
  'os',
  'python',
  'cpp',
  'java',
  'javascript',
];

export const QUESTION_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

function isCategory(value: unknown): value is QuestionCategory {
  return (
    typeof value === 'string' &&
    (QUESTION_CATEGORIES as readonly string[]).includes(value)
  );
}

function isDifficulty(value: unknown): value is Question['difficulty'] {
  return (
    typeof value === 'string' &&
    (QUESTION_DIFFICULTIES as readonly string[]).includes(value)
  );
}

/** Type guard for the raw provider payload of one practice question. */
export function isCoachPracticeQuestion(value: unknown): value is CoachPracticeQuestion {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;

  if (typeof record.id !== 'string' || record.id.length === 0) return false;
  if (!isCategory(record.category)) return false;
  if (typeof record.categoryLabel !== 'string' || record.categoryLabel.length === 0) return false;
  if (!isDifficulty(record.difficulty)) return false;
  if (typeof record.question !== 'string' || record.question.length === 0) return false;
  if (record.codeSnippet !== null && typeof record.codeSnippet !== 'string') return false;
  if (typeof record.explanation !== 'string' || record.explanation.length === 0) return false;
  if (typeof record.focusArea !== 'string' || record.focusArea.length === 0) return false;

  if (!Array.isArray(record.options)) return false;
  const options = record.options;
  if (options.length < 2 || options.length > 6) return false;
  if (!options.every((option) => typeof option === 'string' && option.length > 0)) return false;

  const normalized = options.map((option) => option.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) return false;

  if (typeof record.correctIndex !== 'number') return false;
  if (!Number.isInteger(record.correctIndex)) return false;
  if (record.correctIndex < 0 || record.correctIndex >= options.length) return false;

  return true;
}

/**
 * Converts a generated question into a bank-compatible `Question`.
 * Returns null when the question does not satisfy the Question contract.
 */
export function toBankQuestion(question: CoachPracticeQuestion): Question | null {
  if (!isCoachPracticeQuestion(question)) return null;

  return {
    id: question.id,
    category: question.category,
    categoryLabel: question.categoryLabel,
    difficulty: question.difficulty,
    question: question.question,
    codeSnippet: question.codeSnippet,
    options: [...question.options],
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    focusArea: question.focusArea,
    aiGenerated: true,
  };
}

/** Keeps only the generated questions that are safe to run in the quiz engine. */
export function toBankQuestions(questions: CoachPracticeQuestion[]): Question[] {
  return questions
    .map(toBankQuestion)
    .filter((question): question is Question => question !== null);
}
