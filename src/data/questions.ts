import type { Difficulty, Question, QuestionCategory, Track } from '../types/question';
import { DSA_QUESTIONS } from './questionBank/dsa';
import { SYSTEM_DESIGN_QUESTIONS } from './questionBank/systemDesign';
import { OOP_QUESTIONS } from './questionBank/oop';
import { SQL_QUESTIONS } from './questionBank/sql';
import { WEB_QUESTIONS } from './questionBank/web';
import { OS_QUESTIONS } from './questionBank/os';
import { PYTHON_QUESTIONS } from './questionBank/python';
import { CPP_QUESTIONS } from './questionBank/cpp';
import { JAVA_QUESTIONS } from './questionBank/java';
import { JAVASCRIPT_QUESTIONS } from './questionBank/javascript';

export const QUESTIONS: Question[] = [
  ...DSA_QUESTIONS,
  ...SYSTEM_DESIGN_QUESTIONS,
  ...OOP_QUESTIONS,
  ...SQL_QUESTIONS,
  ...WEB_QUESTIONS,
  ...OS_QUESTIONS,
  ...PYTHON_QUESTIONS,
  ...CPP_QUESTIONS,
  ...JAVA_QUESTIONS,
  ...JAVASCRIPT_QUESTIONS,
];

export const TRACKS: Track[] = [
  { key: 'dsa', label: 'Data Structures & Algorithms' },
  { key: 'system_design', label: 'System Design' },
  { key: 'oop', label: 'OOP & Architecture' },
  { key: 'sql', label: 'SQL & Databases' },
  { key: 'web', label: 'Web & APIs' },
  { key: 'os', label: 'Operating Systems & Networks' },
  { key: 'python', label: 'Python' },
  { key: 'cpp', label: 'Modern C++' },
  { key: 'java', label: 'Java Enterprise' },
  { key: 'javascript', label: 'Modern JavaScript & Node' },
];

export function countForTrack(
  key: QuestionCategory,
  difficulty: Difficulty | 'Mixed' = 'Mixed',
): number {
  return QUESTIONS.filter(
    (q) =>
      q.category === key &&
      (difficulty === 'Mixed' || q.difficulty === difficulty),
  ).length;
}

export function totalQuestionCount(): number {
  return QUESTIONS.length;
}
