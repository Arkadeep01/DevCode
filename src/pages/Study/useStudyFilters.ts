import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STUDY_TOPICS } from '../../data/studyTopics';
import type { TopicCategory, TopicTag } from '../../types/topic';

export type CategoryFilter = TopicCategory | 'all';
export type TagFilter = TopicTag | 'all';

const CATEGORIES: TopicCategory[] = ['dsa', 'must_know', 'language', 'db_sys'];

function isCategory(value: string | null): value is TopicCategory {
  return value !== null && (CATEGORIES as string[]).includes(value);
}

function readCategory(value: string | null): CategoryFilter {
  return isCategory(value) ? value : 'all';
}

export function useStudyFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL is the single source of truth for the category, so a refresh (or a
  // deep link) always restores exactly what the UI shows.
  const rawCategory = searchParams.get('category');
  const category = readCategory(rawCategory);

  // Normalize a stale or invalid ?category=... so the URL never lies.
  useEffect(() => {
    if (rawCategory === null || isCategory(rawCategory)) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('category');
        return next;
      },
      { replace: true },
    );
  }, [rawCategory, setSearchParams]);

  // Replace instead of push: picking filters should not stack history entries.
  const setCategory = useCallback(
    (next: CategoryFilter) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next === 'all') {
            params.delete('category');
          } else {
            params.set('category', next);
          }
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [tag, setTag] = useState<TagFilter>('all');
  const [query, setQuery] = useState('');

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
