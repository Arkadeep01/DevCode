import { describe, expect, it } from 'vitest';
import { BANK_COUNTS } from './bankCounts';
import { QUESTIONS, TRACKS } from './questions';
import { STUDY_TOPICS, TOPIC_CATEGORIES, countTopicsInCategory } from './studyTopics';

describe('BANK_COUNTS', () => {
  it('matches the question bank', () => {
    expect(BANK_COUNTS.totalQuestions).toBe(QUESTIONS.length);
    expect(BANK_COUNTS.totalTracks).toBe(TRACKS.length);
  });

  it('matches the study topic bank', () => {
    expect(BANK_COUNTS.totalTopics).toBe(STUDY_TOPICS.length);
    for (const category of TOPIC_CATEGORIES) {
      expect(BANK_COUNTS.topicsByCategory[category.id]).toBe(
        countTopicsInCategory(category.id),
      );
    }
  });
});
