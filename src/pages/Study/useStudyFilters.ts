import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STUDY_TOPICS } from '../../data/studyTopics';
import type { StudyTopic, TopicCategory, TopicTag } from '../../types/topic';

export type CategoryFilter = TopicCategory | 'all';
export type TagFilter = TopicTag | 'all';

const CATEGORIES: TopicCategory[] = ['dsa', 'must_know', 'language', 'db_sys'];

function isCategory(value: string | null): value is TopicCategory {
  return value !== null && (CATEGORIES as string[]).includes(value);
}

export function useStudyFilters() {
  const [searchParams] = useSearchParams();
  const fromUrl = searchParams.get('category');

  const [category, setCategory] = useState<CategoryFilter>(
    isCategory(fromUrl) ? fromUrl : 'all',
  );
  const [tag, setTag] = useState<TagFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isCategory(fromUrl)) setCategory(fromUrl);
  }, [fromUrl]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return STUDY_TOPICS.filter((topic) => {
      if (category !== 'all' && topic.category !== category) return false;
      if (tag !== 'all' && !topic.tags.includes(tag)) return false;
      if (needle) {
        const haystack = `${topic.title} ${topic.takeaway}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [category, tag, query]);

  return {
    category,
    setCategory,
    tag,
    setTag,
    query,
    setQuery,
    filtered,
    total: STUDY_TOPICS.length,
  };
}

export type { StudyTopic };
