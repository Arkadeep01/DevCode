import type { StudyTopic, TopicCategoryMeta } from '../types/topic';
import { DSA_TOPICS } from './topicBank/dsa';
import { MUST_KNOW_TOPICS } from './topicBank/mustKnow';
import { LANGUAGE_TOPICS } from './topicBank/language';
import { DB_SYS_TOPICS } from './topicBank/dbSys';

/** All 15 study topics, grouped by category file to keep each file small. */
export const STUDY_TOPICS: StudyTopic[] = [
  ...DSA_TOPICS,
  ...MUST_KNOW_TOPICS,
  ...LANGUAGE_TOPICS,
  ...DB_SYS_TOPICS,
];

export const TOPIC_CATEGORIES: TopicCategoryMeta[] = [
  { id: 'dsa', label: 'Core DSA Patterns' },
  { id: 'must_know', label: 'Must-Know Interview Questions' },
  { id: 'language', label: 'Language Masterclass' },
  { id: 'db_sys', label: 'Database & System Fundamentals' },
];

export function countTopicsInCategory(category: string): number {
  return STUDY_TOPICS.filter((topic) => topic.category === category).length;
}
