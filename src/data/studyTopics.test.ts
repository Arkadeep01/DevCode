import { describe, expect, it } from 'vitest';
import type { TopicTag } from '../types/topic';
import { STUDY_TOPICS } from './studyTopics';

const FILTER_TAGS: TopicTag[] = ['high_freq', 'company_fav', 'core'];

describe('topic tag distribution', () => {
  it('has 15 topics with unique ids', () => {
    expect(STUDY_TOPICS).toHaveLength(15);
    expect(new Set(STUDY_TOPICS.map((topic) => topic.id)).size).toBe(15);
  });

  it.each(FILTER_TAGS)('the %s filter matches a strict subset of topics', (tag) => {
    const matches = STUDY_TOPICS.filter((topic) => topic.tags.includes(tag));

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThan(STUDY_TOPICS.length);
  });

  it('keeps "high frequency" genuinely selective (6-8 of 15 topics)', () => {
    const highFrequency = STUDY_TOPICS.filter((topic) => topic.tags.includes('high_freq'));

    expect(highFrequency.length).toBeGreaterThanOrEqual(6);
    expect(highFrequency.length).toBeLessThanOrEqual(8);
  });
});
