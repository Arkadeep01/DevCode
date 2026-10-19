import type { TopicCategory } from '../types/topic';

export const BANK_COUNTS = {
  totalQuestions: 97,
  totalTracks: 10,
  totalTopics: 15,
  topicsByCategory: {
    dsa: 4,
    must_know: 4,
    language: 4,
    db_sys: 3,
  },
} as const satisfies {
  totalQuestions: number;
  totalTracks: number;
  totalTopics: number;
  topicsByCategory: Record<TopicCategory, number>;
};
